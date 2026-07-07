import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_LEAVES, WORK_LEAVE_DETAIL } from '@/api/urls';
import type { WorkLeave } from '@/types';

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

// The list endpoint returns either a bare array or a { items } envelope.
function unwrapList(data: unknown): WorkLeave[] {
  return (Array.isArray(data) ? data : ((data as { items?: WorkLeave[] })?.items ?? [])) as WorkLeave[];
}

// My own leave requests.
export function myLeavesQuery(employeeId?: number) {
  return queryOptions({
    queryKey: leaveKeys.list('mine', employeeId),
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { employee_id: employeeId, size: 100 } })
        .then((r) => unwrapList(r.data)),
  });
}

// Leaves assigned to me to sign.
export function assignedLeavesQuery(employeeId?: number) {
  return queryOptions({
    queryKey: leaveKeys.list('assigned', employeeId),
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { assigned_signer: true, size: 200 } })
        .then((r) => unwrapList(r.data)),
  });
}

// All team leaves.
export function teamLeavesQuery() {
  return queryOptions({
    queryKey: leaveKeys.list('team'),
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { size: 200 } })
        .then((r) => unwrapList(r.data)),
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
