import '../src/services/notifications'; // side effect: sets the foreground notification handler
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import { useAuthStore } from '../src/store/authStore';
import { useLockStore } from '../src/store/lockStore';
import { createAppQueryClient } from '../src/lib/queryClient';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { addNotificationListeners } from '../src/services/notifications';
import { useAuthBootstrap } from '../src/auth/useAuthBootstrap';
import { useAppLock } from '../src/auth/useAppLock';
import { checkAppUpdateOnLaunch } from '../src/services/appUpdates';
import { RootErrorBoundary } from '../src/components/RootErrorBoundary';
import { ToastHost } from '../src/components/ToastHost';
import { ConfirmHost } from '../src/components/ConfirmHost';
import LockOverlay from '../src/features/security/components/LockOverlay';

const queryClient = createAppQueryClient();

function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const lockStatus = useLockStore((s) => s.status);

  // Resolve the session at launch (seeds the store, drives the native splash).
  // Routing is declarative below via Stack.Protected on isAuthenticated.
  useAuthBootstrap();

  // Re-lock the app after it has spent RELOCK_AFTER_MS in the background.
  // The hook self-guards (web / non-'unlocked'), so it needs no conditions here.
  useAppLock();

  // The mandatory PIN gate. Native-only (SecureStore + the lock store report
  // 'unlocked' on web), rendered as a full-screen sibling of the navigator so
  // it never fights the Stack.Protected auth guards. Shown while a signed-in
  // user is still on 'setup-required' or 'locked'.
  const lockVisible =
    isAuthenticated && Platform.OS !== 'web' && lockStatus !== 'unlocked' && lockStatus !== 'unknown';

  // Google Play in-app update check — once, after startup settles and the lock
  // gate (if any) is cleared, so the native dialog never covers the splash or
  // the PIN pad. The service self-guards platform/Expo Go/no-update.
  const updateChecked = useRef(false);
  useEffect(() => {
    if (isLoading || updateChecked.current) return;
    if (lockVisible) return;
    updateChecked.current = true;
    void checkAppUpdateOnLaunch();
  }, [isLoading, lockVisible]);

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
          <Stack.Screen name="submit-report" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="news" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="mehmon-detail" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="mehmon-form" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="loyihalar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="loyiha-detail" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="hujjatlar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="hujjat-viewer" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="kpi" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="kpi-entry" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="kpi-team" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tabel" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="navbatchilik" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="navbatchilik-grid" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="bayramlar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="assistant" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="loyiha-form" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="change-pin" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
      <ToastHost />
      {/* Global confirm dialogs (logout, delete, reject, update) rendered once
          here so imperative confirm() works from hooks and services too. */}
      <ConfirmHost />
      {/* Above everything (incl. toasts): the PIN gate covers the whole app. */}
      {lockVisible && <LockOverlay />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <RootErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <ThemedNavigation />
            </QueryClientProvider>
          </RootErrorBoundary>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
