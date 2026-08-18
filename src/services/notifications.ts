import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { PUSH_TOKENS } from '../api/urls';
import type { IconName } from '../components/Icon';
import i18n from '@/i18n';

// expo-notifications is loaded lazily and defensively. Importing it at the top
// level throws in Expo Go (SDK 53+ removed remote push there), which would crash
// app startup since this file is imported for side effects in app/_layout.tsx.
// Requiring it on demand and treating an unavailable module as "no push" keeps
// the app running; a development build gets the real native module.
type NotificationsModule = typeof import('expo-notifications');
let cachedModule: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cachedModule === undefined) {
    try {
      cachedModule = require('expo-notifications') as NotificationsModule;
    } catch {
      cachedModule = null;
    }
  }
  return cachedModule;
}

// Push failures used to be swallowed by bare `catch {}` blocks with no trace at
// all — which is how the Android build shipped for a month without a single
// device ever registering a token (no Firebase config in the binary, so
// getExpoPushTokenAsync threw and everything below it silently no-oped). Every
// failure now leaves a tagged line, and `lastPushError` records the most recent
// one so a support call can ask "what does the log say".
let lastPushError: string | null = null;

function pushWarn(step: string, err?: unknown): void {
  lastPushError = `${step}: ${err instanceof Error ? err.message : String(err ?? '')}`;
  console.warn(`[push] ${lastPushError}`);
}

/** Diagnostics: the last push setup failure, or null if the last run was clean. */
export function getLastPushError(): string | null {
  return lastPushError;
}

