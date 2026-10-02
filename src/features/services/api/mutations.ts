import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { SERVICE_REQUESTS, SERVICE_REQUEST_CANCEL, SERVICE_REQUEST_STATUS } from '@/api/urls';
import { serviceKeys } from './queries';
import type { ServiceStatus } from '../utils/services';

export const createServiceRequest = (body: Record<string, unknown>) =>
  apiClient.post(SERVICE_REQUESTS, body).then((r) => r.data);
export const cancelServiceRequest = (id: number, comment?: string) =>
  apiClient.post(SERVICE_REQUEST_CANCEL(id), { comment: comment?.trim() || null }).then((r) => r.data);
export const changeServiceStatus = (id: number, toStatus: ServiceStatus, comment?: string) =>
  apiClient
    .post(SERVICE_REQUEST_STATUS(id), { to_status: toStatus, comment: comment?.trim() || null })
    .then((r) => r.data);

const meta = { skipErrorToast: true };

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: serviceKeys.all });
}

export function useCreateServiceRequest() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: createServiceRequest, onSuccess });
}
export function useCancelServiceRequest() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, comment }: { id: number; comment?: string }) => cancelServiceRequest(id, comment),
    onSuccess,
  });
}
export function useChangeServiceStatus() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, to, comment }: { id: number; to: ServiceStatus; comment?: string }) =>
      changeServiceStatus(id, to, comment),
    onSuccess,
  });
}
