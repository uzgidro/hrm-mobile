// Topshiriqlar xronologiyasi — yozuvchi so'rovlar (web v2 useChronoMutations).
// Every write answers with the full task; it is written straight into the
// task cache, and the list / summary / calendar are refetched behind it.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { appendFiles, type UploadFile } from '@/api/formFile';
import { CHRONO_EXTENSION, CHRONO_STEP, TASK_CHRONOLOGY, TASK_CHRONOLOGY_ITEM } from '@/api/urls';
import type { ChronoTask, StepInput } from '../utils/chrono';
import { chronoKeys } from './queries';

export type { UploadFile as PickedFile } from '@/api/formFile';

/** Multipart body: `text`, optional extra fields, and every file under `files`. */
export async function buildForm(text: string, files: UploadFile[], extra: Record<string, string> = {}): Promise<FormData> {
  const fd = new FormData();
  fd.append('text', text);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  await appendFiles(fd, 'files', files);
  return fd;
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 };
const data = (r: { data: ChronoTask }) => r.data;

export const createTask = (body: Record<string, unknown>) => apiClient.post<ChronoTask>(TASK_CHRONOLOGY, body).then(data);
export const updateTask = (id: number, body: Record<string, unknown>) =>
  apiClient.patch<ChronoTask>(TASK_CHRONOLOGY_ITEM(id), body).then(data);
export const saveSteps = (id: number, steps: StepInput[]) =>
  apiClient.put<ChronoTask>(`${TASK_CHRONOLOGY_ITEM(id)}/steps`, { steps }).then(data);
export const deleteTask = (id: number) => apiClient.delete(TASK_CHRONOLOGY_ITEM(id)).then((r) => r.data);
export const addFiles = async (id: number, files: UploadFile[]) => {
  const fd = new FormData();
  await appendFiles(fd, 'files', files);
  return apiClient.post<ChronoTask>(`${TASK_CHRONOLOGY_ITEM(id)}/files`, fd, multipart).then(data);
};
export const comment = async (
  taskId: number,
  args: { stepId?: number | null; text: string; files: UploadFile[]; mentionIds?: number[] },
) => {
  const fd = await buildForm(args.text, args.files, {
    ...(args.stepId ? { step_id: String(args.stepId) } : {}),
    ...(args.mentionIds?.length ? { mention_ids: args.mentionIds.join(',') } : {}),
  });
  return apiClient.post<ChronoTask>(`${TASK_CHRONOLOGY_ITEM(taskId)}/comments`, fd, multipart).then(data);
};
export const submitStep = async (stepId: number, text: string, files: UploadFile[]) =>
  apiClient.post<ChronoTask>(`${CHRONO_STEP(stepId)}/submit`, await buildForm(text, files), multipart).then(data);
export const submitTask = async (taskId: number, text: string, files: UploadFile[]) =>
  apiClient.post<ChronoTask>(`${TASK_CHRONOLOGY_ITEM(taskId)}/submit`, await buildForm(text, files), multipart).then(data);

type Decision = 'approve' | 'reject' | 'reopen';
export const decideStep = (stepId: number, action: Decision, note?: string) =>
  apiClient.post<ChronoTask>(`${CHRONO_STEP(stepId)}/${action}`, { note: note || null }).then(data);
export const decideTask = (taskId: number, action: Decision, note?: string) =>
  apiClient.post<ChronoTask>(`${TASK_CHRONOLOGY_ITEM(taskId)}/${action}`, { note: note || null }).then(data);
export const requestExtension = (stepId: number, deadline: string, reason: string) =>
  apiClient.post<ChronoTask>(`${CHRONO_STEP(stepId)}/extension-requests`, { requested_deadline: deadline, reason }).then(data);
export const setDeadline = (stepId: number, deadline: string, reason: string) =>
  apiClient.post<ChronoTask>(`${CHRONO_STEP(stepId)}/deadline`, { deadline, reason }).then(data);
export const decideExtension = (extId: number, action: 'approve' | 'reject', args: { deadline?: string; note?: string }) =>
  apiClient
    .post<ChronoTask>(`${CHRONO_EXTENSION(extId)}/${action}`, { deadline: args.deadline || null, note: args.note || null })
    .then(data);

/** One mutation hook for every write: the screen passes the request, the cache is settled here. */
export function useChronoWrite() {
  const qc = useQueryClient();
  return useMutation({
    // Screens show the error themselves (inline / toast) — no double toast.
    meta: { skipErrorToast: true },
    mutationFn: (run: () => Promise<ChronoTask | unknown>) => run(),
    onSuccess: (result) => {
      const task = result as ChronoTask | undefined;
      if (task && typeof task === 'object' && 'id' in task && 'steps' in task) qc.setQueryData(chronoKeys.task(task.id), task);
      void qc.invalidateQueries({ queryKey: ['chrono', 'list'] });
      void qc.invalidateQueries({ queryKey: ['chrono', 'summary'] });
      void qc.invalidateQueries({ queryKey: ['chrono', 'calendar'] });
    },
  });
}
