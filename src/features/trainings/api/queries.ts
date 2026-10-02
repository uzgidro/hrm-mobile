import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { TRAININGS, TRAININGS_SUMMARY } from '@/api/urls';

/** v2 `useTrainings.ts` `Training`. */
export interface Training {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  department_name?: string | null;
  job_position_name?: string | null;
  training_type: string;
  program_name: string;
  provider?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  hours?: number | null;
  status: string;
  result?: string | null;
  cost?: number | null;
  certificate_number?: string | null;
  certificate_expires_at?: string | null;
  note?: string | null;
}

export interface TrainingSummary {
  total: number;
  completed: number;
  planned: number;
  total_hours: number;
  total_cost: number;
  expiring_soon: number;
}

export const TRAINING_PAGE_SIZE = 20;
export const trainingKeys = {
  all: ['trainings'] as const,
  list: (p: object) => [...trainingKeys.all, 'list', p] as const,
  summary: () => [...trainingKeys.all, 'summary'] as const,
};

export function trainingsQuery(f: {
  search: string;
  type: string;
  status: string;
  expiringOnly: boolean;
  page: number;
}) {
  const params: Record<string, string | number | boolean> = { page: f.page, size: TRAINING_PAGE_SIZE };
  if (f.search.trim()) params.search = f.search.trim();
  if (f.type) params.training_type = f.type;
  if (f.status) params.status = f.status;
  if (f.expiringOnly) params.expiring_only = true;
  return queryOptions({
    queryKey: trainingKeys.list(params),
    queryFn: () =>
      apiClient.get(TRAININGS, { params }).then((r) => {
        const d = r.data as { items?: Training[]; total?: number; pages?: number };
        const items = d.items ?? [];
        return { items, total: d.total ?? items.length, pages: d.pages ?? 1 };
      }),
    placeholderData: keepPreviousData,
  });
}

export function trainingSummaryQuery() {
  return queryOptions({
    queryKey: trainingKeys.summary(),
    queryFn: () => apiClient.get<TrainingSummary>(TRAININGS_SUMMARY).then((r) => r.data),
  });
}
