// OneID (YaIT) SSO login for mobile. Extracted from the login screen so the
// component just calls loginWithOneId() and reuses authStore.login() with the
// result — same seam as the form-login path.
//
// Flow (see the backend /sso/login + /sso/exchange):
//   1. mint a PKCE (RFC 7636, S256) verifier/challenge pair and open the
//      backend's /sso/login?flow=mobile&redirect_uri=hrm://auth/oneid
//      &code_challenge=...&code_challenge_method=S256 in the SYSTEM BROWSER via
//      WebBrowser.openAuthSessionAsync (ASWebAuthenticationSession on iOS /
//      Chrome Custom Tabs on Android) — RFC 8252's external user-agent, not an
//      in-app WebView. The challenge is REQUIRED by the backend
//      (ONEID_REQUIRE_PKCE): without it /sso/login answers 400
//      code_challenge_required and the browser shows raw JSON.
//   2. after OneID auth the backend redirects to hrm://auth/oneid?otc=<code>
//      carrying only a single-use one-time code (never the JWTs — the hrm://
//      scheme is claimable by other Android apps and lands in OS logs).
//   3. we read the returned URL from the openAuthSessionAsync RESULT (not a
//      Linking listener — on iOS that can silently miss the deep link) and
//      trade the code at POST /sso/exchange for the real access+refresh tokens,
//      presenting the code_verifier — the secret that never left the app. An
//      app that squats hrm:// captures the otc but not the verifier, so the
//      stolen code is useless to it.
//   4. fetch auth/me with an explicit Bearer (tokens aren't stored yet), and
//      hand (access, refresh, user) back so the caller runs authStore.login().
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { apiClient } from '../api/client';
import { Env } from '../config/env';
import { SSO_LOGIN, SSO_EXCHANGE, USER_INFO } from '../api/urls';
import type { User } from '../types';

// Must match ONEID_MOBILE_REDIRECT_ALLOWLIST on the backend.
const REDIRECT_URI = 'hrm://auth/oneid';

// base64url alphabet — exactly 64 chars, so `byte & 63` maps without modulo
// bias, and every char is RFC 7636 "unreserved" (no URL-encoding needed).
const B64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** RFC 7636 code_verifier: 48 random chars (288 bits), within the 43..128 range. */
function createCodeVerifier(): string {
  const bytes = Crypto.getRandomBytes(48);
  let verifier = '';
  for (let i = 0; i < bytes.length; i++) verifier += B64URL_CHARS[bytes[i] & 63];
  return verifier;
}

/**
 * S256 challenge: base64url(SHA-256(verifier)), padding stripped. expo-crypto
 * returns STANDARD base64 ("+/" and "="), which the backend would not match —
 * and a "+" in a query string decodes to a space — so translate it.
 */
async function deriveCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
  // Fresh pair per attempt — the verifier lives only in this call's scope, so a
  // cancelled/abandoned flow can never leak a reusable secret.
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await deriveCodeChallenge(codeVerifier);

  // SSO_LOGIN is opened in the system browser (not called via apiClient).
  const authUrl =
    `${Env.apiUrl}/${SSO_LOGIN}?flow=mobile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

  // User backed out of ASWebAuthenticationSession / Custom Tabs — not an error.
  if (result.type !== 'success') return null;

  const { queryParams } = Linking.parse(result.url);
  const error = firstParam(queryParams?.error);
  if (error) throw new OneIdError(error);

  const otc = firstParam(queryParams?.otc);
  if (!otc) throw new OneIdError('no_code');

  // Trade the one-time code for real tokens. Public endpoint (no Bearer yet);
  // it authenticates via the single-use code BOUND to our code_verifier.
  const { data } = await apiClient.post<{
    access_token: string;
    refresh_token: string;
  }>(SSO_EXCHANGE, { otc, code_verifier: codeVerifier });

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
