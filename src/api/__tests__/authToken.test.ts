import * as SecureStore from 'expo-secure-store';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  __resetAccessTokenCache,
} from '../authToken';

const getMock = SecureStore.getItemAsync as jest.Mock;
const accessReads = () => getMock.mock.calls.filter((c) => c[0] === 'access_token').length;

beforeEach(async () => {
  __resetAccessTokenCache();
  await SecureStore.setItemAsync('access_token', 'tok-1');
  await SecureStore.setItemAsync('refresh_token', 'ref-1');
  getMock.mockClear();
});

describe('authToken cache', () => {
  it('reads SecureStore only once across many getAccessToken calls', async () => {
    const a = await getAccessToken();
    const b = await getAccessToken();
    const c = await getAccessToken();
    expect([a, b, c]).toEqual(['tok-1', 'tok-1', 'tok-1']);
    expect(accessReads()).toBe(1);
  });

  it('setAccessToken updates cache and storage without an extra read', async () => {
    await getAccessToken(); // primes cache (1 read)
    await setAccessToken('tok-2');
    const v = await getAccessToken();
    expect(v).toBe('tok-2');
    // getAccessToken did not re-read storage after the set (still 1 read).
    expect(accessReads()).toBe(1);
    // And the write reached storage (this direct read is not counted above).
    expect(await SecureStore.getItemAsync('access_token')).toBe('tok-2');
  });

  it('clearTokens wipes cache and storage', async () => {
    await getAccessToken();
    await clearTokens();
    expect(await getAccessToken()).toBeNull();
    expect(await SecureStore.getItemAsync('access_token')).toBeNull();
    expect(await SecureStore.getItemAsync('refresh_token')).toBeNull();
  });

  it('refresh token round-trips through storage', async () => {
    await setRefreshToken('ref-2');
    expect(await getRefreshToken()).toBe('ref-2');
  });

  it('a concurrent setAccessToken wins over an in-flight storage read', async () => {
    // Start the lazy load, then set a new token before it resolves.
    const pending = getAccessToken();
    await setAccessToken('tok-new');
    // The in-flight read must not overwrite the freshly-set token.
    expect(await pending).toBe('tok-new');
    expect(await getAccessToken()).toBe('tok-new');
  });
});
