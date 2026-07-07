import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NEWS_POSTS } from '@/api/urls';
import type { NewsPost } from '@/types';

// Hierarchical query keys — invalidating `newsKeys.all` refreshes both the list
// and any open detail (prefix match). This is the per-feature queryOptions
// pattern (TkDodo): key + queryFn colocated so screens, prefetch and
// invalidation all reference one source of truth.
export const newsKeys = {
  all: ['news'] as const,
  list: (orgBranchId?: number) => [...newsKeys.all, 'list', orgBranchId ?? null] as const,
  detail: (id: number) => [...newsKeys.all, 'detail', id] as const,
};

export function newsListQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: newsKeys.list(orgBranchId),
    queryFn: () =>
      apiClient
        .get(NEWS_POSTS, {
          params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
        })
        .then((r) => {
          const d = r.data;
          // The API returns either a bare array or a { items } envelope.
          return (Array.isArray(d) ? d : (d?.items ?? [])) as NewsPost[];
        }),
  });
}
