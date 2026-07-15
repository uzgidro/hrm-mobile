import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { KPI_MY_SCORECARD, KPI_MY_TEAM, KPI_ENTRY_DETAIL, KPI_BONUSES } from '@/api/urls';
import type { KpiScorecard, KpiTeam, KpiEntry, KpiBonus } from '@/types';

// Hierarchical query keys — invalidating `kpiKeys.all` refreshes the scorecard
// (any period/employee), the team roster, any open entry detail and its bonuses
// (prefix match). Same per-feature queryOptions pattern as `visitors`.
export const kpiKeys = {
  all: ['kpi'] as const,
  scorecard: (period: string, employeeId?: number) =>
    [...kpiKeys.all, 'scorecard', period, employeeId ?? null] as const,
  team: (period: string) => [...kpiKeys.all, 'team', period] as const,
  entry: (id: number) => [...kpiKeys.all, 'entry', id] as const,
  bonuses: (entryId: number) => [...kpiKeys.all, 'bonuses', entryId] as const,
};

// A scorecard. Without `employeeId` = the caller's own (the backend defaults to
// the current user); a supervisor passes a subordinate's id — the backend 404s
// anyone who is neither self, direct supervisor, nor HR/master-admin. Empty
// period = the current month; the envelope is flat (no pagination). The gauge
// percent inside is backend-computed — never recompute it client-side.
export function myScorecardQuery(period: string = '', employeeId?: number) {
  return queryOptions({
    queryKey: kpiKeys.scorecard(period, employeeId),
    queryFn: () =>
      apiClient
        .get<KpiScorecard>(KPI_MY_SCORECARD, {
          params: {
            ...(period ? { period } : {}),
            ...(employeeId ? { employee_id: employeeId } : {}),
          },
        })
        .then((r) => r.data),
    // Switching the period chip changes the key; keep showing the previous
    // month's card while the new one loads instead of collapsing the whole
    // screen (profile + chips) into a spinner.
    placeholderData: keepPreviousData,
  });
}

// The supervisor's direct reports with per-member aggregates (result %, entry
// count, tasks awaiting review). Returns empty employees[] for anyone without
// subordinates — safe to call for every role.
export function myTeamQuery(period: string = '') {
  return queryOptions({
    queryKey: kpiKeys.team(period),
    queryFn: () =>
      apiClient
        .get<KpiTeam>(KPI_MY_TEAM, { params: period ? { period } : {} })
        .then((r) => r.data),
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

// Bonuses pinned to one entry (web BonusesPanel objectType="entry"). Read-only
// on mobile; `amount` stays null until the 1C payroll integration.
export function entryBonusesQuery(entryId: number) {
  return queryOptions({
    queryKey: kpiKeys.bonuses(entryId),
    queryFn: () =>
      apiClient
        .get<KpiBonus[]>(KPI_BONUSES, { params: { object_type: 'entry', object_id: entryId } })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: !!entryId,
  });
}
