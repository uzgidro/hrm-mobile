import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } from '@/api/urls';
import { notificationKeys } from './queries';

// ── Request functions (pure data access; unit-testable without React) ────────
export function markNotificationRead(id: number): Promise<void> {
  return apiClient.post(NOTIFICATION_READ(id)).then(() => undefined);
}

export function markAllNotificationsRead(): Promise<void> {
  return apiClient.post(NOTIFICATIONS_READ_ALL).then(() => undefined);
}

// ── Mutation hooks ──────────────────────────────────────────────────────────
// Each invalidates the whole notifications subtree on success (one call
// refreshes the list via the hierarchical key).
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
