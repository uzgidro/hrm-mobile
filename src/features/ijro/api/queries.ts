// Ijro so'rovlari — web v2 `features/ijro/useIjro.ts`.
import { queryOptions, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { TASKS_OVERDUE } from '@/api/urls';
import type { IjroTask } from '../utils/ijro';

export type IjroSummary = { open: number; late: number; late_done: number; done: number; all: number };

export const ijroKeys = {
  all: ['ijro'] as const,
  list: (search: string, status: string) => ['ijro', 'list', search, status] as const,
  summary: (search: string) => ['ijro', 'summary', search] as const,
};

export function ijroTasksQuery({ search, status }: { search: string; status: string }) {
  return queryOptions({
    queryKey: ijroKeys.list(search, status),
    queryFn: () =>
      apiClient
        .get(TASKS_OVERDUE, { params: { ...(search ? { search } : {}), ...(status ? { status } : {}) } })
        .then((r) => unwrapList<IjroTask>(r.data)),
    placeholderData: keepPreviousData,
  });
}

export function ijroSummaryQuery(search: string) {
  return queryOptions({
    queryKey: ijroKeys.summary(search),
    queryFn: () =>
      apiClient.get<IjroSummary>(`${TASKS_OVERDUE}/summary`, { params: search ? { search } : {} }).then((r) => r.data),
  });
}
