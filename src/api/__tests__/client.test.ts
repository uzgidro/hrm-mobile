import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { storage } from '../storage';

// The app's requests go through `apiClient`; the refresh call in client.ts uses
// the default `axios` instance — mock both adapters.
let appMock: MockAdapter;
let refreshMock: MockAdapter;

beforeEach(async () => {
  appMock = new MockAdapter(apiClient);
  refreshMock = new MockAdapter(axios);
  await storage.setItem('access_token', 'old-access');
  await storage.setItem('refresh_token', 'refresh-1');
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
