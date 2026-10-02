import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { TASKS_OVERDUE } from '@/api/urls';
import { ijroKeys } from './queries';

export const saveTask = (id: number | null, body: Record<string, unknown>) =>
  (id == null ? apiClient.post(TASKS_OVERDUE, body) : apiClient.patch(`${TASKS_OVERDUE}/${id}`, body)).then((r) => r.data);
/** Bajarildi (bugungi sana) yoki qayta ochish (null) — v2 markDone / reopen. */
export const setTaskCompleted = (id: number, date: string | null) =>
  apiClient.patch(`${TASKS_OVERDUE}/${id}`, { task_completed: date }).then((r) => r.data);
export const deleteTask = (id: number) => apiClient.delete(`${TASKS_OVERDUE}/${id}`).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ijroKeys.all });
    void qc.invalidateQueries({ queryKey: ['dashboard'] }); // bosh sahifadagi «Ijro intizomi»
  };
}

export function useSaveTask() {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) => saveTask(id, body), onSuccess });
}
export function useSetTaskCompleted() {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: ({ id, date }: { id: number; date: string | null }) => setTaskCompleted(id, date), onSuccess });
}
export function useDeleteTask() {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: deleteTask, onSuccess });
}