// Foreground notifications: show banner + play sound. Guarded — a missing/limited
// native module must not throw at import.
try {
  getNotifications()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {}

// The channel id the backend stamps on every Expo message (`channelId: 'default'`
// in worker/tasks.send_expo_push). Android 8+ takes importance/sound from the
// CHANNEL, not the message: with no channel of our own, pushes landed in an
// implicit low-importance one — tray-only, no heads-up banner, no sound.
export const ANDROID_CHANNEL_ID = 'default';

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = getNotifications();
  if (!N) return;
  try {
    await N.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: i18n.t('notifications.channelName'),
      importance: N.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (e) {
    pushWarn('android channel', e);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = getNotifications();
  if (!N) {
    pushWarn('native module', 'expo-notifications mavjud emas (Expo Go?)');
    return false;
  }
  if (!Device.isDevice) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    if (status !== 'granted') pushWarn('permission', `status=${status}`);
    return status === 'granted';
  } catch (e) {
    pushWarn('permission', e);
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  const N = getNotifications();
  try {
    if (!N || !Device.isDevice) return null;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ??
      undefined;
    const tokenData = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch (e) {
    // The failure that mattered: on a build without google-services.json the
    // native FCM registration fails here, so no token ever reaches the backend.
    pushWarn('getExpoPushToken', e);
    return null;
  }
}

// The token this device last registered, so logout can unregister exactly it
// without depending on the native module still being reachable.
let registeredToken: string | null = null;

export async function registerTokenWithBackend(token: string): Promise<boolean> {
  try {
    await apiClient.post(PUSH_TOKENS, { token, platform: Platform.OS });
    registeredToken = token;
    lastPushError = null;
    return true;
  } catch (e) {
    // The backend now answers 403 when the account has no employee record
    // (it used to answer `201 {"ok": false}`, which read as success here).
    pushWarn('register', e);
    return false;
  }
}

/** Unbind this device from the current account. Called on logout so the next
 *  person to sign in on this phone never receives the previous user's pushes. */
export async function unregisterTokenWithBackend(): Promise<void> {
  const token = registeredToken ?? (await getExpoPushToken());
  if (!token) return;
  try {
    await apiClient.delete(PUSH_TOKENS, { data: { token, platform: Platform.OS } });
  } catch (e) {
    pushWarn('unregister', e);
  } finally {
    registeredToken = null;
  }
}

// Subscribe to foreground receipt + tap events. Returns an unsubscribe function.
// Routing is resolved here so callers never touch the native module directly.
export function addNotificationListeners(handlers: {
  onForeground: () => void;
  onTap: (route: string | null) => void;
}): () => void {
  const N = getNotifications();
  if (!N) return () => {};
  try {
    const received = N.addNotificationReceivedListener(() => handlers.onForeground());
    const response = N.addNotificationResponseReceivedListener((r) => {
      handlers.onTap(routeForNotification(r.notification.request.content.data));
    });
    return () => {
      received.remove();
      response.remove();
    };
  } catch {
    return () => {};
  }
}

// Resolve a navigation target from either:
//   • a push payload  → { type, order_act_id | letter_id | news_post_id, ... }
//   • an in-app row   → { notification_type, order_act_id | news_post_id, ... }
// Prefer a concrete deep-link id; otherwise fall back to the relevant list.
export function routeForNotification(data: any): string | null {
  if (!data) return null;
  const type: string = String(data.notification_type || data.type || '');
  const orderId = data.order_act_id;
  const letterId = data.letter_id; // only present on push payloads
  const newsId = data.news_post_id;
  const kpiEntryId = data.kpi_entry_id; // kpi_task_submitted/confirmed/rejected
  const workLeaveId = data.work_leave_id; // work_leave_* — push payloads only

  if (orderId) return `/order-detail?id=${orderId}`;
  if (letterId) return `/letter-detail?id=${letterId}`;
  if (kpiEntryId) return `/kpi-entry?id=${kpiEntryId}`;
  if (workLeaveId) return `/leave-detail?id=${workLeaveId}`;
  if (newsId != null) return '/news';

  if (type.startsWith('order_act')) return '/(tabs)/orders';
  if (type.startsWith('business_trip')) return '/(tabs)/letters';
  if (type.startsWith('vehicle_') || type === 'driver_trip_created') return '/(tabs)/letters';
  if (type.startsWith('news')) return '/news';
  if (type.startsWith('kpi')) return '/kpi';
  if (type.startsWith('work_leave')) return '/work-leaves';
  // card_* / workspace_* (Loyihalar) have no mobile screen yet — stay put.
  return null;
}

// Icon + i18n title-key for each notification_type. The KEYS of this map are the
// backend contract (the notification_type codes) and must not be renamed; only
// the title is translatable, so it is stored as a `notifications.*` catalog key
// rather than a literal string.
const NOTIF_META: Record<string, { titleKey: string; icon: IconName }> = {
  order_act_created: { titleKey: 'notifications.orderActCreated', icon: 'orders' },
  order_act_signed: { titleKey: 'notifications.orderActSigned', icon: 'check' },
  order_act_changes_requested: { titleKey: 'notifications.orderActChangesRequested', icon: 'edit' },
  business_trip_created: { titleKey: 'notifications.businessTripCreated', icon: 'briefcase' },
  business_trip_signed: { titleKey: 'notifications.businessTripSigned', icon: 'check' },
  business_trip_stamped: { titleKey: 'notifications.businessTripStamped', icon: 'check' },
  business_trip_rejected: { titleKey: 'notifications.businessTripRejected', icon: 'close' },
  business_trip_report_submitted: {
    titleKey: 'notifications.businessTripReportSubmitted',
    icon: 'briefcase',
  },
  business_trip_report_stamped: {
    titleKey: 'notifications.businessTripReportStamped',
    icon: 'briefcase',
  },
  business_trip_report_approved: {
    titleKey: 'notifications.businessTripReportApproved',
    icon: 'check',
  },
  business_trip_extension_requested: {
    titleKey: 'notifications.businessTripExtensionRequested',
    icon: 'calendar',
  },
  business_trip_extension_approved: {
    titleKey: 'notifications.businessTripExtensionApproved',
    icon: 'calendar',
  },
  business_trip_extension_rejected: {
    titleKey: 'notifications.businessTripExtensionRejected',
    icon: 'close',
  },
  // Avtopark (mashina). Uchalasi ham `letter_id` bilan keladi — deep-link
  // routeForNotification'даги umumiy `letter_id` tarmog'i orqali ishlaydi.
  vehicle_requested: { titleKey: 'notifications.vehicleRequested', icon: 'briefcase' },
  vehicle_request_answered: { titleKey: 'notifications.vehicleRequestAnswered', icon: 'check' },
  driver_trip_created: { titleKey: 'notifications.driverTripCreated', icon: 'briefcase' },
  news_post_created: { titleKey: 'notifications.newsPostCreated', icon: 'news' },
  workspace_created: { titleKey: 'notifications.workspaceCreated', icon: 'grid' },
  workspace_updated: { titleKey: 'notifications.workspaceUpdated', icon: 'grid' },
  workspace_member_added: { titleKey: 'notifications.workspaceMemberAdded', icon: 'users' },
  card_created: { titleKey: 'notifications.cardCreated', icon: 'checklist' },
  card_member_added: { titleKey: 'notifications.cardMemberAdded', icon: 'checklist' },
  card_completed: { titleKey: 'notifications.cardCompleted', icon: 'check' },
  card_rejected: { titleKey: 'notifications.cardRejected', icon: 'close' },
  card_comment_created: { titleKey: 'notifications.cardCommentCreated', icon: 'mail' },
  card_comment_mention: { titleKey: 'notifications.cardCommentMention', icon: 'mail' },
  card_deadline_approaching: { titleKey: 'notifications.cardDeadlineApproaching', icon: 'clock' },
  kpi_task_submitted: { titleKey: 'notifications.kpiTaskSubmitted', icon: 'checklist' },
  kpi_task_confirmed: { titleKey: 'notifications.kpiTaskConfirmed', icon: 'check' },
  kpi_task_rejected: { titleKey: 'notifications.kpiTaskRejected', icon: 'close' },
  work_leave_requested: { titleKey: 'notifications.workLeaveRequested', icon: 'calendar' },
  work_leave_signed: { titleKey: 'notifications.workLeaveSigned', icon: 'check' },
  work_leave_rejected: { titleKey: 'notifications.workLeaveRejected', icon: 'close' },
};

// Human-readable title + icon for an in-app notification, derived from its
// notification_type (the backend only sends a type code + a description body).
// The title is resolved via i18n.t() at call time, so it follows the CURRENT
// app language — a notification title re-renders correctly after a language
// switch. (The push BODY, which arrives as pre-composed text from the backend,
// cannot be translated on the client; only these client-generated titles can.)
export function notificationMeta(type: string): { title: string; icon: IconName } {
  const t = type || '';
  const meta = NOTIF_META[t];
  if (meta) return { title: i18n.t(meta.titleKey), icon: meta.icon };
  // Prefix fallbacks for any unmapped variants.
  if (t.startsWith('order_act'))
    return { title: i18n.t('notifications.orderFallback'), icon: 'orders' };
  if (t.startsWith('business_trip'))
    return { title: i18n.t('notifications.businessTripFallback'), icon: 'briefcase' };
  if (t.startsWith('news')) return { title: i18n.t('notifications.newsFallback'), icon: 'news' };
  if (t.startsWith('workspace'))
    return { title: i18n.t('notifications.workspaceFallback'), icon: 'grid' };
  if (t.startsWith('card')) return { title: i18n.t('notifications.cardFallback'), icon: 'checklist' };
  if (t.startsWith('kpi')) return { title: i18n.t('notifications.kpiFallback'), icon: 'target' };
  if (t.startsWith('work_leave'))
    return { title: i18n.t('notifications.workLeaveFallback'), icon: 'calendar' };
  return { title: i18n.t('notifications.generic'), icon: 'bell' };
}
