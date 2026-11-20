// A nurse signing in lands straight on the health check (2026-11-20): the queue of
// people to check before the shift is the first thing they need. It is pushed ON
// TOP of the start tab, so «back» returns to the normal home screen.
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { canAccessPage } from '@/utils/roles';
import { shouldAutoOpenHealth } from '../utils/health';

// Once per signed-in user per app session; a sign-out forgets it, so the next
// sign-in (the same nurse included) opens the screen again.
let openedFor: number | null = null;
useAuthStore.subscribe((state) => {
  if (!state.user) openedFor = null;
});

/** Test hook. */
export function resetHealthAutoOpen() {
  openedFor = null;
}

export function useHealthAutoOpen(onStartTab: boolean) {
  const user = useAuthStore((s) => s.user);
  const should = shouldAutoOpenHealth({
    userId: user?.id,
    nurseBranches: user?.nurse_branch_ids?.length ?? 0,
    moduleOn: canAccessPage(user, 'health'),
    onStartTab,
    alreadyOpenedFor: openedFor,
  });
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!should || userId == null) return;
    openedFor = userId;
    router.push('/sogliq-korigi');
  }, [should, userId]);
}
