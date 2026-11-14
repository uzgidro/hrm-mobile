// Session end: credentials are destroyed locally FIRST; the push unbind and the
// server revoke then run with the captured, in-memory tokens.
import { Platform } from 'react-native';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { storage } from '@/api/storage';
import { __resetAccessTokenCache } from '@/api/authToken';
import { useAuthStore } from '@/store/authStore';
import { useLockStore } from '@/store/lockStore';
import { PIN_RECORD_KEY, BIOMETRICS_KEY, FAILED_ATTEMPTS_KEY } from '../pin';
import { endServerSession } from '../sessionEnd';
import {
  PENDING_UNBIND_KEY,
  registerTokenWithBackend,
  readPendingUnbind,
} from '@/services/notifications';
import { apiClient } from '@/api/client';

const mockDismiss = jest.fn(async () => {});
const mockCancel = jest.fn(async () => {});
let mockHandler: any;

jest.mock('expo-notifications', () => ({
  setNotificationHandler: (h: any) => {
    mockHandler = h;
  },
  cancelAllScheduledNotificationsAsync: (...a: unknown[]) => mockCancel(...(a as [])),
  dismissAllNotificationsAsync: (...a: unknown[]) => mockDismiss(...(a as [])),
  setBadgeCountAsync: jest.fn(async () => true),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[dev]' })),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 0 },
}));
jest.mock('expo-device', () => ({ isDevice: true }));

let mock: MockAdapter;
let apiMock: MockAdapter;
const calls: string[] = [];

beforeEach(async () => {
  Platform.OS = 'android';
  mock = new MockAdapter(axios);
  apiMock = new MockAdapter(apiClient);
  calls.length = 0;
  __resetAccessTokenCache();
  await storage.deleteItem(PENDING_UNBIND_KEY);
  mockDismiss.mockClear();
  mockCancel.mockClear();
  apiMock.onPost('push-tokens').reply(201, { ok: true });
  await registerTokenWithBackend('ExponentPushToken[dev]');
});

afterEach(async () => {
  mock.restore();
  apiMock.restore();
  for (const k of ['access_token', 'refresh_token', 'cached_user', PIN_RECORD_KEY, BIOMETRICS_KEY, FAILED_ATTEMPTS_KEY]) {
    await storage.deleteItem(k);
  }
  __resetAccessTokenCache();
});

const del = () => mock.history.delete;

describe('endServerSession', () => {
  it('unbinds with the captured access token, then revokes', async () => {
    mock.onDelete(/push-tokens$/).reply(() => (calls.push('unbind'), [200, {}]));
    mock.onPost(/auth\/logout$/).reply(() => (calls.push('revoke'), [200, {}]));

    await endServerSession('acc-1', 'ref-1');

    expect(calls).toEqual(['unbind', 'revoke']);
    expect(del()[0].headers?.Authorization).toBe('Bearer acc-1');
    expect(JSON.parse(del()[0].data)).toEqual({ token: 'ExponentPushToken[dev]', platform: 'android' });
    expect(await readPendingUnbind()).toBeNull();
  });

  it('expired access token: ONE refresh, unbind again, revoke with the rotated refresh token', async () => {
    mock.onDelete(/push-tokens$/).reply((c) => {
      calls.push('unbind');
      return c.headers?.Authorization === 'Bearer acc-new' ? [200, {}] : [401, {}];
    });
    mock.onPost(/auth\/refresh$/).reply(() => (calls.push('refresh'), [200, { access_token: 'acc-new', refresh_token: 'ref-new' }]));
    let revokeBody: any;
    mock.onPost(/auth\/logout$/).reply((c) => {
      calls.push('revoke');
      revokeBody = JSON.parse(c.data);
      return [200, {}];
    });

    await endServerSession('acc-old', 'ref-old');

    expect(calls).toEqual(['unbind', 'refresh', 'unbind', 'revoke']);
    expect(revokeBody).toEqual({ refresh_token: 'ref-new' });
    // The refreshed tokens stay in memory: nothing is written back to storage.
    expect(await storage.getItem('access_token')).toBeNull();
    expect(await storage.getItem('refresh_token')).toBeNull();
  });

  it('offline: leaves a marker with ONLY the push token', async () => {
    mock.onDelete(/push-tokens$/).networkError();
    mock.onPost(/auth\/logout$/).networkError();

    await endServerSession('acc-1', 'ref-1');

    expect(await readPendingUnbind()).toBe('ExponentPushToken[dev]');
    expect(await readPendingUnbind()).not.toContain('acc-1');
  });

  it('a later successful bind clears the marker', async () => {
    await storage.setItem(PENDING_UNBIND_KEY, 'ExponentPushToken[dev]');
    await registerTokenWithBackend('ExponentPushToken[dev]');
    await new Promise((r) => setTimeout(r, 0));
    expect(await readPendingUnbind()).toBeNull();
  });

  it('skipPush (external doctor) only revokes', async () => {
    mock.onPost(/auth\/logout$/).reply(200, {});
    await endServerSession('acc-1', 'ref-1', { skipPush: true });
    expect(del()).toHaveLength(0);
    expect(mock.history.post).toHaveLength(1);
  });
});

describe('authStore.logout sequencing', () => {
  it('destroys local credentials before any network call, using captured tokens', async () => {
    await storage.setItem('access_token', 'acc-1');
    await storage.setItem('refresh_token', 'ref-1');
    await storage.setItem('cached_user', '{}');
    __resetAccessTokenCache();
    let tokensAtFirstCall: (string | null)[] | null = null;
    mock.onDelete(/push-tokens$/).reply(async (c) => {
      tokensAtFirstCall = [await storage.getItem('access_token'), await storage.getItem('refresh_token'), await storage.getItem('cached_user')];
      calls.push(String(c.headers?.Authorization));
      return [200, {}];
    });
    mock.onPost(/auth\/logout$/).reply(200, {});

    await useAuthStore.getState().logout();
    await new Promise((r) => setTimeout(r, 20));

    expect(calls).toEqual(['Bearer acc-1']);
    expect(tokensAtFirstCall).toEqual([null, null, null]);
    expect(mockDismiss).toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalled();
    // Signed out: the handler presents nothing.
    expect(await mockHandler.handleNotification()).toMatchObject({ shouldShowBanner: false, shouldShowAlert: false });
  });
});

describe('launch-time wipe', () => {
  it('attempts the unbind and revoke with the captured tokens', async () => {
    await storage.setItem('access_token', 'acc-9');
    await storage.setItem('refresh_token', 'ref-9');
    __resetAccessTokenCache();
    // Live tokens but no PIN record -> hydrate wipes the session.
    mock.onDelete(/push-tokens$/).reply(() => (calls.push('unbind'), [200, {}]));
    mock.onPost(/auth\/logout$/).reply(() => (calls.push('revoke'), [200, {}]));

    await useLockStore.getState().hydrate();
    await new Promise((r) => setTimeout(r, 30));

    expect(await storage.getItem('access_token')).toBeNull();
    expect(calls).toEqual(['unbind', 'revoke']);
    expect(del()[0].headers?.Authorization).toBe('Bearer acc-9');
  });
});
