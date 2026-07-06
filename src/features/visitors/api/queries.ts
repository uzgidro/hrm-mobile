import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL } from '@/api/urls';
import type { Visitor } from '@/types';

// Hierarchical query keys — invalidating `visitorKeys.all` refreshes both the
// list and any open detail (prefix match). This is the per-feature queryOptions
// pattern (TkDodo): key + queryFn colocated so screens, prefetch and
// invalidation all reference one source of truth.
export const visitorKeys = {
  all: ['visitors'] as const,
  list: (orgBranchId?: number) => [...visitorKeys.all, 'list', orgBranchId ?? null] as const,
  detail: (id: number) => [...visitorKeys.all, 'detail', id] as const,
};

// Read a single visitor (used by the detail query and the edit-form prefill).
export function getVisitor(id: number): Promise<Visitor> {
  return apiClient.get<Visitor>(VISITOR_DETAIL(id)).then((r) => r.data);
}

export function visitorsListQuery(orgBranchId?: number) {
  return queryOptions({
    queryKey: visitorKeys.list(orgBranchId),
    queryFn: () =>
      apiClient
        .get(VISITORS_LIST, {
          params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
        })
        .then((r) => {
          const d = r.data;
          // The API returns either a bare array or a { items } envelope.
          return (Array.isArray(d) ? d : (d?.items ?? [])) as Visitor[];
        }),
  });
}

export function visitorDetailQuery(id: number) {
  return queryOptions({
    queryKey: visitorKeys.detail(id),
    queryFn: () => getVisitor(id),
    enabled: !!id,
    // Visitor status (active/checked-out) can change externally — always
    // revalidate on open so stale action buttons aren't shown.
    refetchOnMount: 'always',
  });
}
