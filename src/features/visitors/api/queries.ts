import { queryOptions } from '@tanstack/react-query';
import { pagedListOptions } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL, VISITORS_SUMMARY } from '@/api/urls';
import type { Visitor } from '@/types';

// Hierarchical query keys — invalidating `visitorKeys.all` refreshes both the
// list and any open detail (prefix match). This is the per-feature queryOptions
// pattern (TkDodo): key + queryFn colocated so screens, prefetch and
// invalidation all reference one source of truth.
export const visitorKeys = {
  all: ['visitors'] as const,
  list: (orgBranchId?: number, search?: string, filter: VisitorFilter = 'all') =>
    [...visitorKeys.all, 'list', orgBranchId ?? null, search ?? null, filter] as const,
  summary: (orgBranchId?: number, search?: string) =>
    [...visitorKeys.all, 'summary', orgBranchId ?? null, search ?? null] as const,
  detail: (id: number) => [...visitorKeys.all, 'detail', id] as const,
};

// Web v2 GuestsPage: the stat tiles double as filters, all run on the SERVER
// (backend 2026-09-25: `is_active`, `visit=today|yesterday|never`).
export type VisitorFilter = 'all' | 'active' | 'today' | 'yesterday' | 'never';

export function visitorFilterParams(filter: VisitorFilter): { is_active?: boolean; visit?: string } {
  if (filter === 'active') return { is_active: true };
  if (filter === 'today' || filter === 'yesterday' || filter === 'never') return { visit: filter };
  return {};
}

export type VisitorSummary = { total: number; active: number; today: number; never: number };

// Read a single visitor (used by the detail query and the edit-form prefill).
export function getVisitor(id: number): Promise<Visitor> {
  return apiClient.get<Visitor>(VISITOR_DETAIL(id)).then((r) => r.data);
}

// Server-paged (30 rows), search on the server: name, organisation and host
// employee name (backend 2026-09-13) — the same three columns the card shows
// and the old JS filter matched, now with Cyrillic/Latin folding.
export function visitorsListQuery(orgBranchId?: number, search?: string, filter: VisitorFilter = 'all') {
  return pagedListOptions<Visitor>({
    queryKey: visitorKeys.list(orgBranchId, search?.trim() || undefined, filter),
    url: VISITORS_LIST,
    params: { organization_branch_id: orgBranchId, search: search?.trim() || undefined, ...visitorFilterParams(filter) },
  });
}

/** `{ total, active, today, never }` for the stat tiles — same scope and search as the list. */
export function visitorsSummaryQuery(orgBranchId?: number, search?: string) {
  const q = search?.trim() || undefined;
  return queryOptions({
    queryKey: visitorKeys.summary(orgBranchId, q),
    queryFn: () =>
      apiClient
        .get<VisitorSummary>(VISITORS_SUMMARY, { params: { organization_branch_id: orgBranchId, search: q } })
        .then((r) => r.data),
    staleTime: 30_000,
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
