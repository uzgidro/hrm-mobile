// Push registration plumbing: the Android channel, backend (un)registration and
// the diagnostics that replaced the old silent `catch {}` blocks.
//
// Why these exist: the production Android build shipped for a month without a
// Firebase config, so getExpoPushTokenAsync() threw, every catch swallowed it,
// and the backend's push_tokens table stayed empty — with nothing anywhere to
// say so. These tests pin the observable behaviour of that path.
import { Platform } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import {
  ANDROID_CHANNEL_ID,
  ensureAndroidChannel,
  getLastPushError,
  registerTokenWithBackend,
  unregisterTokenWithBackend,
} from '../notifications';

// `mock`-prefixed so jest's out-of-scope guard allows the factory to reference it.
// The factory runs while this `const` is still in its TDZ (notifications.ts
// requires the native module at import time), so it must be read LAZILY —
// `setNotificationChannelAsync: mockSetChannel` would capture `undefined`.
const mockSetChannel = jest.fn(async () => {});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetChannel(...(args as [])),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[unit]' })),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

describe('ensureAndroidChannel', () => {
  afterEach(() => {
    mockSetChannel.mockClear();
  });

  it('creates the "default" channel at MAX importance on Android', async () => {
    Platform.OS = 'android';

    await ensureAndroidChannel();

    expect(mockSetChannel).toHaveBeenCalledTimes(1);
    const [id, config] = mockSetChannel.mock.calls[0] as unknown as [string, any];
    // The id is a contract with the backend: worker/tasks.send_expo_push stamps
    // `channelId: 'default'` on every message. A rename here silently drops the
    // notification into an implicit low-importance channel — tray only.
    expect(id).toBe('default');
    expect(ANDROID_CHANNEL_ID).toBe('default');
    expect(config.importance).toBe(5);
    expect(config.sound).toBe('default');
    expect(typeof config.name).toBe('string');
    expect(config.name.length).toBeGreaterThan(0);
  });

  it('is a no-op off Android (channels are an Android-only concept)', async () => {
    Platform.OS = 'ios';

    await ensureAndroidChannel();

    expect(mockSetChannel).not.toHaveBeenCalled();
  });
});

describe('backend registration', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    Platform.OS = 'android';
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('POSTs the token and reports success', async () => {
    mock.onPost('push-tokens').reply(201, { ok: true });

    await expect(registerTokenWithBackend('ExponentPushToken[a]')).resolves.toBe(true);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      token: 'ExponentPushToken[a]',
      platform: 'android',
    });
    expect(getLastPushError()).toBeNull();
  });

  it('reports failure and records a diagnostic when the backend rejects', async () => {
    // The backend answers 403 for an account with no employee record. It used to
    // answer `201 {"ok": false}`, which the client read as success.
    mock.onPost('push-tokens').reply(403, { code: 'user_is_not_employee' });

    await expect(registerTokenWithBackend('ExponentPushToken[b]')).resolves.toBe(false);
    expect(getLastPushError()).toContain('register');
  });

  it('DELETEs the previously registered token on logout', async () => {
    mock.onPost('push-tokens').reply(201, { ok: true });
    mock.onDelete('push-tokens').reply(200, { ok: true });

    await registerTokenWithBackend('ExponentPushToken[c]');
    await unregisterTokenWithBackend();

    expect(mock.history.delete).toHaveLength(1);
    expect(JSON.parse(mock.history.delete[0].data)).toEqual({
      token: 'ExponentPushToken[c]',
      platform: 'android',
    });
  });

  it('never throws when the unregister call fails', async () => {
    mock.onPost('push-tokens').reply(201, { ok: true });
    mock.onDelete('push-tokens').networkError();

    await registerTokenWithBackend('ExponentPushToken[d]');
    await expect(unregisterTokenWithBackend()).resolves.toBeUndefined();
  });
});
