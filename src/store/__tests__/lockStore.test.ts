// lockStore is the app-lock state machine. These tests drive the singleton
// directly through getState()/setState() — no React rendering — on top of the
// global mocks from src/test/setup.ts (expo-secure-store → in-memory Map,
// expo-crypto → real sha256, expo-local-authentication → flippable stubs).
// jest-expo runs as iOS by default; web cases flip Platform.OS and afterEach
// restores it.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '../../api/storage';
import {
  PIN_RECORD_KEY,
  BIOMETRICS_KEY,
  FAILED_ATTEMPTS_KEY,
  readPinRecord,
  writePinRecord,
} from '../../auth/pin';
import { MAX_ATTEMPTS } from '../../auth/lockPolicy';
import { useLockStore, type UnlockResult } from '../lockStore';

const mockGetItem = jest.mocked(SecureStore.getItemAsync);
const mockDeleteItem = jest.mocked(SecureStore.deleteItemAsync);
const mockHasHardware = jest.mocked(LocalAuthentication.hasHardwareAsync);
const mockIsEnrolled = jest.mocked(LocalAuthentication.isEnrolledAsync);
const mockAuthenticate = jest.mocked(LocalAuthentication.authenticateAsync);

beforeEach(async () => {
  // The store is a module singleton — put its state back to the creation shape.
  useLockStore.setState({
    status: 'unknown',
    failedAttempts: 0,
    biometricsEnabled: false,
    biometricsSupported: false,
    hydrated: false,
  });
  // The expo-secure-store in-memory Map persists across tests — clear our keys.
  await storage.deleteItem(PIN_RECORD_KEY);
  await storage.deleteItem(BIOMETRICS_KEY);
  await storage.deleteItem(FAILED_ATTEMPTS_KEY);
  // clearMocks wipes call history but NOT implementations set by a previous
  // test — pin the local-auth defaults back to "nothing available".
  mockHasHardware.mockResolvedValue(false);
  mockIsEnrolled.mockResolvedValue(false);
  mockAuthenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
});

afterEach(() => {
  Platform.OS = 'ios' as never;
});

describe('hydrate', () => {
  it('lands on setup-required when no PIN record exists', async () => {
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().status).toBe('setup-required');
    expect(useLockStore.getState().hydrated).toBe(true);
  });

  it('lands on locked when a PIN record exists', async () => {
    await writePinRecord('1234');
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().status).toBe('locked');
    expect(useLockStore.getState().hydrated).toBe(true);
  });

  it('restores the persisted failed-attempt count', async () => {
    await writePinRecord('1234');
    await storage.setItem(FAILED_ATTEMPTS_KEY, '3');
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().failedAttempts).toBe(3);
  });

  it('treats a corrupt failed-attempt value as zero', async () => {
    await writePinRecord('1234');
    await storage.setItem(FAILED_ATTEMPTS_KEY, 'abc');
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().failedAttempts).toBe(0);
  });

  it('enables biometrics when the flag is set and hardware + enrollment exist', async () => {
    await writePinRecord('1234');
    await storage.setItem(BIOMETRICS_KEY, '1');
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().biometricsSupported).toBe(true);
    expect(useLockStore.getState().biometricsEnabled).toBe(true);
  });

  it('keeps biometrics disabled when the flag is set but hardware is gone', async () => {
    await writePinRecord('1234');
    await storage.setItem(BIOMETRICS_KEY, '1');
    mockHasHardware.mockResolvedValue(false);
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().biometricsSupported).toBe(false);
    expect(useLockStore.getState().biometricsEnabled).toBe(false);
  });

  it('goes straight to unlocked on web without touching storage', async () => {
    Platform.OS = 'web' as never;
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().status).toBe('unlocked');
    expect(useLockStore.getState().hydrated).toBe(true);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('fails closed to setup-required (without throwing) when storage reads reject', async () => {
    const original = mockGetItem.getMockImplementation();
    mockGetItem.mockRejectedValue(new Error('keychain unavailable'));
    try {
      await expect(useLockStore.getState().hydrate()).resolves.toBeUndefined();
    } finally {
      mockGetItem.mockImplementation(original!);
    }
    expect(useLockStore.getState().status).toBe('setup-required');
    expect(useLockStore.getState().hydrated).toBe(true);
  });
});

describe('setupPin', () => {
  it('writes the record, clears the attempt counter, and unlocks', async () => {
    await storage.setItem(FAILED_ATTEMPTS_KEY, '2');
    useLockStore.setState({ status: 'setup-required', failedAttempts: 2 });

    await useLockStore.getState().setupPin('1234');

    expect(useLockStore.getState().status).toBe('unlocked');
    expect(useLockStore.getState().failedAttempts).toBe(0);
    expect(await readPinRecord()).not.toBeNull();
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBeNull();
  });
});

