import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { PUSH_TOKENS } from '../api/urls';

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

// Tap-to-navigate: returns a route based on the notification payload type.
export function routeForNotification(data: any): string | null {
  const type = data?.type;
  if (type === 'new_leave') return '/work-leaves';
  if (type === 'leave_signed' || type === 'leave_rejected') return '/work-leaves';
  if (type === 'new_order' || type === 'order_update') return '/(tabs)/orders';
  if (type === 'new_letter' || type === 'letter_signed' || type === 'letter_rejected' || type === 'letter_update') return '/(tabs)/letters';
  return null;
}
