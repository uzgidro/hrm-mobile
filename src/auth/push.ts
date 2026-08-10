// Best-effort push-token registration after login/bootstrap. Extracted from the
// root layout so the bootstrap hook can call it without importing app/ code.
// Every step is guarded — a denied permission or an unavailable native module
// (e.g. Expo Go) must never break startup — but each failure now leaves a
// tagged log line (see services/notifications), because the silent version of
// this file hid a month-long outage: the Android binary shipped without a
// Firebase config, so getExpoPushToken() threw and nothing ever registered.
import {
  ensureAndroidChannel,
  requestNotificationPermissions,
  getExpoPushToken,
  registerTokenWithBackend,
  unregisterTokenWithBackend,
} from '../services/notifications';

export async function setupPushNotifications(): Promise<void> {
  try {
    // Create the channel FIRST: on Android 8+ importance and sound come from
    // the channel, and the backend stamps `channelId: 'default'` on every push.
    await ensureAndroidChannel();
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    const token = await getExpoPushToken();
    if (token) await registerTokenWithBackend(token);
  } catch {
    // Non-fatal: notifications are a nice-to-have, not a startup requirement.
  }
}

/** Unbind this device before the session is torn down. Must run BEFORE tokens
 *  are cleared — the DELETE needs the still-valid bearer token. */
export async function teardownPushNotifications(): Promise<void> {
  try {
    await unregisterTokenWithBackend();
  } catch {
    // Non-fatal: a failed unregister just leaves a stale row the backend prunes
    // on the next DeviceNotRegistered receipt.
  }
}
