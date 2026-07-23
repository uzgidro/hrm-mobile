import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NEWS_POSTS, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { NewsPost } from '@/types';

export interface NewsBranchOption {
  id: number;
  name: string;
}

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

// Organization branches for the news-create form's branch picker (news-manager
// only). Empty selection = the post goes to all employees (branch null).
export function newsBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: [...newsKeys.all, 'branches'] as const,
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => {
        const d = r.data;
        return (Array.isArray(d) ? d : (d?.items ?? [])) as NewsBranchOption[];
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
