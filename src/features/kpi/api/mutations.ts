import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { KPI_TASKS, KPI_TASK_DETAIL, KPI_TASK_SUBMIT } from '@/api/urls';
import type { KpiTask } from '@/types';
import { kpiKeys } from './queries';

// ── Request functions (pure data access; unit-testable without React) ────────
// Owner-side task flow only: the employee submits task NAMES; the score is set
// by the supervisor on confirm (web parity — no score input here).

export function addKpiTask(entryId: number, name: string): Promise<KpiTask> {
  return apiClient.post<KpiTask>(KPI_TASKS, { entry_id: entryId, name }).then((r) => r.data);
}

export function updateKpiTask(id: number, name: string): Promise<KpiTask> {
  return apiClient.patch<KpiTask>(KPI_TASK_DETAIL(id), { name }).then((r) => r.data);
}

export function submitKpiTask(id: number): Promise<KpiTask> {
  return apiClient.post<KpiTask>(KPI_TASK_SUBMIT(id)).then((r) => r.data);
}

export function deleteKpiTask(id: number): Promise<void> {
  return apiClient.delete(KPI_TASK_DETAIL(id)).then(() => undefined);
}

// ── Mutation hooks ───────────────────────────────────────────────────────────
// Each invalidates the whole kpi subtree on success: the entry detail refreshes
// its task list AND the scorecard refreshes fact/result columns (confirmed task
// scores roll into entry.fact_value on the backend).
function useInvalidateKpi() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: kpiKeys.all });
}

export function useAddKpiTask(entryId: number) {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: (name: string) => addKpiTask(entryId, name),
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

export function useSubmitKpiTask() {
  const invalidate = useInvalidateKpi();
  return useMutation({
    mutationFn: submitKpiTask,
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
