import { apiClient } from '@/api/client';
import { NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } from '@/api/urls';

// ── Request functions (pure data access; unit-testable without React) ────────
export function markNotificationRead(id: number): Promise<void> {
  return apiClient.post(NOTIFICATION_READ(id)).then(() => undefined);
}

export function markAllNotificationsRead(): Promise<void> {
  return apiClient.post(NOTIFICATIONS_READ_ALL).then(() => undefined);
}

