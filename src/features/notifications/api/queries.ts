import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NOTIFICATIONS_LIST } from '@/api/urls';
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
};

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
