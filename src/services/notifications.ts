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

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = getNotifications();
  if (!N || !Device.isDevice) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
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
  } catch {
    return null;
  }
}

export async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await apiClient.post(PUSH_TOKENS, { token, platform: Platform.OS });
  } catch {}
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

  if (orderId) return `/order-detail?id=${orderId}`;
  if (letterId) return `/letter-detail?id=${letterId}`;
  if (newsId != null) return '/news';

  if (type.startsWith('order_act')) return '/(tabs)/orders';
  if (type.startsWith('business_trip')) return '/(tabs)/letters';
  if (type.startsWith('news')) return '/news';
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
  return { title: i18n.t('notifications.generic'), icon: 'bell' };
}
