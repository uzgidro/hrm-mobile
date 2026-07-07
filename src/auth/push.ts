// Best-effort push-token registration after login/bootstrap. Extracted from the
// root layout so the bootstrap hook can call it without importing app/ code.
// Every step is guarded — a denied permission or an unavailable native module
// (e.g. Expo Go) must never break startup.
import {
  requestNotificationPermissions,
  getExpoPushToken,
  registerTokenWithBackend,
} from '../services/notifications';

export async function setupPushNotifications(): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    const token = await getExpoPushToken();
    if (token) await registerTokenWithBackend(token);
  } catch {
    // Non-fatal: notifications are a nice-to-have, not a startup requirement.
  }
}
