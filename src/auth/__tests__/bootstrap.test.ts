import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../api/client';
import { storage } from '../../api/storage';
import { __resetAccessTokenCache } from '../../api/authToken';
import { USER_INFO } from '../../api/urls';
import { USER_CACHE_KEY } from '../../store/authStore';
import { resolveBootstrap, readCachedUser } from '../bootstrap';

let mock: MockAdapter;

beforeEach(async () => {
  mock = new MockAdapter(apiClient);
  __resetAccessTokenCache();
  await storage.deleteItem('access_token');
  await storage.deleteItem('refresh_token');
  await storage.deleteItem(USER_CACHE_KEY);
});
afterEach(() => mock.restore());

const CACHED = { id: 7, type: 'employee', legal_name: 'Ali' };
const FRESH = { id: 7, type: 'employee', legal_name: 'Ali (fresh)' };

describe('resolveBootstrap', () => {
  it('returns unauthenticated when there is no access token', async () => {
    const out = await resolveBootstrap();
    expect(out).toEqual({ status: 'unauthenticated' });
  });

  it('returns the fresh user when auth/me succeeds', async () => {
    await storage.setItem('access_token', 'tok');
    __resetAccessTokenCache();
    mock.onGet(USER_INFO).reply(200, FRESH);
    const out = await resolveBootstrap();
    expect(out).toEqual({ status: 'authenticated', user: FRESH, fromCache: false });
  });

  it('logs the user out (unauthenticated) on a 401 from auth/me', async () => {
    await storage.setItem('access_token', 'tok');
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(CACHED));
    __resetAccessTokenCache();
    mock.onGet(USER_INFO).reply(401);
    const out = await resolveBootstrap();
    // Even though a cached user exists, a 401 means the token is invalid.
    expect(out).toEqual({ status: 'unauthenticated' });
  });

  it('logs the user out on a 403 from auth/me', async () => {
    await storage.setItem('access_token', 'tok');
    __resetAccessTokenCache();
    mock.onGet(USER_INFO).reply(403);
    expect(await resolveBootstrap()).toEqual({ status: 'unauthenticated' });
  });

  it('falls back to the cached user on a network error (offline)', async () => {
    await storage.setItem('access_token', 'tok');
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(CACHED));
    __resetAccessTokenCache();
    mock.onGet(USER_INFO).networkError();
    const out = await resolveBootstrap();
    expect(out).toEqual({ status: 'authenticated', user: CACHED, fromCache: true });
  });

  it('is unauthenticated on a network error when nothing is cached', async () => {
    await storage.setItem('access_token', 'tok');
    __resetAccessTokenCache();
    mock.onGet(USER_INFO).networkError();
    expect(await resolveBootstrap()).toEqual({ status: 'unauthenticated' });
  });

  it('falls back to cache on a 500 (server blip, not an auth failure)', async () => {
    await storage.setItem('access_token', 'tok');
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(CACHED));
    __resetAccessTokenCache();
    mock.onGet(USER_INFO).reply(500);
    expect(await resolveBootstrap()).toEqual({
      status: 'authenticated',
      user: CACHED,
      fromCache: true,
    });
  });
});

describe('readCachedUser', () => {
  it('returns null when nothing is cached', async () => {
    expect(await readCachedUser()).toBeNull();
  });

  it('parses a cached user', async () => {
    await storage.setItem(USER_CACHE_KEY, JSON.stringify(CACHED));
    expect(await readCachedUser()).toEqual(CACHED);
  });

  it('returns null (not throw) on corrupt cached JSON', async () => {
    await storage.setItem(USER_CACHE_KEY, '{not json');
    expect(await readCachedUser()).toBeNull();
  });
});
