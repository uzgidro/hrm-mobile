import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { storage } from '@/api/storage';
import { __resetAccessTokenCache } from '@/api/authToken';
import { revokeServerSession } from '../session';

// Logout must also end the SERVER session (web v2: useAuth → auth/logout),
// otherwise the refresh token stays valid after the phone forgets it.
let mock: MockAdapter;

beforeEach(async () => {
  mock = new MockAdapter(axios);
  __resetAccessTokenCache();
});

afterEach(async () => {
  mock.restore();
  await storage.deleteItem('access_token');
  await storage.deleteItem('refresh_token');
  __resetAccessTokenCache();
});

describe('revokeServerSession', () => {
  it('posts auth/logout with the refresh token in the body and the bearer header', async () => {
    await storage.setItem('access_token', 'acc-1');
    await storage.setItem('refresh_token', 'ref-1');
    let body: unknown;
    let auth: unknown;
    mock.onPost(/\/auth\/logout$/).reply((config) => {
      body = JSON.parse(config.data);
      auth = config.headers?.Authorization;
      return [200, {}];
    });

    await revokeServerSession();
    expect(body).toEqual({ refresh_token: 'ref-1' });
    expect(auth).toBe('Bearer acc-1');
  });

  it('never throws — offline or already revoked still lets logout finish', async () => {
    await storage.setItem('access_token', 'acc-1');
    mock.onPost(/\/auth\/logout$/).networkError();
    await expect(revokeServerSession()).resolves.toBeUndefined();
  });

  it('skips the call when there is nothing to revoke', async () => {
    await revokeServerSession();
    expect(mock.history.post).toHaveLength(0);
  });
});
