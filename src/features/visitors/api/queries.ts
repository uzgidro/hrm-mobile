import { queryOptions } from '@tanstack/react-query';
import { pagedListOptions } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL } from '@/api/urls';
import type { Visitor } from '@/types';

// Hierarchical query keys — invalidating `visitorKeys.all` refreshes both the
// list and any open detail (prefix match). This is the per-feature queryOptions
// pattern (TkDodo): key + queryFn colocated so screens, prefetch and
// invalidation all reference one source of truth.
export const visitorKeys = {
  all: ['visitors'] as const,
  list: (orgBranchId?: number, search?: string) =>
    [...visitorKeys.all, 'list', orgBranchId ?? null, search ?? null] as const,
  detail: (id: number) => [...visitorKeys.all, 'detail', id] as const,
};

// Read a single visitor (used by the detail query and the edit-form prefill).
export function getVisitor(id: number): Promise<Visitor> {
  return apiClient.get<Visitor>(VISITOR_DETAIL(id)).then((r) => r.data);
}

// Server-paged (30 rows), search on the server: name, organisation and host
// employee name (backend 2026-09-13) — the same three columns the card shows
// and the old JS filter matched, now with Cyrillic/Latin folding.
export function visitorsListQuery(orgBranchId?: number, search?: string) {
  return pagedListOptions<Visitor>({
    queryKey: visitorKeys.list(orgBranchId, search?.trim() || undefined),
    url: VISITORS_LIST,
    params: { organization_branch_id: orgBranchId, search: search?.trim() || undefined },
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
