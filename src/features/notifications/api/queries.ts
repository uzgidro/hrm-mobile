import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NOTIFICATIONS_LIST } from '@/api/urls';
import { MENU_BADGES_KEY } from '@/lib/menuBadges';
import type { Notification } from '@/types';

// Hierarchical query keys — invalidating `notificationKeys.all` refreshes the
// list (prefix match). This is the per-feature queryOptions pattern (TkDodo):
// key + queryFn colocated so screens, prefetch and invalidation all reference
// one source of truth.
//
// NOTE: `all` is `['notifications']`, which is the exact key the push service
// invalidates on foreground receipt (`app/_layout.tsx` →
// `queryClient.invalidateQueries({ queryKey: ['notifications'] })`). Keeping it
// as `['notifications']` means that existing invalidation keeps refreshing this
// list without any change to the push service.
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (employeeId?: number) => [...notificationKeys.all, 'list', employeeId ?? null] as const,
  // Menyu raqamlari `all` ostida — amal bajarilgach (imzo/kelishuv/tiket)
  // yuboriladigan `invalidateQueries(['notifications'])` ularni ham yangilaydi.
  menuBadges: () => MENU_BADGES_KEY,
};

// Menu badges moved to `@/lib/menuBadges` (shared with the tab bar and the
// list screens' mutations); re-exported so existing imports keep working.
export { menuBadgesQuery, type MenuBadges, MENU_BADGES_KEY } from '@/lib/menuBadges';

// Bounded by `limit` (backend max 500; no `page` on this route). The screen
// starts at 100 and grows the limit with a "more" button — the largest
// account has 2 083 rows and the list used to fetch every one of them.
export const NOTIFICATIONS_PAGE = 100;
export const NOTIFICATIONS_MAX = 500;

export function notificationsListQuery(employeeId?: number, limit: number = NOTIFICATIONS_PAGE) {
  return queryOptions({
    queryKey: [...notificationKeys.list(employeeId), limit] as const,
    queryFn: () =>
      apiClient.get(NOTIFICATIONS_LIST, { params: { limit } }).then((r) => {
        const d = r.data;
        // The API returns either a bare array or a { items } envelope.
        return (Array.isArray(d) ? d : (d?.items ?? [])) as Notification[];
      }),
    // Notifications change externally (push / other clients) — always revalidate
    // on open so the list and unread count are fresh when the screen mounts.
    refetchOnMount: 'always',
  });
}
