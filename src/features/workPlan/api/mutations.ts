import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_PLAN, WORK_PLANS } from '@/api/urls';
import { workPlanKeys } from './queries';

type Body = Record<string, unknown>;

export const saveWorkPlan = (id: number | null, body: Body) =>
  (id == null ? apiClient.post(WORK_PLANS, body) : apiClient.patch(WORK_PLAN(id), body)).then((r) => r.data);
export const deleteWorkPlan = (id: number) => apiClient.delete(WORK_PLAN(id)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: workPlanKeys.all });
}

const meta = { skipErrorToast: true };

export function useSaveWorkPlan() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number | null; body: Body }) => saveWorkPlan(id, body),
    onSuccess,
  });
}
export function useDeleteWorkPlan() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteWorkPlan, onSuccess });
}
