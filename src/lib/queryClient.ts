import { QueryClient } from '@tanstack/react-query';

// Global React Query defaults. The app previously used `new QueryClient()` with
// no defaults, so every query had staleTime=0 and refetched on every screen
// mount/focus. A 60s default cuts that churn while screens that need fresher
// data (notifications, assigned-leaves) still override with their own staleTime.
export const DEFAULT_QUERY_STALE_TIME = 60 * 1000; // 60s
export const DEFAULT_QUERY_GC_TIME = 10 * 60 * 1000; // 10min

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_QUERY_STALE_TIME,
        gcTime: DEFAULT_QUERY_GC_TIME,
        // Retries only affect error paths (no happy-path cost). Keep a couple so
        // a transient blip doesn't blank a whole screen (e.g. the roster fetch,
        // which fails hard if any page errors).
        retry: 2,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
