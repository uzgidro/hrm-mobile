import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  KPI_TASKS, KPI_TASK_DETAIL, KPI_TASK_SET_STATUS, KPI_TASK_SET_GRADE,
} from '@/api/urls';
import type { KpiTask } from '@/types';
import { kpiKeys } from './queries';

// ── Request functions (pure data access; unit-testable without React) ────────
// Verifix task flow: a task is created with an optional score; set-grade edits
// the score; set-status moves it through the per-branch catalog. Who may do
// what comes from entry.my_access (see utils canEditTask/canGradeTask/canSetStatus).

// Parse a score input to a number or null. Comma decimals are normalized (RU/UZ
// keyboards emit them); empty or garbage input → null (score is optional — the
// backend treats a missing/null score as unset).
function toScore(input: number | string | null | undefined): number | null {
  if (input == null || input === '') return null;
  const n = Number(String(input).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

// Create a task. score is optional — omitted from the body when absent so the
// backend applies its own default rather than receiving an explicit null.
export function addKpiTask(
  entryId: number,
  name: string,
  score?: number | string | null,
): Promise<KpiTask> {
  const s = toScore(score);
  const body = s == null ? { entry_id: entryId, name } : { entry_id: entryId, name, score: s };
  return apiClient.post<KpiTask>(KPI_TASKS, body).then((r) => r.data);
}

export function updateKpiTask(id: number, name: string): Promise<KpiTask> {
  return apiClient.patch<KpiTask>(KPI_TASK_DETAIL(id), { name }).then((r) => r.data);
}

export function deleteKpiTask(id: number): Promise<void> {
  return apiClient.delete(KPI_TASK_DETAIL(id)).then(() => undefined);
}

// Move a task to a catalog status (status_id is the FK, an int — not a string).
// The backend recomputes the entry fact from statuses that count_for_fact.
export function setTaskStatus(id: number, statusId: number): Promise<KpiTask> {
  return apiClient.post<KpiTask>(KPI_TASK_SET_STATUS(id), { status_id: statusId }).then((r) => r.data);
}

// Set/clear a task score. Empty input clears it (score: null). The backend
// rejects garbage/negative/over-100000 with 400 kpi_task_bad_score, which the
// global mutation toast surfaces (detail is a localized string).
export function setTaskGrade(id: number, score: number | string | null): Promise<KpiTask> {
  return apiClient.post<KpiTask>(KPI_TASK_SET_GRADE(id), { score: toScore(score) }).then((r) => r.data);
}

// ── Mutation hooks ───────────────────────────────────────────────────────────
// Each invalidates the whole kpi subtree on success: the entry detail refreshes
// its task list AND the scorecard refreshes fact/result columns (task scores in
// counts_for_fact statuses roll into entry.fact_value on the backend).
function useInvalidateKpi() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: kpiKeys.all });
}

export function useAddKpiTask(entryId: number) {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: ({ name, score }: { name: string; score?: number | string | null }) =>
      addKpiTask(entryId, name, score),
    onSuccess: invalidate,
  });
}

export function useUpdateKpiTask() {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateKpiTask(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteKpiTask() {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: deleteKpiTask,
    onSuccess: invalidate,
  });
}

export function useSetTaskStatus() {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: number; statusId: number }) => setTaskStatus(id, statusId),
    onSuccess: invalidate,
  });
}

export function useSetTaskGrade() {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: ({ id, score }: { id: number; score: number | string | null }) => setTaskGrade(id, score),
    onSuccess: invalidate,
  });
}
