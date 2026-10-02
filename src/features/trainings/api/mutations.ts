import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { TRAINING, TRAININGS } from '@/api/urls';
import { trainingKeys } from './queries';

type Body = Record<string, unknown>;

export const saveTraining = (id: number | null, body: Body) =>
  (id == null ? apiClient.post(TRAININGS, body) : apiClient.patch(TRAINING(id), body)).then((r) => r.data);
export const deleteTraining = (id: number) => apiClient.delete(TRAINING(id)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: trainingKeys.all });
}

const meta = { skipErrorToast: true };

export function useSaveTraining() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number | null; body: Body }) => saveTraining(id, body),
    onSuccess,
  });
}
export function useDeleteTraining() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteTraining, onSuccess });
}
