import '../src/services/notifications';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, USER_CACHE_KEY } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { storage } from '../src/api/storage';
import { USER_INFO } from '../src/api/urls';
import { User } from '../src/types';
import {
  requestNotificationPermissions,
  registerBackgroundLeaveCheck,
  getExpoPushToken,
  registerTokenWithBackend,
} from '../src/services/notifications';

const queryClient = new QueryClient();

async function setupPushNotifications() {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await registerBackgroundLeaveCheck();
    const token = await getExpoPushToken();
    if (token) {
      await registerTokenWithBackend(token);
    }
  } catch {}
}

function AuthLoader() {
  const { setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    (async () => {
      const token = await storage.getItem('access_token');
      if (!token) {
        setLoading(false);
        router.replace('/(auth)/login');
        return;
      }
      try {
        const res = await apiClient.get<User>(USER_INFO);
        setUser(res.data);
        setupPushNotifications();
        router.replace('/(tabs)');
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          await logout();
          router.replace('/(auth)/login');
        } else {
          // Network/server error — restore from cache so user stays logged in
          const cached = await storage.getItem(USER_CACHE_KEY);
          if (cached) {
            setUser(JSON.parse(cached));
            setupPushNotifications();
            router.replace('/(tabs)');
          } else {
            setLoading(false);
            router.replace('/(auth)/login');
          }
        }
      }
    })();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthLoader />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0F1A' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="team" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="attendance-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="employee-calendar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="work-leaves" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="create-leave" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="team-leaves" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="employees-list" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="birthdays" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="salary" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="leave-detail" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </QueryClientProvider>
    </SafeAreaProvider>
  );
}
