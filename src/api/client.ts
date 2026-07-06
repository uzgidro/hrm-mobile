import axios from 'axios';
import { API_BASE_URL } from '../constants';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './authToken';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      null,
      { params: { refresh_token: refreshToken }, timeout: 20000 }
    );
    if (data?.access_token) {
      await setAccessToken(data.access_token);
      if (data.refresh_token) {
        await setRefreshToken(data.refresh_token);
      }
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

function getFreshToken(): Promise<string | null> {
  // Reuse an in-flight refresh if one is already running.
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await getFreshToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      // Refresh failed → tokens are no longer usable.
      await clearTokens();
    }
    return Promise.reject(error);
  }
);
