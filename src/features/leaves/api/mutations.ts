import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_LEAVES, WORK_LEAVE_SIGN, WORK_LEAVE_REJECT, WORK_LEAVE_DETAIL } from '@/api/urls';
import { leaveKeys } from './queries';

export interface CreateLeavePayload {
  type: string;
  start_date: string; // ISO
  end_date: string; // ISO
  description?: string;
  assigned_signer_ids?: number[];
}

// ── Request functions (pure data access; unit-testable without React) ────────
export function signLeave(id: number): Promise<unknown> {
  return apiClient.post(WORK_LEAVE_SIGN(id)).then((r) => r.data);
}

export function rejectLeave(id: number, reason: string): Promise<unknown> {
  return apiClient
    .post(WORK_LEAVE_REJECT(id), { rejection_reason: reason })
    .then((r) => r.data);
}

export function createLeave(payload: CreateLeavePayload): Promise<unknown> {
  return apiClient.post(WORK_LEAVES, payload).then((r) => r.data);
}

export function deleteLeave(id: number): Promise<unknown> {
  return apiClient.delete(WORK_LEAVE_DETAIL(id)).then((r) => r.data);
}

// ── Mutation hooks ──────────────────────────────────────────────────────────
// Because every list (mine / assigned / team) and the detail live under
// `leaveKeys.all`, this ONE invalidate refreshes all of them via the
// hierarchical key — replacing the four manual invalidations the old detail
// screen did by hand.
export function useSignLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => signLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useRejectLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => rejectLeave(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useDeleteLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteLeave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}
