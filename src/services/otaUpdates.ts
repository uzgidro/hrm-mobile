// Thin wrapper over expo-updates (EAS Update / OTA). Two entry points:
//   • applyPendingUpdateOnLaunch() — the SYNCHRONOUS startup gate: behind the
//     splash, check → fetch → reloadAsync() into the new JS bundle, bounded by
//     a 10s timeout so a slow network never hangs launch. Called at the very
//     top of useAuthBootstrap, before hideSplash().
//   • getRunningOtaInfo() — read the running build for the version display.
//
// OTA is native-only and disabled in dev builds; the gate self-guards
// (shouldRunOtaGate) and every path swallows errors — startup must never crash
// or block on this.
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { shouldRunOtaGate, withTimeout, OTA_GATE_TIMEOUT_MS } from '@/utils/otaGate';
import { formatOtaBuild, type OtaBuildDisplay } from '@/utils/otaVersion';

// Read the running build for the "under the version" display. Pure read of
// expo-updates constants → the tested formatter.
export function getRunningOtaInfo(): OtaBuildDisplay {
  return formatOtaBuild({
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId ?? null,
    createdAt: Updates.createdAt ?? null,
  });
}

// Latch: flips true the moment the 10s launch-gate elapses. A fetch that only
// finishes AFTER the gate elapsed must not reloadAsync() — that would reboot the
// app mid-session (e.g. on the login screen). The pending update then lands at
// the next cold start instead (normal expo-updates fallback).
let gateElapsed = false;

// Test-only reset (mirrors the __resetAppUpdates pattern in appUpdates.ts).
export function __resetOtaGate(): void {
  gateElapsed = false;
}

// The actual check→fetch→reload, unbounded. Wrapped by withTimeout below. The
// reload is guarded by the gate latch: if the launch gate already elapsed while
// this was still fetching, we skip the reboot and let the update apply next
// cold start.
async function checkFetchReload(): Promise<void> {
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return;
  const fetched = await Updates.fetchUpdateAsync();
  if (!fetched.isNew) return;
  if (gateElapsed) return; // launch already proceeded — don't reboot mid-session
  // Reboots into the new bundle — this promise typically never resolves.
  await Updates.reloadAsync();
}

// Synchronous startup gate. No-op (fast) unless OTA can actually apply. The
// whole check+fetch is bounded by OTA_GATE_TIMEOUT_MS: on timeout we set the
// gate latch (so a late fetch won't reboot mid-session) and launch on the
// current bundle. Never throws.
export async function applyPendingUpdateOnLaunch(): Promise<void> {
  try {
    if (
      !shouldRunOtaGate({
        isEnabled: Updates.isEnabled,
        platformOS: Platform.OS,
        isDev: __DEV__,
      })
    ) {
      return;
    }
    gateElapsed = false;
    const timer = setTimeout(() => {
      gateElapsed = true;
    }, OTA_GATE_TIMEOUT_MS);
    try {
      await withTimeout(checkFetchReload(), OTA_GATE_TIMEOUT_MS, undefined);
    } finally {
      clearTimeout(timer);
      // If withTimeout returned because the timer won, the setTimeout above has
      // already latched gateElapsed. Setting it here too is harmless and covers
      // the exact-boundary race.
      gateElapsed = true;
    }
  } catch {
    // Startup path — swallow everything; launch continues on the current bundle.
  }
}
