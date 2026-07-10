// Tests for the on-launch Google Play in-app update check.
// The pure cooldown decision (shouldPromptForUpdate) is unit-tested directly;
// checkAppUpdateOnLaunch is driven end-to-end with the native module, device,
// execution environment and Alert mocked out.

import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { checkForUpdate, startUpdate } from 'expo-in-app-updates';
import { storage } from '../../api/storage';
import {
  UPDATE_PROMPT_COOLDOWN_MS,
  __resetAppUpdates,
  checkAppUpdateOnLaunch,
  shouldPromptForUpdate,
} from '../appUpdates';

// The native module doesn't exist in the jest environment — replace it with
// configurable fns. Implementations are (re-)set in beforeEach/tests so each
// test states its own scenario (clearMocks only clears calls, not impls).
jest.mock('expo-in-app-updates', () => ({
  checkForUpdate: jest.fn(),
  startUpdate: jest.fn(),
}));

// Pass the "real device" and "not Expo Go" launch guards.
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const mockCheckForUpdate = jest.mocked(checkForUpdate);
const mockStartUpdate = jest.mocked(startUpdate);

// Storage key used by appUpdates.ts (module-private there by design).
const UPDATE_PROMPT_TS_KEY = 'app_update_prompt_ts';

const HOUR_MS = 60 * 60 * 1000;

describe('shouldPromptForUpdate', () => {
  const now = 1_750_000_000_000;

  it('returns false when no update is available', () => {
    expect(shouldPromptForUpdate({ updateAvailable: false, lastPromptAt: null, now })).toBe(false);
  });

  it('returns true when an update is available and the user was never prompted', () => {
    expect(shouldPromptForUpdate({ updateAvailable: true, lastPromptAt: null, now })).toBe(true);
  });

  it('returns false when the last prompt was 1 hour ago', () => {
    expect(shouldPromptForUpdate({ updateAvailable: true, lastPromptAt: now - HOUR_MS, now })).toBe(
      false
    );
  });

  it('returns true when the last prompt was 25 hours ago', () => {
    expect(
      shouldPromptForUpdate({ updateAvailable: true, lastPromptAt: now - 25 * HOUR_MS, now })
    ).toBe(true);
  });

  it('returns true at exactly the 24h cooldown boundary (>= semantics)', () => {
    expect(
      shouldPromptForUpdate({
        updateAvailable: true,
        lastPromptAt: now - UPDATE_PROMPT_COOLDOWN_MS,
        now,
      })
    ).toBe(true);
  });

  it('returns false one minute before the cooldown expires (23h59m)', () => {
    expect(
      shouldPromptForUpdate({
        updateAvailable: true,
        lastPromptAt: now - (UPDATE_PROMPT_COOLDOWN_MS - 60_000),
        now,
      })
    ).toBe(false);
  });
});

describe('checkAppUpdateOnLaunch', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(async () => {
    // jest-expo runs as iOS by default, but the update check is Android-only.
    // Platform.OS is a plain writable data property on the Platform object
    // (not a getter), so direct assignment works; the `as never` silences the
    // literal-type mismatch across RN's per-platform Platform interfaces.
    Platform.OS = 'android' as never;
    // The check runs once per app session — reset the module guard per test.
    __resetAppUpdates();
    // The expo-secure-store in-memory Map persists across tests in this file.
    await storage.deleteItem(UPDATE_PROMPT_TS_KEY);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCheckForUpdate.mockResolvedValue({ updateAvailable: true, storeVersion: '99' });
    mockStartUpdate.mockResolvedValue(true);
  });

  afterAll(() => {
    Platform.OS = 'ios' as never;
  });

  it('shows the Uzbek update prompt and persists the timestamp when an update is available', async () => {
    const before = Date.now();
    await checkAppUpdateOnLaunch();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Yangilanish mavjud',
      "Ilovaning yangi versiyasi chiqdi. Yangilanishni hozir o'rnatishni tavsiya qilamiz.",
      expect.arrayContaining([
        expect.objectContaining({ text: 'Keyinroq', style: 'cancel' }),
        expect.objectContaining({ text: 'Yangilash' }),
      ])
    );

    const raw = await storage.getItem(UPDATE_PROMPT_TS_KEY);
    expect(raw).not.toBeNull();
    const ts = Number.parseInt(raw as string, 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());

    // The timestamp is deliberately persisted BEFORE the Alert, so a crash
    // between the two still counts as "prompted" for the cooldown.
    const setItemOrder = jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder.at(-1)!;
    const alertOrder = alertSpy.mock.invocationCallOrder[0];
    expect(setItemOrder).toBeLessThan(alertOrder);
  });

  it('runs at most once per app session', async () => {
    await checkAppUpdateOnLaunch();
    await checkAppUpdateOnLaunch();

    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  it('does not prompt when the update cannot be started (flexible disallowed or in progress)', async () => {
    mockCheckForUpdate.mockResolvedValue({
      updateAvailable: true,
      storeVersion: '99',
      flexibleAllowed: false,
    });
    await checkAppUpdateOnLaunch();

    __resetAppUpdates();
    mockCheckForUpdate.mockResolvedValue({
      updateAvailable: true,
      storeVersion: '99',
      updateInProgress: true,
    });
    await checkAppUpdateOnLaunch();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(await storage.getItem(UPDATE_PROMPT_TS_KEY)).toBeNull();
  });

  it('does not prompt again within the cooldown window', async () => {
    await storage.setItem(UPDATE_PROMPT_TS_KEY, String(Date.now() - HOUR_MS));

    await checkAppUpdateOnLaunch();

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does nothing when no update is available', async () => {
    mockCheckForUpdate.mockResolvedValue({ updateAvailable: false, storeVersion: '1' });

    await checkAppUpdateOnLaunch();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(await storage.getItem(UPDATE_PROMPT_TS_KEY)).toBeNull();
  });

  it('never touches the store API off Android', async () => {
    Platform.OS = 'ios' as never;

    await checkAppUpdateOnLaunch();

    expect(mockCheckForUpdate).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("starts a flexible update when 'Yangilash' is pressed", async () => {
    await checkAppUpdateOnLaunch();

    type AlertButton = { text?: string; onPress?: () => void };
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    const updateButton = buttons.find((b) => b.text === 'Yangilash');
    expect(updateButton?.onPress).toBeDefined();

    updateButton?.onPress?.();
    // startUpdateSafely awaits the module call; give the microtask queue a turn.
    await Promise.resolve();

    // false = flexible update (background download), not immediate.
    expect(mockStartUpdate).toHaveBeenCalledWith(false);
  });

  it('swallows checkForUpdate failures without crashing or prompting', async () => {
    mockCheckForUpdate.mockRejectedValue(new Error('Play Services unavailable'));

    await expect(checkAppUpdateOnLaunch()).resolves.toBeUndefined();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
