import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { CHAIRMAN_TASKS } from '@/api/urls';
import type { ChairmanTask } from '@/types';

// Hierarchical keys. There's no detail endpoint — the list carries everything,
// so a detail view reads from the already-loaded list (web parity).
export const chairmanTaskKeys = {
  all: ['chairman-tasks'] as const,
  list: (from?: string, to?: string) => [...chairmanTaskKeys.all, 'list', from ?? null, to ?? null] as const,
};

// Tasks in a date window (a month, usually). from/to are YYYY-MM-DD and optional.
export function chairmanTasksListQuery(from?: string, to?: string) {
  return queryOptions({
    queryKey: chairmanTaskKeys.list(from, to),
    queryFn: () =>
      apiClient
        .get(CHAIRMAN_TASKS, { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } })
        .then((r) => {
          const d = r.data;
          return (Array.isArray(d) ? d : (d?.items ?? [])) as ChairmanTask[];
        }),
    refetchOnMount: 'always',
  });
}
