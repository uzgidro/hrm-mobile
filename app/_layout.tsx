import '../src/services/notifications';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, USER_CACHE_KEY } from '../src/store/authStore';
import { usePrefsStore } from '../src/store/prefsStore';
import { apiClient } from '../src/api/client';
import { storage } from '../src/api/storage';
import { getAccessToken } from '../src/api/authToken';
import { USER_INFO } from '../src/api/urls';
import { User } from '../src/types';
import { createAppQueryClient } from '../src/lib/queryClient';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import {
  requestNotificationPermissions,
  getExpoPushToken,
  registerTokenWithBackend,
  routeForNotification,
} from '../src/services/notifications';

const queryClient = createAppQueryClient();

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
      // Route the bootstrap read through getAccessToken so it primes the
      // in-memory cache (the request interceptor reuses it, no second read).
      const token = await getAccessToken();
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
  const queryClient = useQueryClient();

  // Refresh the in-app list / unread badge when a push lands in the foreground.
  // Guarded so a limited/absent native notifications module (e.g. Expo Go on
  // SDK 53+) can't crash the app on mount.
  useEffect(() => {
    try {
      const received = Notifications.addNotificationReceivedListener(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
      // Navigate when the user taps a push notification.
      const response = Notifications.addNotificationResponseReceivedListener((r) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        const route = routeForNotification(r.notification.request.content.data);
        if (route) {
          setTimeout(() => router.push(route as any), 400);
        }
      });
      return () => { received.remove(); response.remove(); };
    } catch {
      return undefined;
    }
  }, [queryClient]);

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
        <Stack.Screen name="create-letter" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="letter-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="letter-document" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="news" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="mehmon-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="mehmon-form" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="loyihalar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="loyiha-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="loyiha-form" options={{ animation: 'slide_from_bottom' }} />
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
