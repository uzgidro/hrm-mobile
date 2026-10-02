import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { STAFF_POSITION, STAFF_POSITION_CLOSE, STAFF_POSITION_REOPEN, STAFF_POSITIONS } from '@/api/urls';
import { staffKeys } from './queries';

type Body = Record<string, unknown>;

export const saveStaffRow = (id: number | null, body: Body) =>
  (id == null ? apiClient.post(STAFF_POSITIONS, body) : apiClient.patch(STAFF_POSITION(id), body)).then((r) => r.data);
/** v2: yopish/qayta ochish — tana yo'q, `reason` query param. */
export const closeStaffRow = (id: number) => apiClient.post(STAFF_POSITION_CLOSE(id), null).then((r) => r.data);
export const reopenStaffRow = (id: number) => apiClient.post(STAFF_POSITION_REOPEN(id), null).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: staffKeys.all });
}

const meta = { skipErrorToast: true };

export function useSaveStaffRow() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number | null; body: Body }) => saveStaffRow(id, body),
    onSuccess,
  });
}
export function useToggleStaffRow() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, closed }: { id: number; closed: boolean }) => (closed ? reopenStaffRow(id) : closeStaffRow(id)),
    onSuccess,
  });
}
