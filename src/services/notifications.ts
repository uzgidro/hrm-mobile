import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { WORK_LEAVES, PUSH_TOKENS } from '../api/urls';
import { storage } from '../api/storage';

const TASK_NAME = 'bg-leave-poll';
const NOTIFIED_IDS_KEY = 'notified_leave_ids';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function pollNewLeaves() {
  const token = await storage.getItem('access_token');
  if (!token) return;

  const res = await apiClient.get(WORK_LEAVES, {
    params: { assigned_signer: true, size: 50 },
  });
  const data = res.data;
  const leaves: any[] = Array.isArray(data) ? data : (data?.items ?? []);
  const pending = leaves.filter(
    (l) => l.status === 'pending' || l.status === 'yuborildi'
  );

  const savedRaw = await storage.getItem(NOTIFIED_IDS_KEY);
  const notifiedIds: string[] = savedRaw ? JSON.parse(savedRaw) : [];
  const newLeaves = pending.filter((l) => !notifiedIds.includes(String(l.id)));

  if (newLeaves.length > 0) {
    const body =
      newLeaves.length === 1
        ? `${newLeaves[0].employee?.legal_name ?? 'Xodim'} ruxsat so'rovi yubordi`
        : `${newLeaves.length} ta yangi ruxsat so'rovi keldi`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Yangi ruxsat so'rovi 📋",
        body,
        data: { type: 'new_leave' },
      },
      trigger: null,
    });
  }

  const allIds = pending.map((l) => String(l.id));
  await storage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(allIds));
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await pollNewLeaves();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
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
      (Constants as any).manifest?.id ??
      undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await apiClient.post(PUSH_TOKENS, {
      token,
      platform: Platform.OS,
    });
  } catch {}
}

export async function registerBackgroundLeaveCheck() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {}
}

export async function checkLeavesNow() {
  try { await pollNewLeaves(); } catch {}
}
