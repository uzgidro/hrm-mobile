// App-lock state machine: 'unknown' → hydrate() → 'setup-required' | 'locked'
// → 'unlocked'. The PIN is mandatory, so a signed-in user without a record is
// sent to setup rather than let through. The lock is NATIVE-ONLY: on web
// hydrate()/reset() report 'unlocked' and lock() refuses, because storage
// there falls back to plain localStorage (see src/auth/pin.ts) and the lock
// overlay is never rendered on web.
//
// Failed attempts are persisted so killing and relaunching the app never
// grants a fresh budget — the MAX_ATTEMPTS force-logout survives cold starts.
// The counter is written to SecureStore BEFORE a guess is evaluated (killing
// the app mid-attempt cannot refund it) and is cleared only by a successful
// unlock / biometric / fresh login. A persisted count >= MAX_ATTEMPTS is
// terminal: attemptPin refuses to verify, and hydrate() finishes the logout
// locally (tokens + cached user + PIN) before any PIN-accepting screen shows.
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
import { MAX_ATTEMPTS, PIN_LENGTH, attemptsRemaining } from '../auth/lockPolicy';
import { isBiometricAvailable, authenticateBiometric } from '../auth/biometrics';
import { dismissAllConfirms } from '../lib/confirm';
import { getAccessToken, getRefreshToken, clearTokens } from '../api/authToken';
import { endServerSession, silenceNotificationsLocally } from '../auth/sessionEnd';

// Same key authStore uses for the cached user (it cannot be imported here: cycle).
const USER_CACHE_KEY = 'cached_user';

type LockStatus = 'unknown' | 'setup-required' | 'locked' | 'unlocked';

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
  /** Saqlangan PIN uzunligi — ochish ekrani shuncha nuqta ko'rsatadi. */
  currentPinLength: number;
  /** Eski (PIN_LENGTH dan qisqa) PIN bilan ochildi — yangisini o'rnatish majburiy. */
  pinUpgrade: boolean;
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

// Local-only session wipe used by hydrate() when the lock state is terminal.
// Tokens first, then the cached user; the server revoke runs in the background
// with the tokens captured beforehand. Never throws.
async function wipeLocalSession(): Promise<void> {
  let access: string | null = null;
  let refresh: string | null = null;
  try {
    access = await getAccessToken();
    refresh = await getRefreshToken();
  } catch {
    // Unreadable tokens: nothing to revoke, still wipe below.
  }
  await clearTokens().catch(() => {});
  await storage.deleteItem(USER_CACHE_KEY).catch(() => {});
  // Same end-of-session path as logout: silence local notifications now, then
  // unbind the push token and revoke in the background with the captured tokens.
  silenceNotificationsLocally();
  if (access || refresh) void endServerSession(access, refresh);
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
    // Spent budget is terminal: never verify another guess, the caller logs out.
    if (get().failedAttempts >= MAX_ATTEMPTS) {
      return { ok: false, remaining: 0, forceLogout: true };
    }
    const record = await readPinRecord();
    if (!record) {
      // Missing/corrupt record: the only way forward is a fresh setup.
      if (mode === 'unlock') set({ status: 'setup-required' });
      return { ok: false, remaining: MAX_ATTEMPTS, forceLogout: false };
    }
    // Record the attempt BEFORE evaluating it so a kill mid-check cannot refund
    // it. Functional increment so two concurrent attempts (e.g. a double submit
    // before the keypad disables) can't read the same count and lose one.
    set((s) => ({ failedAttempts: s.failedAttempts + 1 }));
    const failed = get().failedAttempts;
    await storage.setItem(FAILED_ATTEMPTS_KEY, String(failed)).catch(() => {});
    if (await verifyPin(pin, record)) {
      await clearAttempts();
      if (mode === 'unlock') {
        // Eski 4 raqamli PIN to'g'ri — lekin ilovaga emas, yangi PIN o'rnatishga o'tadi.
        if (record.len < PIN_LENGTH) set({ status: 'setup-required', pinUpgrade: true });
        else set({ status: 'unlocked' });
      }
      return { ok: true, remaining: MAX_ATTEMPTS, forceLogout: false };
    }
    return { ok: false, remaining: attemptsRemaining(failed), forceLogout: failed >= MAX_ATTEMPTS };
  };

  return {
    status: 'unknown',
    failedAttempts: 0,
    biometricsEnabled: false,
    biometricsSupported: false,
    hydrated: false,
    currentPinLength: PIN_LENGTH,
    pinUpgrade: false,

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
        const failed = parseAttempts(rawAttempts);
        // Terminal states: a spent attempt budget (the forced logout was
        // interrupted), or live tokens without a PIN record (first-run setup
        // must only follow a fresh login, never a restored session). Finish
        // the logout locally before anything that accepts a PIN is shown.
        if (failed >= MAX_ATTEMPTS || (!record && (await getAccessToken()))) {
          await wipeLocalSession();
          await Promise.all([
            clearPinRecord().catch(() => {}),
            storage.deleteItem(BIOMETRICS_KEY).catch(() => {}),
            deleteAttemptsKey(),
          ]);
          set({
            status: 'setup-required',
            failedAttempts: 0,
            biometricsEnabled: false,
            biometricsSupported: supported,
            currentPinLength: PIN_LENGTH,
            hydrated: true,
          });
          return;
        }
        set({
          status: record ? 'locked' : 'setup-required',
          currentPinLength: record?.len ?? PIN_LENGTH,
          failedAttempts: failed,
          biometricsSupported: supported,
          // The stored flag only counts while the hardware can still honor it.
          biometricsEnabled: flag === '1' && supported,
          hydrated: true,
        });
      } catch {
        // Fail closed: if the lock state cannot be read, do not offer PIN setup
        // over a possibly live session — wipe it and send the user to login.
        await wipeLocalSession();
        set({ status: 'setup-required', hydrated: true });
      }
    },

    setupPin: async (pin) => {
      await writePinRecord(pin);
      await clearAttempts();
      set({ status: 'unlocked', currentPinLength: pin.length, pinUpgrade: false });
    },

    unlockWithPin: (pin) => attemptPin(pin, 'unlock'),

    verifyCurrentPin: (pin) => attemptPin(pin, 'verify'),

    // Biometrics only ever move 'locked' → 'unlocked'. Guarding on status
    // (like lock()) makes it impossible to skip mandatory PIN setup via a
    // stray biometric success while status is 'setup-required'.
    unlockWithBiometrics: async () => {
      if (get().status !== 'locked') return false;
      // Biometrics must not bypass a spent attempt budget.
      if (get().failedAttempts >= MAX_ATTEMPTS) return false;
      if (!(await authenticateBiometric())) return false;
      await clearAttempts();
      // Biometrika eski PIN'ni yangilashni chetlab o'tmasin.
      const record = await readPinRecord();
      if (record && record.len < PIN_LENGTH) set({ status: 'setup-required', pinUpgrade: true });
      else set({ status: 'unlocked' });
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
        currentPinLength: PIN_LENGTH,
        pinUpgrade: false,
        status: Platform.OS === 'web' ? 'unlocked' : 'setup-required',
      });
    },
  };
});
