// True while the PIN gate is up for a signed-in user (status 'locked' or
// 'setup-required'). Mirrors the `lockVisible` rule in app/_layout.tsx so the
// login screen (status 'setup-required' with no session) is never treated as
// locked. Always false on web, where the lock does not exist.
import { Platform } from 'react-native';
import { useLockStore } from './lockStore';
import { useAuthStore } from './authStore';

export function useIsLocked(): boolean {
  const status = useLockStore((s) => s.status);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated && Platform.OS !== 'web' && (status === 'locked' || status === 'setup-required');
}
