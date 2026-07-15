import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '../api/storage';
import { confirm } from '@/lib/confirm';
import i18n from '@/i18n';

// Google Play in-app update check, run once at app launch. expo-in-app-updates
// is loaded lazily and defensively: the native module only exists in a
// development/production build (never in Expo Go or on web), and a missing
// module must not crash startup — so it is require()d on demand and an
// unavailable module is treated as "no update check".
//
// Guards (all silent no-ops): Android only (this is the Google Play In-App
// Updates API), real devices only, and never in Expo Go (`storeClient`).
// Limitation: Play only reports updates for apps *installed from Google Play* —
// sideloaded / internal-track APKs (e.g. EAS `preview` builds) see no updates.
//
// startUpdate(false) starts a *flexible* update (background download, the user
// keeps using the app); `startUpdate(true)` would be an immediate full-screen
// update. We use flexible so launch is never blocked.
type InAppUpdatesModule = typeof import('expo-in-app-updates');
let cachedModule: InAppUpdatesModule | null | undefined;

function getInAppUpdates(): InAppUpdatesModule | null {
  if (cachedModule === undefined) {
    try {
      cachedModule = require('expo-in-app-updates') as InAppUpdatesModule;
    } catch {
      cachedModule = null;
    }
  }
  return cachedModule;
}

// Don't nag: at most one prompt per 24 hours, tracked via a persisted timestamp.
export const UPDATE_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const UPDATE_PROMPT_TS_KEY = 'app_update_prompt_ts';

// Once per app session: two concurrent callers (e.g. an effect remount during
// dev fast-refresh) would both read the old timestamp and double-prompt.
let ranThisSession = false;

// Test-only (mirrors toast.ts's __resetToasts pattern).
export function __resetAppUpdates(): void {
  ranThisSession = false;
  cachedModule = undefined;
}

// Pure decision core (unit-tested): prompt iff an update exists and the user
// hasn't been prompted within the cooldown window.
export function shouldPromptForUpdate(input: {
  updateAvailable: boolean;
  lastPromptAt: number | null;
  now: number;
}): boolean {
  if (!input.updateAvailable) return false;
  return (
    input.lastPromptAt == null || input.now - input.lastPromptAt >= UPDATE_PROMPT_COOLDOWN_MS
  );
}

async function startUpdateSafely(): Promise<void> {
  try {
    await getInAppUpdates()?.startUpdate(false);
  } catch {
    // A failed/cancelled update flow is not an error worth surfacing.
  }
}

// Runs at app startup — must never throw or block launch.
export async function checkAppUpdateOnLaunch(): Promise<void> {
  try {
    if (ranThisSession) return;
    ranThisSession = true;
    if (Platform.OS !== 'android') return;
    if (!Device.isDevice) return;
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
    const updates = getInAppUpdates();
    if (!updates) return;

    let updateAvailable: boolean;
    try {
      const result = await updates.checkForUpdate();
      // Play can report an update that cannot actually be started (flexible
      // flow disallowed) or one already downloading — prompting then would
      // burn the 24h cooldown on a dead button.
      if (result.updateInProgress || result.flexibleAllowed === false) return;
      updateAvailable = result.updateAvailable;
    } catch {
      return;
    }

    const raw = await storage.getItem(UPDATE_PROMPT_TS_KEY);
    const parsed = raw == null ? Number.NaN : Number.parseInt(raw, 10);
    const lastPromptAt = Number.isNaN(parsed) ? null : parsed;

    const now = Date.now();
    if (!shouldPromptForUpdate({ updateAvailable, lastPromptAt, now })) return;

    // Persist first so a crash/kill between prompt and press still counts as
    // "prompted" for the cooldown.
    await storage.setItem(UPDATE_PROMPT_TS_KEY, String(now));
    // In-app confirm sheet (not an OS Alert); confirm() is imperative so it works
    // from this non-React service. Install is a positive action → not destructive.
    if (
      await confirm({
        title: i18n.t('update.available'),
        message: i18n.t('update.message'),
        confirmLabel: i18n.t('update.install'),
        cancelLabel: i18n.t('update.later'),
        icon: 'arrowDown',
      })
    ) {
      void startUpdateSafely();
    }
  } catch {
    // Startup path — swallow everything.
  }
}
