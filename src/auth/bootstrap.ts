// Startup auth resolution, extracted from the old inline AuthLoader effect so it
// can be unit-tested and so the root layout can drive routing DECLARATIVELY
// (via Stack.Protected on isAuthenticated) instead of imperative router.replace.
//
// Behaviour preserved 1:1 from the previous AuthLoader:
//   - no token                     → unauthenticated (go to login)
//   - auth/me OK                   → authenticated with the fresh user
//   - auth/me 401/403              → logout + unauthenticated
//   - auth/me network error, cache → authenticated with the CACHED user (offline)
//   - auth/me network error, none  → unauthenticated
//
// The one intended change vs before: when we already have a cached user we can
// seed it and hide the splash IMMEDIATELY, then refresh auth/me in the
// background — so a returning user sees their dashboard without waiting on the
// network (non-blocking startup). `seedFromCache` supports that.
import { apiClient } from '../api/client';
import { USER_INFO } from '../api/urls';
import { getAccessToken } from '../api/authToken';
import { storage } from '../api/storage';
import { USER_CACHE_KEY } from '../store/authStore';
import type { User } from '../types';

export type BootstrapOutcome =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; fromCache: boolean };

function isAuthError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

// Read the cached user written by authStore (offline fallback + fast startup).
export async function readCachedUser(): Promise<User | null> {
  const cached = await storage.getItem(USER_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as User;
  } catch {
    return null;
  }
}

// Resolve the authoritative auth state at launch. Reading the token through
// getAccessToken primes the in-memory cache the request interceptor reuses.
export async function resolveBootstrap(): Promise<BootstrapOutcome> {
  const token = await getAccessToken();
  if (!token) return { status: 'unauthenticated' };

  try {
    const res = await apiClient.get<User>(USER_INFO);
    return { status: 'authenticated', user: res.data, fromCache: false };
  } catch (err) {
    if (isAuthError(err)) {
      // Token is genuinely invalid → caller logs out.
      return { status: 'unauthenticated' };
    }
    // Network / server blip → fall back to the cached user so the app works
    // offline. Only if there's nothing cached do we send them to login.
    const cached = await readCachedUser();
    if (cached) return { status: 'authenticated', user: cached, fromCache: true };
    return { status: 'unauthenticated' };
  }
}