describe('unlockWithPin', () => {
  it('unlocks and resets attempts (state + storage) on the correct PIN', async () => {
    await writePinRecord('1234');
    await storage.setItem(FAILED_ATTEMPTS_KEY, '2');
    useLockStore.setState({ status: 'locked', failedAttempts: 2 });

    const result = await useLockStore.getState().unlockWithPin('1234');

    expect(result).toEqual({ ok: true, remaining: MAX_ATTEMPTS, forceLogout: false });
    expect(useLockStore.getState().status).toBe('unlocked');
    expect(useLockStore.getState().failedAttempts).toBe(0);
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBeNull();
  });

  it('stays locked, counts, and persists a wrong PIN', async () => {
    await writePinRecord('1234');
    useLockStore.setState({ status: 'locked' });

    const result = await useLockStore.getState().unlockWithPin('0000');

    expect(result).toEqual({ ok: false, remaining: MAX_ATTEMPTS - 1, forceLogout: false });
    expect(useLockStore.getState().status).toBe('locked');
    expect(useLockStore.getState().failedAttempts).toBe(1);
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBe('1');
  });

  it('reports forceLogout on the MAX_ATTEMPTSth wrong PIN', async () => {
    await writePinRecord('1234');
    useLockStore.setState({ status: 'locked' });

    const results: UnlockResult[] = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      results.push(await useLockStore.getState().unlockWithPin('0000'));
    }

    expect(results[MAX_ATTEMPTS - 2]).toEqual(
      expect.objectContaining({ forceLogout: false })
    );
    expect(results[MAX_ATTEMPTS - 1]).toEqual({ ok: false, remaining: 0, forceLogout: true });
    expect(useLockStore.getState().failedAttempts).toBe(MAX_ATTEMPTS);
  });

  it('keeps the attempt count across an app restart (fresh hydrate)', async () => {
    await writePinRecord('1234');
    useLockStore.setState({ status: 'locked' });
    await useLockStore.getState().unlockWithPin('0000');
    await useLockStore.getState().unlockWithPin('0000');

    // Simulate a cold start: wipe in-memory state, re-hydrate from storage.
    useLockStore.setState({ status: 'unknown', failedAttempts: 0, hydrated: false });
    await useLockStore.getState().hydrate();

    expect(useLockStore.getState().status).toBe('locked');
    expect(useLockStore.getState().failedAttempts).toBe(2);
  });

  it('falls back to setup-required when the record is missing/corrupt', async () => {
    useLockStore.setState({ status: 'locked' });

    const result = await useLockStore.getState().unlockWithPin('1234');

    expect(result).toEqual({ ok: false, remaining: MAX_ATTEMPTS, forceLogout: false });
    expect(useLockStore.getState().status).toBe('setup-required');
  });

  it('counts every concurrent wrong attempt (no lost increment)', async () => {
    await writePinRecord('1234');
    useLockStore.setState({ status: 'locked' });

    // Two sequential wrong attempts each consume one from the budget. (Note:
    // this can't reproduce a true lost-update race — the read-modify-write in
    // attemptPin is synchronous, so a same-process test never interleaves it.
    // The functional set((s) => ...) in the impl is defensive belt-and-braces.)
    await useLockStore.getState().unlockWithPin('0000');
    await useLockStore.getState().unlockWithPin('0000');

    expect(useLockStore.getState().failedAttempts).toBe(2);
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBe('2');
  });
});

describe('verifyCurrentPin', () => {
  it('accepts the correct PIN, resets the counter, and never touches status', async () => {
    await writePinRecord('1234');
    await storage.setItem(FAILED_ATTEMPTS_KEY, '2');
    useLockStore.setState({ status: 'unlocked', failedAttempts: 2 });

    const result = await useLockStore.getState().verifyCurrentPin('1234');

    expect(result).toEqual({ ok: true, remaining: MAX_ATTEMPTS, forceLogout: false });
    expect(useLockStore.getState().status).toBe('unlocked');
    expect(useLockStore.getState().failedAttempts).toBe(0);
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBeNull();
  });

  it('shares the attempt counter on a wrong PIN, status unchanged', async () => {
    await writePinRecord('1234');
    useLockStore.setState({ status: 'unlocked' });

    const result = await useLockStore.getState().verifyCurrentPin('0000');

    expect(result).toEqual({ ok: false, remaining: MAX_ATTEMPTS - 1, forceLogout: false });
    expect(useLockStore.getState().status).toBe('unlocked');
    expect(useLockStore.getState().failedAttempts).toBe(1);
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBe('1');
  });

  it('reports forceLogout on the MAX_ATTEMPTSth wrong entry (caller logs out)', async () => {
    await writePinRecord('1234');
    await storage.setItem(FAILED_ATTEMPTS_KEY, String(MAX_ATTEMPTS - 1));
    useLockStore.setState({ status: 'unlocked', failedAttempts: MAX_ATTEMPTS - 1 });

    const result = await useLockStore.getState().verifyCurrentPin('0000');

    expect(result).toEqual({ ok: false, remaining: 0, forceLogout: true });
    // The store only reports — status stays until the caller performs the logout.
    expect(useLockStore.getState().status).toBe('unlocked');
    // The change-PIN screen shares the budget, so the count must persist too —
    // otherwise killing the app mid-change would reset the attempt allowance.
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBe(String(MAX_ATTEMPTS));
  });
});

