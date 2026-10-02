// Vaqtinchalik buyruq mutatsiyalari — sof request funksiyalari + yupqa hook'lar.
// Buyruq tabelni o'zgartiradi — davomat keshlari ham yangilanadi (v2 `done`).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_LEAVES_HR_CREATE, WORK_LEAVE_DETAIL } from '@/api/urls';
import { tempOrderKeys } from './queries';

export const createTempOrder = (body: Record<string, unknown>) => apiClient.post(WORK_LEAVES_HR_CREATE, body).then((r) => r.data);
export const updateTempOrder = (id: number, body: Record<string, unknown>) =>
  apiClient.patch(WORK_LEAVE_DETAIL(id), body).then((r) => r.data);
export const deleteTempOrder = (id: number) => apiClient.delete(WORK_LEAVE_DETAIL(id)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: tempOrderKeys.all });
    void qc.invalidateQueries({ queryKey: ['attendance'] });
    void qc.invalidateQueries({ queryKey: ['timesheet'] });
  };
}

export function useSaveTempOrder() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) =>
      id == null ? createTempOrder(body) : updateTempOrder(id, body),
    onSuccess,
  });
}

export function useDeleteTempOrder() {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: (id: number) => deleteTempOrder(id), onSuccess });
}
