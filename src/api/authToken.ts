import { storage } from './storage';

// Single owner of the auth tokens. The access token is cached in memory so the
// request interceptor doesn't hit SecureStore (an async native call) on every
// request — previously a 7-query screen meant 7 native reads. The cache is kept
// in sync by routing every write (login, refresh, logout) through here.

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// undefined = not yet loaded from storage; null = known to be absent.
let cachedAccessToken: string | null | undefined;
// Single-flight the initial storage read so concurrent requests on app-open
// don't each hit SecureStore before the first one populates the cache.
let loadPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken !== undefined) return cachedAccessToken;
  if (!loadPromise) {
    loadPromise = storage.getItem(ACCESS_TOKEN_KEY).then((value) => {
      // Don't clobber a token that setAccessToken/clearTokens set while this
      // read was in flight (login/refresh racing the initial load).
      if (cachedAccessToken === undefined) cachedAccessToken = value;
      loadPromise = null;
      return cachedAccessToken;
    });
  }
  return loadPromise;
}

export async function setAccessToken(token: string): Promise<void> {
  cachedAccessToken = token;
  loadPromise = null;
  await storage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return storage.getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await storage.setItem(REFRESH_TOKEN_KEY, token);
}

export async function clearTokens(): Promise<void> {
  cachedAccessToken = null;
  loadPromise = null;
  await storage.deleteItem(ACCESS_TOKEN_KEY);
  await storage.deleteItem(REFRESH_TOKEN_KEY);
}

// Test-only: force the next getAccessToken to re-read storage.
export function __resetAccessTokenCache(): void {
  cachedAccessToken = undefined;
  loadPromise = null;
}
