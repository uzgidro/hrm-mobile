import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { KPI_MY_SCORECARD, KPI_ENTRY_DETAIL } from '@/api/urls';
import type { KpiScorecard, KpiEntry } from '@/types';

// Hierarchical query keys — invalidating `kpiKeys.all` refreshes the scorecard
// (any period) and any open entry detail (prefix match). Same per-feature
// queryOptions pattern as `visitors`.
export const kpiKeys = {
  all: ['kpi'] as const,
  scorecard: (period: string) => [...kpiKeys.all, 'scorecard', period] as const,
  entry: (id: number) => [...kpiKeys.all, 'entry', id] as const,
};

// The caller's own scorecard. `employee_id` is deliberately OMITTED — the
// backend defaults to the current user (and 404s on someone else's card unless
// the caller is their supervisor/HR). Empty period = the current month; the
// envelope is flat (no pagination). The gauge percent inside is
// backend-computed — never recompute it client-side.
export function myScorecardQuery(period: string = '') {
  return queryOptions({
    queryKey: kpiKeys.scorecard(period),
    queryFn: () =>
      apiClient
        .get<KpiScorecard>(KPI_MY_SCORECARD, { params: period ? { period } : {} })
        .then((r) => r.data),
    // Switching the period chip changes the key; keep showing the previous
    // month's card while the new one loads instead of collapsing the whole
    // screen (profile + chips) into a spinner.
    placeholderData: keepPreviousData,
  });
}

export function kpiEntryQuery(id: number) {
  return queryOptions({
    queryKey: kpiKeys.entry(id),
    queryFn: () => apiClient.get<KpiEntry>(KPI_ENTRY_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Task statuses change externally (supervisor confirms/rejects) — always
    // revalidate on open so stale action buttons aren't shown.
    refetchOnMount: 'always',
  });
}
