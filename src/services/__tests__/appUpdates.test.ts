// Tests for the on-launch Google Play in-app update check.
// The pure cooldown decision (shouldPromptForUpdate) is unit-tested directly;
// checkAppUpdateOnLaunch is driven end-to-end with the native module, device,
// execution environment and the confirm() store mocked out.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { checkForUpdate, startUpdate } from 'expo-in-app-updates';
import { storage } from '../../api/storage';
import { confirm } from '../../lib/confirm';
import {
  UPDATE_PROMPT_COOLDOWN_MS,
  __resetAppUpdates,
  checkAppUpdateOnLaunch,
  shouldPromptForUpdate,
} from '../appUpdates';

// The update prompt now goes through the global confirm() store instead of an
// OS Alert; mock it so we can assert the request and drive the user's answer.
jest.mock('../../lib/confirm', () => ({ confirm: jest.fn() }));

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
  const confirmMock = jest.mocked(confirm);

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
    confirmMock.mockReset();
    // Default: user dismisses the prompt (returns false) unless a test overrides.
    confirmMock.mockResolvedValue(false);
    mockCheckForUpdate.mockResolvedValue({ updateAvailable: true, storeVersion: '99' });
    mockStartUpdate.mockResolvedValue(true);
  });

  afterAll(() => {
    Platform.OS = 'ios' as never;
  });

  it('shows the Uzbek update prompt and persists the timestamp when an update is available', async () => {
    const before = Date.now();
    await checkAppUpdateOnLaunch();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Yangilanish mavjud',
        message: "Ilovaning yangi versiyasi chiqdi. Yangilanishni hozir o'rnatishni tavsiya qilamiz.",
        confirmLabel: 'Yangilash',
        cancelLabel: 'Keyinroq',
      })
    );

    const raw = await storage.getItem(UPDATE_PROMPT_TS_KEY);
    expect(raw).not.toBeNull();
    const ts = Number.parseInt(raw as string, 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());

    // The timestamp is deliberately persisted BEFORE the prompt, so a crash
    // between the two still counts as "prompted" for the cooldown.
    const setItemOrder = jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder.at(-1)!;
    const confirmOrder = confirmMock.mock.invocationCallOrder[0];
    expect(setItemOrder).toBeLessThan(confirmOrder);
  });

  it('runs at most once per app session', async () => {
    await checkAppUpdateOnLaunch();
    await checkAppUpdateOnLaunch();

    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledTimes(1);
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

    expect(confirmMock).not.toHaveBeenCalled();
    expect(await storage.getItem(UPDATE_PROMPT_TS_KEY)).toBeNull();
  });

  it('does not prompt again within the cooldown window', async () => {
    await storage.setItem(UPDATE_PROMPT_TS_KEY, String(Date.now() - HOUR_MS));

    await checkAppUpdateOnLaunch();

    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('does nothing when no update is available', async () => {
    mockCheckForUpdate.mockResolvedValue({ updateAvailable: false, storeVersion: '1' });

    await checkAppUpdateOnLaunch();

    expect(confirmMock).not.toHaveBeenCalled();
    expect(await storage.getItem(UPDATE_PROMPT_TS_KEY)).toBeNull();
  });

  it('never touches the store API off Android', async () => {
    Platform.OS = 'ios' as never;

    await checkAppUpdateOnLaunch();

    expect(mockCheckForUpdate).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('starts a flexible update when the user confirms', async () => {
    // User taps "Yangilash" → confirm() resolves true.
    confirmMock.mockResolvedValue(true);

    await checkAppUpdateOnLaunch();
    // startUpdateSafely awaits the module call; give the microtask queue a turn.
    await Promise.resolve();

    // false = flexible update (background download), not immediate.
    expect(mockStartUpdate).toHaveBeenCalledWith(false);
  });

  it('does not start an update when the user dismisses the prompt', async () => {
    confirmMock.mockResolvedValue(false);

    await checkAppUpdateOnLaunch();
    await Promise.resolve();

    expect(mockStartUpdate).not.toHaveBeenCalled();
  });

  it('swallows checkForUpdate failures without crashing or prompting', async () => {
    mockCheckForUpdate.mockRejectedValue(new Error('Play Services unavailable'));

    await expect(checkAppUpdateOnLaunch()).resolves.toBeUndefined();
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
