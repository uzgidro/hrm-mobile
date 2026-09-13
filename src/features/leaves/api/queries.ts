import { queryOptions } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { pagedListOptions, cleanParams, type ListParams } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { WORK_LEAVES, WORK_LEAVE_DETAIL } from '@/api/urls';
import { employeesListQuery } from '@/utils/employees';
import { workLeaveAllScopeParams } from '@/utils/workLeaveScope';
import type { User, WorkLeave } from '@/types';

// Hierarchical query keys — `all` is a strict prefix of every list and detail
// key, so invalidating `leaveKeys.all` refreshes all three lists (mine /
// assigned / team) AND any open detail in one call (prefix match). This is the
// per-feature queryOptions pattern (TkDodo): key + queryFn colocated so
// screens, prefetch and invalidation all reference one source of truth.
export const leaveKeys = {
  all: ['work-leaves'] as const,
  list: (scope: 'mine' | 'assigned' | 'team', employeeId?: number) =>
    [...leaveKeys.all, 'list', scope, employeeId ?? null] as const,
  detail: (id: number) => [...leaveKeys.all, 'detail', id] as const,
};

// ── Server-paged lists (30 rows, infinite scroll) ─────────────────────────────
// WHY (audit 2026-09-13): the three lists asked for ONE page of 100/200 rows,
// threw the envelope's `total` away and then filtered/searched in JS — so an
// older request could never be found and HR's team list silently ended at
// 200. Every chip is now a server param (`workLeavesServerParams`).
export type LeaveStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
export type IncomingFilter = 'all' | 'action' | 'approved' | 'rejected';

export interface LeavesListParams {
  scope: 'mine' | 'assigned' | 'team';
  employeeId?: number;
  status?: LeaveStatusFilter | IncomingFilter;
  search?: string;
  /** Team list: `YYYY-MM` — overlap window, i.e. leaves touching that month. */
  month?: string;
  /** Team list role scope (`workLeaveAllScopeParams`). */
  user?: User | null;
  branchId?: number | null;
}

/**
 * • status chips → backend `status` GROUPS (`pending` = pending+yuborildi,
 *   `approved` = approved+signed+tasdiqlangan, `rejected` = rejected+rad_etilgan
 *   — `services/work_leave.py::_STATUS_GROUPS`, the same grouping
 *   `leaveStatusGroup` does in JS).
 * • incoming "action" = pending AND I have not signed yet →
 *   `status=pending&signer=false`; "approved" = ones I already signed →
 *   `signer=true` (the old JS rule was `approved || alreadySigned`).
 * • month → `date_from/date_to` (backend overlap: end ≥ from AND start ≤ to).
 * • search → name / type / description (backend 2026-09-13).
 */
export function workLeavesServerParams(p: LeavesListParams): ListParams {
  const out: ListParams = { search: p.search?.trim() || undefined };
  if (p.scope === 'mine') {
    out.employee_id = p.employeeId;
    out.status = p.status === 'all' ? undefined : p.status;
  } else if (p.scope === 'assigned') {
    out.assigned_signer = true;
    if (p.status === 'action') { out.status = 'pending'; out.signer = false; }
    else if (p.status === 'approved') out.signer = true;
    else if (p.status === 'rejected') out.status = 'rejected';
  } else {
    const scope = workLeaveAllScopeParams(p.user, p.branchId);
    for (const [k, v] of Object.entries(scope)) {
      // `department_ids` is an array — serialised as repeated keys by the client.
      out[k] = v as ListParams[string];
    }
    out.status = p.status === 'all' ? undefined : p.status;
    if (p.month) {
      const start = dayjs(`${p.month}-01`);
      out.date_from = start.format('YYYY-MM-DD');
      out.date_to = start.endOf('month').format('YYYY-MM-DD');
    }
  }
  return out;
}

export function leavesListQuery(params: LeavesListParams) {
  return pagedListOptions<WorkLeave>({
    queryKey: [...leaveKeys.all, 'list', params.scope, cleanParams(workLeavesServerParams(params))] as const,
    url: WORK_LEAVES,
    params: workLeavesServerParams(params),
    staleTime: 30 * 1000,
    refetchInterval: params.scope === 'assigned' ? 60 * 1000 : undefined,
  });
}

// Kept for callers that only need "my leaves" as a plain array (dashboard
// prefetch / calendars); the screens use `leavesListQuery`.
export function myLeavesQuery(employeeId?: number) {
  return queryOptions({
    queryKey: leaveKeys.list('mine', employeeId),
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { employee_id: employeeId, size: 100 } })
        .then((r) => unwrapList<WorkLeave>(r.data)),
  });
}

export function leaveDetailQuery(id: number) {
  return queryOptions({
    queryKey: leaveKeys.detail(id),
    queryFn: () => apiClient.get<WorkLeave>(WORK_LEAVE_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Sign/reject changes leave status externally — always revalidate on open so
    // the approval buttons don't go stale (mirrors visitorDetailQuery).
    refetchOnMount: 'always',
  });
}

// Candidate supervisors to pick when the employee has no supervisor pre-assigned
// (web parity: RequestPermissionDrawer loads employees only then). Reuses the
// SHARED roster helper + key so the cache is shared with the employees/team
// screens — do NOT fork this into a leaves-specific key. `enabled` lets the
// screen load it only when a pick is actually needed.
export function leaveSupervisorsQuery(orgBranchId?: number, enabled = true) {
  return queryOptions({
    ...employeesListQuery(orgBranchId),
    enabled,
  });
}
