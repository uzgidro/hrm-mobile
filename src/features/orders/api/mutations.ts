import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  ORDER_ACTS,
  ORDER_ACT_DOCUMENTS,
  ORDER_ACT_DECREE_APPROVE,
  ORDER_ACT_DECREE_REJECT,
  ORDER_ACT_DECREE_RESUBMIT,
  ORDER_ACT_DECREE_FORWARD,
  ORDER_ACT_DECREE_REGISTER,
  ORDER_ACT_DECREE_ACKNOWLEDGE,
} from '@/api/urls';
import type { PickedFile } from '@/components/AttachmentField';
import { orderKeys } from './queries';

// ── Decree workflow request functions (pure; unit-testable without React) ─────
// Each is the exact POST + body the old order-detail runAction closures issued.

export function approveDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_APPROVE(id), {}).then((r) => r.data);
}

export function rejectDecree(id: number, comment: string): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_REJECT(id), { comment }).then((r) => r.data);
}

export function resubmitDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_RESUBMIT(id)).then((r) => r.data);
}

export function forwardDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_FORWARD(id)).then((r) => r.data);
}

export function acknowledgeDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_ACKNOWLEDGE(id)).then((r) => r.data);
}

// act_number is optional: an empty input sends `{}` (backend auto-assigns).
export function registerDecree(id: number, actNumber?: number): Promise<unknown> {
  return apiClient
    .post(ORDER_ACT_DECREE_REGISTER(id), actNumber != null ? { act_number: actNumber } : {})
    .then((r) => r.data);
}

// ── Create ────────────────────────────────────────────────────────────────────
export interface CreateOrderPayload {
  category_id: number;
  summary: string | null;
  description: string;
  submitter_id: number | null;
  familiarizer_department_ids: number[];
  assigned_signers: { employee_id: number; signer_type: string; can_edit_document: boolean }[];
  organization_branch_id: number;
}

// Creates the order-act, then (best-effort) uploads any attached files as
// multipart to the documents endpoint. Returns the new order id. The optional
// `onFilesError` lets the caller surface the exact "saqlandi, lekin fayllar
// yuklanmadi" note the old screen showed while still resolving successfully —
// preserving the original behavior where a failed upload does NOT fail create.
export async function createOrder(
  payload: CreateOrderPayload,
  files: PickedFile[] = [],
  onFilesError?: () => void
): Promise<number> {
  const res = await apiClient.post(ORDER_ACTS, payload);
  const orderId = res.data.id;
  if (files.length) {
    const fd = new FormData();
    files.forEach((f) =>
      fd.append('files', {
        uri: f.uri,
        name: f.name,
        type: f.mimeType || 'application/octet-stream',
      } as unknown as Blob)
    );
    try {
      await apiClient.post(ORDER_ACT_DOCUMENTS(orderId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch {
      onFilesError?.();
    }
  }
  return orderId;
}

// ── Thin mutation hooks ───────────────────────────────────────────────────────
// Each invalidates the whole order subtree on success (one call refreshes the
// list and any open detail via the hierarchical key). The decree detail screen
// uses `useDecreeActions` instead of these for its busy/Alert orchestration;
// these remain available for callers that only need fire-and-invalidate.

export function useApproveDecree(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => approveDecree(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useRejectDecree(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => rejectDecree(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useResubmitDecree(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resubmitDecree(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useForwardDecree(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => forwardDecree(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useAcknowledgeDecree(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => acknowledgeDecree(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useRegisterDecree(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actNumber?: number) => registerDecree(id, actNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { payload: CreateOrderPayload; files?: PickedFile[]; onFilesError?: () => void }) =>
      createOrder(args.payload, args.files, args.onFilesError),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
