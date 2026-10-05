// Deep links vs. the declarative auth guards (QA: every web deep link with a
// stored token ended on "/"). The root layout mounts its <Stack> only through
// AuthResolvedGate, i.e. once useAuthBootstrap has settled `isLoading`, so
// `Stack.Protected guard={isAuthenticated}` is already right on the navigator's
// first mount and the initial URL survives. The second suite pins the
// expo-router behaviour that makes the gate necessary.
import React from 'react';
import { Text } from 'react-native';
import { Slot, Stack } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { AuthResolvedGate } from '../AuthResolvedGate';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

const user = { id: 1, type: 'employee', employee: { id: 7 } } as unknown as User;

function makeRoutes(gated: boolean) {
  function RootLayout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const stack = (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="zoom" />
          <Stack.Screen name="hisobotlar" />
        </Stack.Protected>
      </Stack>
    );
    return gated ? <AuthResolvedGate fallback={<Text>boot</Text>}>{stack}</AuthResolvedGate> : stack;
  }
  return {
    _layout: RootLayout,
    '(auth)/_layout': () => <Slot />,
    '(auth)/login': () => <Text>login</Text>,
    '(tabs)/_layout': () => <Slot />,
    '(tabs)/index': () => <Text>home</Text>,
    '(tabs)/documents': () => <Text>documents</Text>,
    zoom: () => <Text>zoom</Text>,
    hisobotlar: () => <Text>reports</Text>,
  };
}

// Startup as useAuthBootstrap sees it: nothing known yet.
beforeEach(() => useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true }));

// renderRouter's result is also a thenable (RNTL 14 async render): await it,
// but hand it back wrapped — returning it from an async fn would unwrap it.
async function boot(gated: boolean, initialUrl: string) {
  const router = renderRouter(makeRoutes(gated), { initialUrl });
  await router;
  return { router };
}

// What useAuthBootstrap does on the cached-user fast path: setUser + setLoading(false).
async function resolveAuthenticated() {
  await act(async () => {
    useAuthStore.setState({ user, isAuthenticated: true });
    useAuthStore.setState({ isLoading: false });
  });
}

describe('AuthResolvedGate — deep link survives startup auth resolution', () => {
  it('renders the fallback (no navigator) while the session is unresolved', async () => {
    await boot(true, '/zoom');
    expect(screen.getByText('boot')).toBeTruthy();
    expect(screen.queryByText('login')).toBeNull();
  });

  it.each([
    ['/zoom', 'zoom'],
    ['/hisobotlar', 'reports'],
  ])('signed-in user opening %s stays there', async (url, text) => {
    const { router } = await boot(true, url);
    await resolveAuthenticated();
    expect(router.getPathname()).toBe(url);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('keeps the query string (/documents?seg=letters)', async () => {
    const { router } = await boot(true, '/documents?seg=letters');
    await resolveAuthenticated();
    expect(router.getPathnameWithParams()).toBe('/documents?seg=letters');
  });

  it('no session → the auth guard still sends the deep link to login', async () => {
    await boot(true, '/zoom');
    await act(async () => {
      useAuthStore.setState({ isLoading: false });
    });
    expect(screen.getByText('login')).toBeTruthy();
    expect(screen.queryByText('zoom')).toBeNull();
  });
});

describe('why the gate exists (expo-router + Stack.Protected)', () => {
  it('a navigator mounted before auth resolves drops the deep link and lands on "/"', async () => {
    const { router } = await boot(false, '/zoom');
    await resolveAuthenticated();
    expect(router.getPathname()).toBe('/');
    expect(screen.getByText('home')).toBeTruthy();
  });
});
