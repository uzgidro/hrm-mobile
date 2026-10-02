import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { INSPECTION, INSPECTIONS } from '@/api/urls';
import { inspectionKeys } from './queries';

type Body = Record<string, unknown>;

export const createInspection = (body: Body) => apiClient.post(INSPECTIONS, body).then((r) => r.data);
export const startInspection = (id: number) => apiClient.post(`${INSPECTION(id)}/start`, {}).then((r) => r.data);
export const completeInspection = (id: number, conclusion?: string) =>
  apiClient.post(`${INSPECTION(id)}/complete`, { conclusion: conclusion?.trim() || null }).then((r) => r.data);
/** `reason` (cancel_reason EMAS) va MAJBURIY — avvalgi `cancel_reason: null` 422 berardi. */
export const cancelInspection = (id: number, reason: string) =>
  apiClient.post(`${INSPECTION(id)}/cancel`, { reason: reason.trim() }).then((r) => r.data);
export const addFinding = (id: number, body: Body) =>
  apiClient.post(`${INSPECTION(id)}/findings`, body).then((r) => r.data);
export const resolveFinding = (id: number, findingId: number, note?: string) =>
  apiClient
    .patch(`${INSPECTION(id)}/findings/${findingId}`, { status: 'resolved', resolution_note: note?.trim() || null })
    .then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: inspectionKeys.all });
}

const meta = { skipErrorToast: true };

export function useCreateInspection() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: createInspection, onSuccess });
}
export function useStartInspection() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: startInspection, onSuccess });
}
export function useCompleteInspection() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, conclusion }: { id: number; conclusion?: string }) => completeInspection(id, conclusion),
    onSuccess,
  });
}
export function useCancelInspection() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelInspection(id, reason),
    onSuccess,
  });
}
export function useAddFinding() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number; body: Body }) => addFinding(id, body),
    onSuccess,
  });
}
export function useResolveFinding() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, findingId, note }: { id: number; findingId: number; note?: string }) =>
      resolveFinding(id, findingId, note),
    onSuccess,
  });
}
