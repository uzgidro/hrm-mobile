// Deep-link interceptor (expo-router). Runs for every incoming URL BEFORE the
// router tries to match it to a screen.
//
// The OneID SSO flow returns to hrm://auth/oneid?otc=... . That URL is captured
// by WebBrowser.openAuthSessionAsync's resolved result (see src/auth/oneid.ts),
// which is where we read the one-time code. But expo-router ALSO receives the
// same deep link and, finding no `auth/oneid` route, renders "Unmatched Route".
// Rewrite that callback to "/" so the router stays on a valid screen while the
// auth handler does the real work; the auth guard then moves to (tabs) on login.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes('auth/oneid') || path.includes('oneid-callback')) {
      return '/';
    }
  } catch {
    // Never throw here — a crash in this hook takes down deep-link handling.
  }
  return path;
}
