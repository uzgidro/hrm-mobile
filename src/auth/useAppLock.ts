// Background re-lock wiring: watches AppState and asks the lock store to
// re-lock once the app has been away for the policy window (shouldRelock).
//
// iOS fires 'inactive' first and 'background' after it — we keep the EARLIEST
// timestamp (only record when the ref is still null) so the away time is
// measured from when the user actually left, not from the last transition.
// lock() self-guards (no-op on web and unless status is 'unlocked'), so this
// hook subscribes unconditionally with no platform or status checks of its
// own — same shape as the notification-listener wiring in app/_layout.tsx.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { shouldRelock } from './lockPolicy';
import { useLockStore } from '../store/lockStore';

export function useAppLock() {
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
        return;
      }
      if (state === 'active') {
        if (shouldRelock(backgroundedAt.current, Date.now())) {
          useLockStore.getState().lock();
        }
        backgroundedAt.current = null;
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}
