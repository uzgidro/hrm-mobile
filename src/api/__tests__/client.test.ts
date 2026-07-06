import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { storage } from '../storage';
import { __resetAccessTokenCache } from '../authToken';

// The app's requests go through `apiClient`; the refresh call in client.ts uses
// the default `axios` instance — mock both adapters.
let appMock: MockAdapter;
let refreshMock: MockAdapter;

beforeEach(async () => {
  appMock = new MockAdapter(apiClient);
  refreshMock = new MockAdapter(axios);
  await storage.setItem('access_token', 'old-access');
  await storage.setItem('refresh_token', 'refresh-1');
  // Reset the in-memory token cache so each test re-reads the seeded storage.
  __resetAccessTokenCache();
});

afterEach(async () => {
  appMock.restore();
  refreshMock.restore();
  await storage.deleteItem('access_token');
  await storage.deleteItem('refresh_token');
});

describe('apiClient interceptors', () => {
  it('attaches the bearer token from storage on each request', async () => {
    let seen: string | undefined;
    appMock.onGet('ping').reply((config) => {
      seen = config.headers?.Authorization as string | undefined;
      return [200, { ok: true }];
    });

    await apiClient.get('ping');
    expect(seen).toBe('Bearer old-access');
  });

  it('reads the access token from SecureStore once across many requests', async () => {
    const SecureStore = require('expo-secure-store');
    const getMock = SecureStore.getItemAsync as jest.Mock;
    appMock.onGet('a').reply(200, {});
    appMock.onGet('b').reply(200, {});
    appMock.onGet('c').reply(200, {});

    getMock.mockClear();
    await Promise.all([apiClient.get('a'), apiClient.get('b'), apiClient.get('c')]);

    const accessReads = getMock.mock.calls.filter((c: unknown[]) => c[0] === 'access_token').length;
    expect(accessReads).toBe(1);
  });

  it('refreshes once on 401 and retries with the new token (single-flight)', async () => {
    let refreshCalls = 0;
    let protectedHits = 0;

    refreshMock.onPost(/\/auth\/refresh/).reply(() => {
      refreshCalls += 1;
      return [200, { access_token: 'new-access', refresh_token: 'refresh-2' }];
    });

    appMock.onGet('protected').reply((config) => {
      protectedHits += 1;
      const auth = config.headers?.Authorization;
      if (auth === 'Bearer old-access') return [401];
      return [200, { ok: true }];
    });

    // Three concurrent requests that all 401 at once.
    const results = await Promise.all([
      apiClient.get('protected'),
      apiClient.get('protected'),
      apiClient.get('protected'),
    ]);

    expect(results.every((r) => r.data.ok)).toBe(true);
    // Single-flight: one refresh despite three concurrent 401s.
    expect(refreshCalls).toBe(1);
    expect(await storage.getItem('access_token')).toBe('new-access');
    expect(await storage.getItem('refresh_token')).toBe('refresh-2');
    expect(protectedHits).toBeGreaterThanOrEqual(4); // 3 initial 401s + retries
  });

  it('clears tokens when refresh fails', async () => {
    refreshMock.onPost(/\/auth\/refresh/).reply(401);
    appMock.onGet('protected').reply(401);

    await expect(apiClient.get('protected')).rejects.toBeDefined();
    expect(await storage.getItem('access_token')).toBeNull();
    expect(await storage.getItem('refresh_token')).toBeNull();
  });
});