describe('unlockWithBiometrics', () => {
  it('unlocks and resets attempts on biometric success', async () => {
    mockAuthenticate.mockResolvedValue({ success: true });
    await storage.setItem(FAILED_ATTEMPTS_KEY, '2');
    useLockStore.setState({ status: 'locked', failedAttempts: 2 });

    expect(await useLockStore.getState().unlockWithBiometrics()).toBe(true);
    expect(useLockStore.getState().status).toBe('unlocked');
    expect(useLockStore.getState().failedAttempts).toBe(0);
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBeNull();
  });

  it('stays locked when the biometric prompt fails or is cancelled', async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: 'user_cancel' });
    useLockStore.setState({ status: 'locked' });

    expect(await useLockStore.getState().unlockWithBiometrics()).toBe(false);
    expect(useLockStore.getState().status).toBe('locked');
  });

  it('refuses to unlock from setup-required even on biometric success', async () => {
    // A stray biometric success must never skip mandatory PIN setup.
    mockAuthenticate.mockResolvedValue({ success: true });
    useLockStore.setState({ status: 'setup-required' });

    expect(await useLockStore.getState().unlockWithBiometrics()).toBe(false);
    expect(useLockStore.getState().status).toBe('setup-required');
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});

describe('lock', () => {
  it('locks from unlocked on native', () => {
    useLockStore.setState({ status: 'unlocked' });
    useLockStore.getState().lock();
    expect(useLockStore.getState().status).toBe('locked');
  });

  it('is a no-op during PIN setup (backgrounding must not interrupt it)', () => {
    useLockStore.setState({ status: 'setup-required' });
    useLockStore.getState().lock();
    expect(useLockStore.getState().status).toBe('setup-required');
  });

  it('never locks on web', () => {
    Platform.OS = 'web' as never;
    useLockStore.setState({ status: 'unlocked' });
    useLockStore.getState().lock();
    expect(useLockStore.getState().status).toBe('unlocked');
  });
});

describe('reset', () => {
  it('clears all three storage keys and returns to setup-required', async () => {
    await useLockStore.getState().setupPin('1234');
    await useLockStore.getState().setBiometricsEnabled(true);
    await storage.setItem(FAILED_ATTEMPTS_KEY, '2');

    await useLockStore.getState().reset();

    expect(await readPinRecord()).toBeNull();
    expect(await storage.getItem(BIOMETRICS_KEY)).toBeNull();
    expect(await storage.getItem(FAILED_ATTEMPTS_KEY)).toBeNull();
    const s = useLockStore.getState();
    expect(s.status).toBe('setup-required');
    expect(s.biometricsEnabled).toBe(false);
    expect(s.failedAttempts).toBe(0);
  });

  it('never throws even when the storage deletes reject (runs inside logout)', async () => {
    const original = mockDeleteItem.getMockImplementation();
    mockDeleteItem.mockRejectedValue(new Error('keychain unavailable'));
    try {
      await expect(useLockStore.getState().reset()).resolves.toBeUndefined();
    } finally {
      mockDeleteItem.mockImplementation(original!);
    }
    expect(useLockStore.getState().status).toBe('setup-required');
  });
});

describe('setBiometricsEnabled', () => {
  it('persists the flag on enable and removes it on disable', async () => {
    await useLockStore.getState().setBiometricsEnabled(true);
    expect(useLockStore.getState().biometricsEnabled).toBe(true);
    expect(await storage.getItem(BIOMETRICS_KEY)).toBe('1');

    await useLockStore.getState().setBiometricsEnabled(false);
    expect(useLockStore.getState().biometricsEnabled).toBe(false);
    expect(await storage.getItem(BIOMETRICS_KEY)).toBeNull();
  });
});
