import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { invalidateAfterAction, invalidateAfterDelete } from '@/lib/invalidateAfterAction';
import { WORK_LEAVES, WORK_LEAVE_SIGN, WORK_LEAVE_REJECT, WORK_LEAVE_DETAIL, WORK_LEAVE_REOPEN } from '@/api/urls';
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

/** Put a decided (signed / rejected) request back to pending — v2 `reopen`. */
export function reopenLeave(id: number, reason: string): Promise<unknown> {
  return apiClient.post(WORK_LEAVE_REOPEN(id), { reason }).then((r) => r.data);
}

/**
 * After a delete: the record's own detail query is cancelled and dropped
 * BEFORE the lists refresh — otherwise the prefix invalidation refetched the
 * still-open detail, got 404 and toasted «Work leave not found» (QA 2026-10-05).
 */
export function afterLeaveDeleted(qc: QueryClient, id: number): Promise<void> {
  return invalidateAfterDelete(qc, [leaveKeys.detail(id)], leaveKeys.all);
}

// ── Mutation hooks ──────────────────────────────────────────────────────────
// Because every list (mine / team / branch) and the detail live under
// `leaveKeys.all`, this ONE invalidate refreshes all of them via the
// hierarchical key — replacing the four manual invalidations the old detail
// screen did by hand.
//
// Every hook here has ONE caller that toasts its own error with a
// leave-specific fallback, so the global MutationCache toast is switched off
// (`skipErrorToast`) — otherwise one failure would show two toasts.
export function useSignLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    meta: { skipErrorToast: true },
    mutationFn: () => signLeave(id),
    onSuccess: () => invalidateAfterAction(qc, leaveKeys.all),
  });
}

export function useRejectLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    meta: { skipErrorToast: true },
    mutationFn: (reason: string) => rejectLeave(id, reason),
    onSuccess: () => invalidateAfterAction(qc, leaveKeys.all),
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    meta: { skipErrorToast: true },
    mutationFn: createLeave,
    onSuccess: () => invalidateAfterAction(qc, leaveKeys.all),
  });
}

export function useDeleteLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    meta: { skipErrorToast: true },
    mutationFn: () => deleteLeave(id),
    onSuccess: () => afterLeaveDeleted(qc, id),
  });
}

export function useReopenLeave(id: number) {
  const qc = useQueryClient();
  return useMutation({
    meta: { skipErrorToast: true },
    mutationFn: (reason: string) => reopenLeave(id, reason),
    onSuccess: () => invalidateAfterAction(qc, leaveKeys.all),
  });
}
