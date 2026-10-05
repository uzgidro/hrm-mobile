// Holds the root navigator back until startup auth resolution has settled
// (`authStore.isLoading` false — useAuthBootstrap seeds the cached user or
// finishes resolveBootstrap()). This is what keeps deep links alive with the
// DECLARATIVE guards: if the <Stack> mounted while isAuthenticated was still
// false, `<Stack.Protected guard={isAuthenticated}>` would exclude the URL's
// screen on the first render, expo-router would drop it, and the later guard
// flip would land on the (tabs) anchor ("/") instead of /zoom, /hisobotlar,
// /documents?seg=letters… Mounting once, with the guard already right, lets the
// navigator consume the initial URL state as-is. No imperative navigation.
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';

export function AuthResolvedGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isLoading = useAuthStore((s) => s.isLoading);
  return <>{isLoading ? fallback : children}</>;
}
