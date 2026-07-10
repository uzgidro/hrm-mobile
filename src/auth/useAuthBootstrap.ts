// Drives startup auth resolution and the native splash screen, feeding the
// authStore. Routing itself is declarative (Stack.Protected on isAuthenticated
// in the root layout) — this hook only decides WHO the user is, not WHERE to go.
//
// Non-blocking startup: if a cached user exists we seed the store and hide the
// splash immediately, then let resolveBootstrap refresh auth/me in the
// background. With no cache we wait for resolveBootstrap before hiding the
// splash (there's nothing to show yet).
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/authStore';
import { usePrefsStore } from '../store/prefsStore';
import { useLockStore } from '../store/lockStore';
import { resolveBootstrap, readCachedUser } from './bootstrap';
import { setupPushNotifications } from './push';

// Keep the native splash up until we've decided the initial auth state. Errors
// (already hidden, etc.) are non-fatal.
SplashScreen.preventAutoHideAsync().catch(() => {});

export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let done = false;
    const hideSplash = () => {
      if (done) return;
      done = true;
      SplashScreen.hideAsync().catch(() => {});
    };

    (async () => {
      usePrefsStore.getState().hydrate();

      // Resolve the lock state BEFORE any hideSplash() below — the invariant is
      // that the first visible frame already carries the PIN gate, so a
      // returning user never glimpses their dashboard before the lock. hydrate()
      // never throws (fail-closed to 'setup-required').
      await useLockStore.getState().hydrate();

      // Fast path: seed a cached user and drop the splash right away so a
      // returning user lands on their dashboard without waiting on the network.
      const cached = await readCachedUser();
      if (cached) {
        setUser(cached);
        setLoading(false);
        hideSplash();
      }

      const outcome = await resolveBootstrap();
      if (outcome.status === 'authenticated') {
        setUser(outcome.user);
        setLoading(false);
        setupPushNotifications();
      } else {
        // No valid session. If we had optimistically seeded a cached user,
        // clear it so the guard flips back to the login screen.
        await logout();
        setLoading(false);
      }
      hideSplash();
    })();
    // Store actions are stable; run once on mount (matches the old AuthLoader).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
