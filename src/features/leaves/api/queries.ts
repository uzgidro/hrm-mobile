import { queryOptions } from '@tanstack/react-query';
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

// My own leave requests.
export function myLeavesQuery(employeeId?: number) {
  return queryOptions({
    queryKey: leaveKeys.list('mine', employeeId),
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { employee_id: employeeId, size: 100 } })
        .then((r) => unwrapList<WorkLeave>(r.data)),
  });
}

// Leaves assigned to me to sign.
export function assignedLeavesQuery(employeeId?: number) {
  return queryOptions({
    queryKey: leaveKeys.list('assigned', employeeId),
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { assigned_signer: true, size: 200 } })
        .then((r) => unwrapList<WorkLeave>(r.data)),
  });
}

// Team / "all" leaves — ROLE-SCOPED. `workLeaveAllScopeParams` sends the same
// narrowing the web does (assigned_signer / department_ids / branch), so a
// regular employee only sees requests assigned to them to sign. The backend
// enforces the same bound server-side since `6cd1fe3`, so this is now about
// showing the right queue rather than being the only thing preventing a leak.
export function teamLeavesQuery(user?: User | null, branchId?: number | null) {
  const scope = workLeaveAllScopeParams(user, branchId);
  return queryOptions({
    queryKey: [...leaveKeys.list('team'), branchId ?? null, scope] as const,
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { ...scope, size: 200 } })
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
