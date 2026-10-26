// Topshiriqlar xronologiyasi so'rovlari — web v2 `features/chronology/useChronology.ts`.
// Not branch-scoped: executors come from any organisation and the server
// decides who sees what (members / executors / ijro responsibles).
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { TASK_CHRONOLOGY, TASK_CHRONOLOGY_ITEM } from '@/api/urls';
import type { ChronoCalendarItem, ChronoSummary, ChronoTask, ChronoTaskRow, TaskFilter } from '../utils/chrono';

export const chronoKeys = {
  all: ['chrono'] as const,
  list: (search: string, status: TaskFilter, mine: boolean) => ['chrono', 'list', search, status, mine] as const,
  summary: (search: string, mine: boolean) => ['chrono', 'summary', search, mine] as const,
  calendar: (from: string, to: string, mine: boolean) => ['chrono', 'calendar', from, to, mine] as const,
  task: (id: number) => ['chrono', 'task', id] as const,
};

export const fetchChronoTasks = (search: string, status: TaskFilter, mine: boolean) =>
  apiClient
    .get(TASK_CHRONOLOGY, {
      params: { ...(search ? { search } : {}), ...(status ? { status } : {}), ...(mine ? { mine: true } : {}) },
    })
    .then((r) => unwrapList<ChronoTaskRow>(r.data));

export const fetchChronoSummary = (search: string, mine: boolean) =>
  apiClient
    .get<ChronoSummary>(`${TASK_CHRONOLOGY}/summary`, { params: { ...(search ? { search } : {}), ...(mine ? { mine: true } : {}) } })
    .then((r) => r.data);

export const fetchChronoCalendar = (from: string, to: string, mine: boolean) =>
  apiClient
    .get<ChronoCalendarItem[]>(`${TASK_CHRONOLOGY}/calendar`, { params: { date_from: from, date_to: to, ...(mine ? { mine: true } : {}) } })
    .then((r) => r.data);

export const fetchChronoTask = (id: number) => apiClient.get<ChronoTask>(TASK_CHRONOLOGY_ITEM(id)).then((r) => r.data);

export function chronoTasksQuery(search: string, status: TaskFilter, mine: boolean) {
  return queryOptions({
    queryKey: chronoKeys.list(search, status, mine),
    queryFn: () => fetchChronoTasks(search, status, mine),
    placeholderData: keepPreviousData,
  });
}

export function chronoSummaryQuery(search: string, mine: boolean) {
  return queryOptions({ queryKey: chronoKeys.summary(search, mine), queryFn: () => fetchChronoSummary(search, mine) });
}

export function chronoCalendarQuery(from: string, to: string, mine: boolean) {
  return queryOptions({
    queryKey: chronoKeys.calendar(from, to, mine),
    queryFn: () => fetchChronoCalendar(from, to, mine),
    placeholderData: keepPreviousData,
  });
}

export function chronoTaskQuery(id: number) {
  return queryOptions({ queryKey: chronoKeys.task(id), queryFn: () => fetchChronoTask(id), enabled: id > 0 });
}
