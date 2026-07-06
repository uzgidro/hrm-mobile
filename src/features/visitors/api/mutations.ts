import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { VISITORS_LIST, VISITOR_DETAIL, EMPLOYEE_VALIDATE_PHOTO } from '@/api/urls';
import type { Visitor } from '@/types';
import { visitorKeys } from './queries';

export interface VisitorPayload {
  legal_name: string;
  organization_name?: string;
  job_position?: string;
  telegram_username?: string;
  phone_number?: string;
  valid_from?: string;
  valid_until?: string;
  organization_branch_id?: number;
  photo_base64?: string;
}

// ── Request functions (pure data access; unit-testable without React) ────────
export function createVisitor(payload: VisitorPayload): Promise<Visitor> {
  return apiClient.post<Visitor>(VISITORS_LIST, payload).then((r) => r.data);
}

export function updateVisitor(id: number, payload: VisitorPayload): Promise<Visitor> {
  return apiClient.patch<Visitor>(VISITOR_DETAIL(id), payload).then((r) => r.data);
}

export function deleteVisitor(id: number): Promise<void> {
  return apiClient.delete(VISITOR_DETAIL(id)).then(() => undefined);
}

// Best-effort terminal face-check (mirrors the web guest form).
export async function validateVisitorPhoto(
  base64: string
): Promise<{ accepted: boolean; message?: string }> {
  const { data } = await apiClient.post(EMPLOYEE_VALIDATE_PHOTO, { photo_base64: base64 });
  return { accepted: data?.accepted !== false, message: data?.message };
}

// ── Mutation hooks ──────────────────────────────────────────────────────────
// Each invalidates the whole visitors subtree on success (one call refreshes
// the list and any open detail via the hierarchical key).
export function useCreateVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createVisitor,
    onSuccess: () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
}

export function useUpdateVisitor(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VisitorPayload) => updateVisitor(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
}

export function useDeleteVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteVisitor,
    onSuccess: () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
}
