import '../src/services/notifications';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, USER_CACHE_KEY } from '../src/store/authStore';
import { usePrefsStore } from '../src/store/prefsStore';
import { apiClient } from '../src/api/client';
import { storage } from '../src/api/storage';
import { USER_INFO } from '../src/api/urls';
import { User } from '../src/types';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import {
  requestNotificationPermissions,
  getExpoPushToken,
  registerTokenWithBackend,
  routeForNotification,
} from '../src/services/notifications';

const queryClient = new QueryClient();

async function setupPushNotifications() {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    const token = await getExpoPushToken();
    if (token) await registerTokenWithBackend(token);
  } catch {}
}

function AuthLoader() {
  const { setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    usePrefsStore.getState().hydrate();
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

function ThemedNavigation() {
  const { colors, isDark } = useTheme();

  // Navigate when the user taps a push notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeForNotification(response.notification.request.content.data);
      if (route) {
        setTimeout(() => router.push(route as any), 400);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthLoader />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile-edit" options={{ animation: 'slide_from_right' }} />
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
        <Stack.Screen name="order-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="create-order" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="order-document" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedNavigation />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
