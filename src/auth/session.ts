// Server-side session revocation on logout (web v2 parity: useAuth posts
// auth/logout). Without it, logging out only wiped the tokens on the phone —
// the session and its refresh token stayed valid on the server.
//
// Raw axios, not apiClient: a 401 here must not trigger the refresh
// interceptor (the endpoint is public and accepts an expired access token).
// Best-effort and bounded: logout never waits long or fails because of it.
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { AUTH_LOGOUT } from '../api/urls';
import { getAccessToken, getRefreshToken } from '../api/authToken';

export const LOGOUT_TIMEOUT_MS = 5000;

export async function revokeServerSession(): Promise<void> {
  try {
    const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
    if (!access && !refresh) return;
    await axios.post(
      `${API_BASE_URL}/${AUTH_LOGOUT}`,
      { refresh_token: refresh ?? undefined },
      {
        timeout: LOGOUT_TIMEOUT_MS,
        headers: access ? { Authorization: `Bearer ${access}` } : undefined,
      },
    );
  } catch {
    // Offline / already revoked — the local wipe still happens.
  }
}
