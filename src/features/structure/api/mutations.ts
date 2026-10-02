import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  DEPARTMENT,
  DEPARTMENT_CLOSE,
  DEPARTMENT_REOPEN,
  DEPARTMENTS_LIST,
  JOB_POSITION,
  JOB_POSITIONS_LIST,
} from '@/api/urls';
import { structureKeys } from './queries';

type Body = Record<string, unknown>;

export const saveDepartment = (id: number | null, body: Body) =>
  (id == null ? apiClient.post(DEPARTMENTS_LIST, body) : apiClient.patch(DEPARTMENT(id), body)).then((r) => r.data);
export const savePosition = (id: number | null, body: Body) =>
  (id == null ? apiClient.post(JOB_POSITIONS_LIST, body) : apiClient.patch(JOB_POSITION(id), body)).then((r) => r.data);
/** Qisqartirish — o'chirish EMAS. `reason` serverda `Body(embed=True)`: obyekt ichida. */
export const closeDepartment = (id: number, reason?: string) =>
  apiClient.post(DEPARTMENT_CLOSE(id), { reason: reason?.trim() || null }).then((r) => r.data);
export const reopenDepartment = (id: number) => apiClient.post(DEPARTMENT_REOPEN(id), {}).then((r) => r.data);

/**
 * Tuzilma ro'yxatlari + tanlov katalogi (`['departments', …]`, `['job-positions', …]`
 * — `src/utils/employees.ts`) birga yangilanadi: aks holda yangi bo'lim boshqa
 * formalardagi tanlagichda 10 daqiqa ko'rinmasdi (v2 R4 o'lchovi).
 */
function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [structureKeys.all, ['departments'], ['job-positions']].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
}

const meta = { skipErrorToast: true };

export function useSaveDepartment() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: ({ id, body }: { id: number | null; body: Body }) => saveDepartment(id, body), onSuccess });
}
export function useSavePosition() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: ({ id, body }: { id: number | null; body: Body }) => savePosition(id, body), onSuccess });
}
export function useCloseDepartment() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: ({ id, reason }: { id: number; reason?: string }) => closeDepartment(id, reason), onSuccess });
}
export function useReopenDepartment() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: reopenDepartment, onSuccess });
}
