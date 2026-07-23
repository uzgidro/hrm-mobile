import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { CHAIRMAN_TASKS, CHAIRMAN_TASK_DETAIL } from '@/api/urls';
import type { ChairmanTask } from '@/types';
import { chairmanTaskKeys } from './queries';

export interface ChairmanTaskPayload {
  title: string;
  task_date: string;
  description?: string | null;
  participants?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  color?: string | null;
  position?: number | null;
}

export function createChairmanTask(payload: ChairmanTaskPayload): Promise<ChairmanTask> {
  return apiClient.post<ChairmanTask>(CHAIRMAN_TASKS, payload).then((r) => r.data);
}

export function updateChairmanTask(id: number, payload: Partial<ChairmanTaskPayload>): Promise<ChairmanTask> {
  return apiClient.patch<ChairmanTask>(CHAIRMAN_TASK_DETAIL(id), payload).then((r) => r.data);
}

export function deleteChairmanTask(id: number): Promise<void> {
  return apiClient.delete(CHAIRMAN_TASK_DETAIL(id)).then(() => undefined);
}

export function useCreateChairmanTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChairmanTaskPayload) => createChairmanTask(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: chairmanTaskKeys.all }),
  });
}

export function useUpdateChairmanTask(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ChairmanTaskPayload>) => updateChairmanTask(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: chairmanTaskKeys.all }),
  });
}

export function useDeleteChairmanTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChairmanTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: chairmanTaskKeys.all }),
  });
}
