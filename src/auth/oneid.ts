// OneID (YaIT) SSO login for mobile. Extracted from the login screen so the
// component just calls loginWithOneId() and reuses authStore.login() with the
// result — same seam as the form-login path.
//
// Flow (see the backend /sso/login + /sso/exchange):
//   1. open the backend's /sso/login?flow=mobile&redirect_uri=hrm://auth/oneid
//      in the SYSTEM BROWSER via WebBrowser.openAuthSessionAsync
//      (ASWebAuthenticationSession on iOS / Chrome Custom Tabs on Android) —
//      RFC 8252's external user-agent, not an in-app WebView.
//   2. after OneID auth the backend redirects to hrm://auth/oneid?otc=<code>
//      carrying only a single-use one-time code (never the JWTs — the hrm://
//      scheme is claimable by other Android apps and lands in OS logs).
//   3. we read the returned URL from the openAuthSessionAsync RESULT (not a
//      Linking listener — on iOS that can silently miss the deep link) and
//      trade the code at POST /sso/exchange for the real access+refresh tokens.
//   4. fetch auth/me with an explicit Bearer (tokens aren't stored yet), and
//      hand (access, refresh, user) back so the caller runs authStore.login().
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiClient } from '../api/client';
import { Env } from '../config/env';
import { SSO_LOGIN, SSO_EXCHANGE, USER_INFO } from '../api/urls';
import type { User } from '../types';

// Must match ONEID_MOBILE_REDIRECT_ALLOWLIST on the backend.
const REDIRECT_URI = 'hrm://auth/oneid';

export interface OneIdLoginResult {
  access_token: string;
  refresh_token: string;
  user: User;
}

/** OneID returned a deep-link error (?error=...) instead of a code. */
export class OneIdError extends Error {
  constructor(public reason: string) {
    super(`OneID login failed: ${reason}`);
    this.name = 'OneIdError';
  }
}

/**
 * Run the OneID browser flow. Resolves with the token pair + user on success,
 * or null when the user cancels/dismisses the browser (no error to surface).
 * Throws OneIdError when OneID returns an error, or a network error from the
 * exchange/profile calls (the caller toasts it).
 */
export async function loginWithOneId(): Promise<OneIdLoginResult | null> {
  // SSO_LOGIN is opened in the system browser (not called via apiClient).
  const authUrl = `${Env.apiUrl}/${SSO_LOGIN}?flow=mobile&redirect_uri=${encodeURIComponent(
    REDIRECT_URI,
  )}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

  // User backed out of ASWebAuthenticationSession / Custom Tabs — not an error.
  if (result.type !== 'success') return null;

  const { queryParams } = Linking.parse(result.url);
  const error = firstParam(queryParams?.error);
  if (error) throw new OneIdError(error);

  const otc = firstParam(queryParams?.otc);
  if (!otc) throw new OneIdError('no_code');

  // Trade the one-time code for real tokens. Public endpoint (no Bearer yet);
  // it authenticates via the single-use code.
  const { data } = await apiClient.post<{
    access_token: string;
    refresh_token: string;
  }>(SSO_EXCHANGE, { otc });

  // Fetch the profile with an explicit Bearer — the interceptor's cached token
  // isn't set until authStore.login() runs (mirrors the form-login path).
  const meRes = await apiClient.get<User>(USER_INFO, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: meRes.data,
  };
}

// Linking.parse returns string | string[] | undefined per key; take the first.
function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}
