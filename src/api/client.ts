import axios from 'axios';
import { API_BASE_URL } from '../constants';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './authToken';

// Web bilan bir xil (`hr` so'rov qatlami — 30s). 15s edi va HUJJAT
// yaratadigan amallar (kelishuv/rad etish, ro'yxatga olish, muhr) serverda
// .docx ni qayta qurib MinIO'ga yuklaydi — sekin tarmoqda bu 15s dan oshib
// ketardi. Natijada so'rov JAVOBSIZ uzilardi va ilova sababsiz "Xatolik"
// ko'rsatardi, server esa amalni BAJARIB bo'lgan bo'lardi.
export const REQUEST_TIMEOUT_MS = 30000;
export const REFRESH_TIMEOUT_MS = 20000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // FastAPI reads a `List[int]` query param as repeated keys
  // (`department_ids=1&department_ids=2`); axios' default writes
  // `department_ids[]=1`, which the server silently ignores — the department
  // head's work-leave scope was never applied. `indexes: null` = repeat the key.
  paramsSerializer: { indexes: null },
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Single-flight refresh ────────────────────────────────────────────────────
// On app open, many queries fire at once. If each one refreshed on its own 401,
// every refresh would mint a new access token and rotate the server session,
// invalidating the others mid-flight and kicking the user out. So we serialize:
// the first 401 starts the refresh, everyone else awaits that same promise.
//
// The outcome matters as much as the token: only a REFUSAL by the server may
// sign the person out. A dropped connection, a timeout or the 502 of an API
// restart says nothing about the session. Treating those as "expired" wiped
// tokens that were still good, so people had to sign in again every day or two.
type RefreshOutcome =
  | { kind: 'ok'; token: string }
  | { kind: 'refused' }
  | { kind: 'failed'; error: unknown };

const REFUSED = [400, 401, 403];

let refreshPromise: Promise<RefreshOutcome> | null = null;

async function refreshAccessToken(): Promise<RefreshOutcome> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return { kind: 'refused' };
    // JSON body, not a query param: a URL lands in proxy/access logs (audit
    // F16/H10). No cookies: the native cookie jar is written to disk late, and
    // an older refresh cookie must never compete with the stored token.
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: REFRESH_TIMEOUT_MS, withCredentials: false }
    );
    if (!data?.access_token) return { kind: 'failed', error: new Error('refresh: no access token') };
    // The refresh token first: if the app is closed between the two writes, the
    // next start still holds the token the server expects.
    if (data.refresh_token) {
      await setRefreshToken(data.refresh_token);
    }
    await setAccessToken(data.access_token);
    return { kind: 'ok', token: data.access_token as string };
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status !== undefined && REFUSED.includes(status)) return { kind: 'refused' };
    return { kind: 'failed', error };
  }
}

function getFreshToken(): Promise<RefreshOutcome> {
  // Reuse an in-flight refresh if one is already running.
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Seconds-since-epoch expiry inside a JWT; null when it cannot be read. */
function expiryOf(token: string): number | null {
  try {
    const part = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const exp = (JSON.parse(atob(part)) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

/**
 * A token that will pass a handshake, refreshed when it is about to expire — for a connection
 * that cannot be retried on a 401 the way a request is (the live socket). Shares the
 * single-flight refresh with every request.
 */
export async function ensureFreshToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const exp = expiryOf(token);
  if (exp === null || exp - Date.now() / 1000 > 30) return token;
  const outcome = await getFreshToken();
  return outcome.kind === 'ok' ? outcome.token : null;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const outcome = await getFreshToken();
      if (outcome.kind === 'ok') {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${outcome.token}`;
        return apiClient(original);
      }
      // Could not reach the server: the tokens stay, and the caller gets the
      // real reason instead of a 401 (bootstrap signs out on a 401).
      if (outcome.kind === 'failed') return Promise.reject(outcome.error);
      // The server refused the refresh token → it is no longer usable.
      await clearTokens();
    }
    // Password rotation (2026-09-15): the server refuses EVERY route with this
    // code once the password is past its window. Raise the flag on the cached
    // user so the root layout shows the mandatory change screen right away,
    // instead of every screen failing quietly until the next /auth/me.
    if (error.response?.status === 403 && error.response?.data?.code === 'password_expired') {
      try {
        const { useAuthStore } = await import('../store/authStore');
        const { user } = useAuthStore.getState();
        if (user && !user.password_must_change) {
          useAuthStore.getState().setUser({ ...user, password_must_change: true, password_expired: true });
        }
      } catch {
        /* never let the gate break error propagation */
      }
    }
    return Promise.reject(error);
  }
);
