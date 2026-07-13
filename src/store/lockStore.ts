// App-lock state machine: 'unknown' → hydrate() → 'setup-required' | 'locked'
// → 'unlocked'. The PIN is mandatory, so a signed-in user without a record is
// sent to setup rather than let through. The lock is NATIVE-ONLY: on web
// hydrate()/reset() report 'unlocked' and lock() refuses, because storage
// there falls back to plain localStorage (see src/auth/pin.ts) and the lock
// overlay is never rendered on web.
//
// Failed attempts are persisted so killing and relaunching the app never
// grants a fresh budget — the MAX_ATTEMPTS force-logout survives cold starts.
// On the final failure unlockWithPin/verifyCurrentPin only REPORT
// forceLogout: true; the CALLER performs the logout. This store must not
// import authStore: authStore.logout calls reset() here, so importing it back
// would create a cycle.
import { Platform } from 'react-native';
import { create } from 'zustand';
import { storage } from '../api/storage';
import {
  BIOMETRICS_KEY,
  FAILED_ATTEMPTS_KEY,
  readPinRecord,
  writePinRecord,
  clearPinRecord,
  verifyPin,
} from '../auth/pin';
import { MAX_ATTEMPTS, attemptsRemaining } from '../auth/lockPolicy';
import { isBiometricAvailable, authenticateBiometric } from '../auth/biometrics';
import { dismissAllConfirms } from '../lib/confirm';

export type LockStatus = 'unknown' | 'setup-required' | 'locked' | 'unlocked';

export interface UnlockResult {
  ok: boolean;
  remaining: number;
  forceLogout: boolean;
}

interface LockState {
  status: LockStatus;
  failedAttempts: number;
  biometricsEnabled: boolean;
  biometricsSupported: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<UnlockResult>;
  verifyCurrentPin: (pin: string) => Promise<UnlockResult>;
  unlockWithBiometrics: () => Promise<boolean>;
  lock: () => void;
  setBiometricsEnabled: (v: boolean) => Promise<void>;
  reset: () => Promise<void>;
}

// Best-effort delete of the persisted counter — a failed delete only means a
// stale count reappears on the next launch, so it never blocks the happy path.
function deleteAttemptsKey(): Promise<void> {
  return storage.deleteItem(FAILED_ATTEMPTS_KEY).catch(() => {});
}

// Corrupt storage must not poison the UI with NaN — non-finite parses count
// as "no failures" (mirrors attemptsRemaining's own clamp in lockPolicy).
function parseAttempts(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

export const useLockStore = create<LockState>((set, get) => {
  // Zero the counter in state and storage — shared by fresh setup and every
  // successful PIN / biometric verification.
  const clearAttempts = async (): Promise<void> => {
    set({ failedAttempts: 0 });
    await deleteAttemptsKey();
  };

  // Shared core of unlockWithPin / verifyCurrentPin: one record check, ONE
  // attempt counter. The only difference is the mode — 'unlock' moves status,
  // 'verify' (change-PIN screen, app already unlocked) never touches it.
  const attemptPin = async (pin: string, mode: 'unlock' | 'verify'): Promise<UnlockResult> => {
    const record = await readPinRecord();
    if (!record) {
      // Missing/corrupt record: the only way forward is a fresh setup.
      if (mode === 'unlock') set({ status: 'setup-required' });
      return { ok: false, remaining: MAX_ATTEMPTS, forceLogout: false };
    }
    if (await verifyPin(pin, record)) {
      await clearAttempts();
      if (mode === 'unlock') set({ status: 'unlocked' });
      return { ok: true, remaining: MAX_ATTEMPTS, forceLogout: false };
    }
    // Functional increment so two concurrent wrong attempts (e.g. a double
    // submit before the keypad disables) can't read the same count and lose an
    // increment — that would quietly widen the brute-force budget.
    set((s) => ({ failedAttempts: s.failedAttempts + 1 }));
    const failed = get().failedAttempts;
    storage.setItem(FAILED_ATTEMPTS_KEY, String(failed)).catch(() => {});
    return { ok: false, remaining: attemptsRemaining(failed), forceLogout: failed >= MAX_ATTEMPTS };
  };

  return {
    status: 'unknown',
    failedAttempts: 0,
    biometricsEnabled: false,
    biometricsSupported: false,
    hydrated: false,

    // Awaited by the auth bootstrap before the splash hides — must never throw.
    hydrate: async () => {
      if (Platform.OS === 'web') {
        set({ status: 'unlocked', hydrated: true });
        return;
      }
      try {
        const [record, flag, rawAttempts, supported] = await Promise.all([
          readPinRecord(),
          storage.getItem(BIOMETRICS_KEY),
          storage.getItem(FAILED_ATTEMPTS_KEY),
          isBiometricAvailable(),
        ]);
        set({
          status: record ? 'locked' : 'setup-required',
          failedAttempts: parseAttempts(rawAttempts),
          biometricsSupported: supported,
          // The stored flag only counts while the hardware can still honor it.
          biometricsEnabled: flag === '1' && supported,
          hydrated: true,
        });
      } catch {
        // Fail closed: the auth token still gates all content — worst case the
        // user sets a fresh PIN.
        set({ status: 'setup-required', hydrated: true });
      }
    },

    setupPin: async (pin) => {
      await writePinRecord(pin);
      await clearAttempts();
      set({ status: 'unlocked' });
    },

    unlockWithPin: (pin) => attemptPin(pin, 'unlock'),

    verifyCurrentPin: (pin) => attemptPin(pin, 'verify'),

    // Biometrics only ever move 'locked' → 'unlocked'. Guarding on status
    // (like lock()) makes it impossible to skip mandatory PIN setup via a
    // stray biometric success while status is 'setup-required'.
    unlockWithBiometrics: async () => {
      if (get().status !== 'locked') return false;
      if (!(await authenticateBiometric())) return false;
      await clearAttempts();
      set({ status: 'unlocked' });
      return true;
    },

    // Self-guarding so callers (the AppState listener) need no conditions:
    // never on web, and only from 'unlocked' — during PIN setup the status is
    // 'setup-required', so backgrounding deliberately can't interrupt setup.
    // Attempts are NOT reset by locking.
    lock: () => {
      if (Platform.OS === 'web') return;
      if (get().status !== 'unlocked') return;
      // A ConfirmSheet is a native Modal that renders in its own window ABOVE
      // the LockOverlay (a plain View) — so an open confirm would float over the
      // PIN gate and stay tappable. Dismiss any pending confirm (resolving it to
      // false/cancelled) before locking so a destructive action can't be
      // confirmed over the lock.
      dismissAllConfirms();
      set({ status: 'locked' });
    },

    setBiometricsEnabled: async (v) => {
      set({ biometricsEnabled: v });
      if (v) await storage.setItem(BIOMETRICS_KEY, '1');
      else await storage.deleteItem(BIOMETRICS_KEY);
    },

    // Wipes the whole lock footprint. Runs inside authStore.logout — must
    // never throw, so every delete is best-effort.
    reset: async () => {
      await Promise.all([
        clearPinRecord().catch(() => {}),
        storage.deleteItem(BIOMETRICS_KEY).catch(() => {}),
        deleteAttemptsKey(),
      ]);
      set({
        failedAttempts: 0,
        biometricsEnabled: false,
        status: Platform.OS === 'web' ? 'unlocked' : 'setup-required',
      });
    },
  };
});
