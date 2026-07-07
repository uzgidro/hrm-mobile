import '../src/services/notifications'; // side effect: sets the foreground notification handler
import { useEffect } from 'react';
import { Stack, router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { createAppQueryClient } from '../src/lib/queryClient';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { addNotificationListeners } from '../src/services/notifications';
import { useAuthBootstrap } from '../src/auth/useAuthBootstrap';
import { RootErrorBoundary } from '../src/components/RootErrorBoundary';
import { ToastHost } from '../src/components/ToastHost';

const queryClient = createAppQueryClient();

function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Resolve the session at launch (seeds the store, drives the native splash).
  // Routing is declarative below via Stack.Protected on isAuthenticated.
  useAuthBootstrap();

  // Refresh the in-app list / unread badge when a push lands in the foreground,
  // and navigate on tap. The listener helper lazy-loads the native module and
  // no-ops if it's unavailable (e.g. Expo Go), so this can't crash on mount.
  useEffect(() => {
    return addNotificationListeners({
      onForeground: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      onTap: (route) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        if (route) setTimeout(() => router.push(route as Href), 400);
      },
    });
  }, [queryClient]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Declarative auth gate: the guards redirect automatically when
            isAuthenticated flips (login/logout), replacing the old imperative
            router.replace calls in AuthLoader. */}
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated}>
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
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ThemedNavigation />
          </QueryClientProvider>
        </RootErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
