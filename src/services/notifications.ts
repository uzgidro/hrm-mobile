import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { PUSH_TOKENS } from '../api/urls';
import type { IconName } from '../components/Icon';

// Foreground notifications: show banner + play sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ??
      undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
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

// Human-readable title + icon for an in-app notification, derived from its
// notification_type (the backend only sends a type code + a description body).
export function notificationMeta(type: string): { title: string; icon: IconName } {
  const t = type || '';
  const map: Record<string, { title: string; icon: IconName }> = {
    order_act_created: { title: 'Yangi buyruq', icon: 'orders' },
    order_act_signed: { title: 'Buyruq tasdiqlandi', icon: 'check' },
    order_act_changes_requested: { title: "Buyruqqa tuzatish so'raldi", icon: 'edit' },
    business_trip_created: { title: 'Yangi xizmat safari', icon: 'briefcase' },
    business_trip_signed: { title: 'Safar imzolandi', icon: 'check' },
    business_trip_stamped: { title: 'Safar tasdiqlandi', icon: 'check' },
    business_trip_rejected: { title: 'Safar rad etildi', icon: 'close' },
    business_trip_report_submitted: { title: 'Safar hisoboti', icon: 'briefcase' },
    business_trip_report_stamped: { title: 'Hisobot tasdig’i', icon: 'briefcase' },
    business_trip_report_approved: { title: 'Hisobot tasdiqlandi', icon: 'check' },
    business_trip_extension_requested: { title: 'Safar muddati', icon: 'calendar' },
    business_trip_extension_approved: { title: 'Muddat uzaytirildi', icon: 'calendar' },
    business_trip_extension_rejected: { title: 'Muddat rad etildi', icon: 'close' },
    news_post_created: { title: 'Yangilik', icon: 'news' },
    workspace_created: { title: 'Yangi loyiha', icon: 'grid' },
    workspace_updated: { title: 'Loyiha yangilandi', icon: 'grid' },
    workspace_member_added: { title: 'Loyihaga qo’shildingiz', icon: 'users' },
    card_created: { title: 'Yangi vazifa', icon: 'checklist' },
    card_member_added: { title: 'Vazifa biriktirildi', icon: 'checklist' },
    card_completed: { title: 'Vazifa bajarildi', icon: 'check' },
    card_rejected: { title: 'Vazifa rad etildi', icon: 'close' },
    card_comment_created: { title: 'Yangi izoh', icon: 'mail' },
    card_comment_mention: { title: 'Sizni eslab o’tishdi', icon: 'mail' },
    card_deadline_approaching: { title: 'Muddat yaqinlashmoqda', icon: 'clock' },
  };
  if (map[t]) return map[t];
  // Prefix fallbacks for any unmapped variants.
  if (t.startsWith('order_act')) return { title: 'Buyruq', icon: 'orders' };
  if (t.startsWith('business_trip')) return { title: 'Xizmat safari', icon: 'briefcase' };
  if (t.startsWith('news')) return { title: 'Yangilik', icon: 'news' };
  if (t.startsWith('workspace')) return { title: 'Loyiha', icon: 'grid' };
  if (t.startsWith('card')) return { title: 'Vazifa', icon: 'checklist' };
  return { title: 'Bildirishnoma', icon: 'bell' };
}
