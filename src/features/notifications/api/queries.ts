import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NOTIFICATIONS_LIST, MENU_BADGES } from '@/api/urls';
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
  menuBadges: () => [...notificationKeys.all, 'menu-badges'] as const,
};

/** Bo'limlar kesimidagi "amal kutmoqda" sonlari (web menyusidagi qizil raqamlar). */
export interface MenuBadges {
  letters: number;
  orders: number;
  support: number;
  projects: number;
  fleet: number;
  documents: number;
}

const EMPTY_BADGES: MenuBadges = {
  letters: 0, orders: 0, support: 0, projects: 0, fleet: 0, documents: 0,
};

// Web DashboardLayout bu manbani 60 soniyada bir marta so'raydi; mobilда ham
// shunday. Xato bo'lsa raqamsiz qolamiz (menyu ishlashda davom etadi).
export function menuBadgesQuery() {
  return queryOptions({
    queryKey: notificationKeys.menuBadges(),
    queryFn: () =>
      apiClient
        .get<Partial<MenuBadges>>(MENU_BADGES)
        .then((r) => ({ ...EMPTY_BADGES, ...(r.data ?? {}) }) as MenuBadges)
        .catch(() => EMPTY_BADGES),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function notificationsListQuery(employeeId?: number) {
  return queryOptions({
    queryKey: notificationKeys.list(employeeId),
    queryFn: () =>
      apiClient.get(NOTIFICATIONS_LIST).then((r) => {
        const d = r.data;
        // The API returns either a bare array or a { items } envelope.
        return (Array.isArray(d) ? d : (d?.items ?? [])) as Notification[];
      }),
    // Notifications change externally (push / other clients) — always revalidate
    // on open so the list and unread count are fresh when the screen mounts.
    refetchOnMount: 'always',
  });
}
