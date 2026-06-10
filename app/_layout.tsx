import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { storage } from '../src/api/storage';
import { USER_INFO } from '../src/api/urls';
import { User } from '../src/types';

const queryClient = new QueryClient();

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
        router.replace('/(tabs)');
      } catch {
        await logout();
        router.replace('/(auth)/login');
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
      </Stack>
    </QueryClientProvider>
    </SafeAreaProvider>
  );
}
