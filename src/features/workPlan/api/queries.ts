import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_PLANS, WORK_PLANS_SUMMARY } from '@/api/urls';

/** v2 `useWorkPlan.ts` `WorkPlan`. */
export interface WorkPlan {
  id: number;
  title?: string | null;
  description?: string | null;
  employee_id?: number | null;
  employee_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  period_type?: string | null;
  period_label?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  kpi_indicator_name?: string | null;
  planned_result?: string | null;
  weight?: number | null;
  status?: string | null;
}

export const WORK_PLAN_PAGE_SIZE = 20;
export const workPlanKeys = {
  all: ['work-plans'] as const,
  list: (p: object) => [...workPlanKeys.all, 'list', p] as const,
  summary: (p: object) => [...workPlanKeys.all, 'summary', p] as const,
};

/** Qidiruv va holat SERVERDA (reja har davrda to'planadi — kelgan massivni filtrlash cheksiz ro'yxatni ko'rardi). */
export function workPlansQuery(f: { status: string; search: string; page: number }) {
  const params: Record<string, string | number> = { page: f.page, size: WORK_PLAN_PAGE_SIZE };
  if (f.status) params.status = f.status;
  if (f.search.trim()) params.search = f.search.trim();
  return queryOptions({
    queryKey: workPlanKeys.list(params),
    queryFn: () =>
      apiClient.get(WORK_PLANS, { params }).then((r) => {
        const d = r.data as { items?: WorkPlan[]; total?: number; pages?: number } | WorkPlan[];
        const items = Array.isArray(d) ? d : (d.items ?? []);
        return {
          items,
          total: Array.isArray(d) ? items.length : (d.total ?? items.length),
          pages: Array.isArray(d) ? 1 : (d.pages ?? 1),
        };
      }),
    placeholderData: keepPreviousData,
  });
}

/** Plitka sonlari: {all, overdue, planned, in_progress, done, cancelled}. */
export function workPlanSummaryQuery(search: string) {
  const params: Record<string, string> = search.trim() ? { search: search.trim() } : {};
  return queryOptions({
    queryKey: workPlanKeys.summary(params),
    queryFn: () => apiClient.get<Record<string, number>>(WORK_PLANS_SUMMARY, { params }).then((r) => r.data ?? {}),
    placeholderData: keepPreviousData,
  });
}
