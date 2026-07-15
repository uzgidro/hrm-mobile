import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { getApiErrorMessage } from '../api/errors';
import i18n from '@/i18n';
import { toast } from './toast';

// Global React Query defaults. The app previously used `new QueryClient()` with
// no defaults, so every query had staleTime=0 and refetched on every screen
// mount/focus. A 60s default cuts that churn while screens that need fresher
// data (notifications, assigned-leaves) still override with their own staleTime.
export const DEFAULT_QUERY_STALE_TIME = 60 * 1000; // 60s
export const DEFAULT_QUERY_GC_TIME = 10 * 60 * 1000; // 10min

// A query/mutation can set `meta: { skipErrorToast: true }` to opt out of the
// automatic toast (e.g. a screen that already renders an inline ErrorState, or
// a mutation that shows its own Alert). Kept loose to avoid a module-level type
// augmentation.
function metaSaysSkip(meta: unknown): boolean {
  return !!(meta && typeof meta === 'object' && (meta as Record<string, unknown>).skipErrorToast);
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    // Background query failures (a refetch of data already on screen) surface as
    // a toast — the stale data stays visible. The FIRST load of an errored query
    // is left to the screen's own ErrorState, so we only toast when the query
    // already has cached data (i.e. this was a background refetch).
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (metaSaysSkip(query.meta)) return;
        if (query.state.data === undefined) return; // initial load → screen owns it
        toast.error(getApiErrorMessage(error, i18n.t('errors.refreshFailed')));
      },
    }),
    // Mutations are user-initiated actions, so every failure gets a toast unless
    // the caller opts out (some screens still show their own Alert).
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (metaSaysSkip(mutation.meta)) return;
        toast.error(getApiErrorMessage(error, i18n.t('errors.actionFailed')));
      },
    }),
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
