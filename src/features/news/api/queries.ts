import { queryOptions } from '@tanstack/react-query';
import { pagedListOptions } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { NEWS_POSTS, NEWS_POST_DETAIL, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { NewsPost } from '@/types';

interface NewsBranchOption {
  id: number;
  name: string;
}

// Hierarchical query keys — invalidating `newsKeys.all` refreshes both the list
// and any open detail (prefix match). This is the per-feature queryOptions
// pattern (TkDodo): key + queryFn colocated so screens, prefetch and
// invalidation all reference one source of truth.
export const newsKeys = {
  all: ['news'] as const,
  list: (orgBranchId?: number, search?: string) =>
    [...newsKeys.all, 'list', orgBranchId ?? null, search ?? null] as const,
  detail: (id: number) => [...newsKeys.all, 'detail', id] as const,
};

// Server-paged (30) with server search over title/description (backend
// `apply_search`, folded) — web v1 searched the same two columns in JS; the
// mobile list had no search at all.
export function newsListQuery(orgBranchId?: number, search?: string) {
  return pagedListOptions<NewsPost>({
    queryKey: newsKeys.list(orgBranchId, search?.trim() || undefined),
    url: NEWS_POSTS,
    params: { organization_branch_id: orgBranchId, search: search?.trim() || undefined },
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

// One post — the edit form's prefill (`NewsPostRead`, same shape as a list row).
export function newsDetailQuery(id: number) {
  return queryOptions({
    queryKey: newsKeys.detail(id),
    queryFn: () => apiClient.get<NewsPost>(NEWS_POST_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
  });
}
