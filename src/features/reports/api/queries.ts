import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  DASHBOARD_CARDS_SUMMARY,
  DASHBOARD_DEPARTMENTS_EMPLOYEE_COUNT,
  DASHBOARD_JOB_POSITION_STATS,
  DASHBOARD_KPI_MONTHLY_AVERAGE,
  DASHBOARD_MAIN,
  DASHBOARD_TASK_EXECUTION_ATTENDANCE,
  REPORT_OPTIONS,
  REPORTS_CATALOG,
  SERVICE_REQUEST_STATISTICS,
} from '@/api/urls';
import type { CatalogResponse, ReportOption } from '../utils/types';
import type {
  CardsSummary,
  DeptCount,
  MainStats,
  PosStat,
  RequestFilters,
  RequestStats,
  TaskExecutionStats,
} from '../utils/stats';
import { requestStatsParams } from '../utils/stats';

// Mobil `apiClient` global filial qo'shmaydi: dashboard yig'malari va hisobotlar server
// doirasida (v2 sarlavhasida «Barcha filiallar» tanlangandagi so'rov bilan bir xil).
export const reportsKeys = {
  all: ['reports'] as const,
  catalog: () => [...reportsKeys.all, 'catalog'] as const,
  options: (code: string, param: string, p: object) => [...reportsKeys.all, 'options', code, param, p] as const,
  requestStats: (p: object) => [...reportsKeys.all, 'request-stats', p] as const,
  staff: (name: string, p?: object) => [...reportsKeys.all, 'staff', name, p ?? {}] as const,
};

/** v2 `useReportCatalog`: faqat chaqiruvchi ishga tushira oladiganlar (server hal qiladi). */
export function reportCatalogQuery(enabled = true) {
  return queryOptions({
    queryKey: reportsKeys.catalog(),
    queryFn: () =>
      apiClient
        .get<Partial<CatalogResponse>>(REPORTS_CATALOG)
        .then((r): CatalogResponse => ({ items: r.data?.items ?? [], roles: r.data?.roles ?? [] })),
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });
}

export interface OptionsDeps {
  branch_ids?: (number | string)[];
  q?: string;
  ids?: (number | string)[];
  limit?: number;
}

/** v2 `useReportOptions`: tanlagich ro'yxati; `branch_ids` (depends_on) toraytiradi, `ids` — tanlanganlar nomi. */
export function reportOptionsQuery(code: string, param: string, deps: OptionsDeps, enabled = true) {
  const params = {
    branch_ids: (deps.branch_ids ?? []).map(String).join(',') || undefined,
    q: deps.q || undefined,
    ids: (deps.ids ?? []).map(String).join(',') || undefined,
    limit: deps.limit,
  };
  return queryOptions({
    queryKey: reportsKeys.options(code, param, params),
    queryFn: () =>
      apiClient
        .get<ReportOption[]>(REPORT_OPTIONS(code, param), { params })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
    enabled,
  });
}

/** v2 `useRequestStats`: 403 — ko'rib chiquvchi roli emas; qayta urinish faqat kechiktiradi. */
export function requestStatsQuery(f: RequestFilters, enabled = true) {
  const params = requestStatsParams(f);
  return queryOptions({
    queryKey: reportsKeys.requestStats(params),
    queryFn: () =>
      apiClient.get<Partial<RequestStats>>(SERVICE_REQUEST_STATISTICS, { params }).then((r): RequestStats => ({
        rows: r.data?.rows ?? [],
        service_types: r.data?.service_types ?? [],
        statuses: r.data?.statuses ?? [],
      })),
    placeholderData: keepPreviousData,
    retry: false,
    enabled,
  });
}

const get = <T>(url: string, params?: object) => apiClient.get<T>(url, { params }).then((r) => r.data);

export const dashboardMainQuery = () =>
  queryOptions({
    queryKey: reportsKeys.staff('main'),
    queryFn: () => get<MainStats>(DASHBOARD_MAIN),
  });

export const deptCountQuery = () =>
  queryOptions({
    queryKey: reportsKeys.staff('dept-count'),
    queryFn: () => get<DeptCount[]>(DASHBOARD_DEPARTMENTS_EMPLOYEE_COUNT).then((d) => (Array.isArray(d) ? d : [])),
  });

export const posStatsQuery = () =>
  queryOptions({
    queryKey: reportsKeys.staff('pos-stats'),
    queryFn: () => get<PosStat[]>(DASHBOARD_JOB_POSITION_STATS).then((d) => (Array.isArray(d) ? d : [])),
  });

export const kpiMonthlyQuery = () =>
  queryOptions({
    queryKey: reportsKeys.staff('kpi-monthly'),
    queryFn: () =>
      get<{ month: string; kpi_percentage: number }[]>(DASHBOARD_KPI_MONTHLY_AVERAGE).then((d) =>
        Array.isArray(d) ? d : [],
      ),
  });

/** `range` kalitda: sana bugundan hisoblanadi — yarim tundan keyin eski oyna qolmasin (v2 izohi). */
export const cardsSummaryQuery = (range: { date_from: string; date_to: string }) =>
  queryOptions({
    queryKey: reportsKeys.staff('cards', range),
    queryFn: () => get<CardsSummary>(DASHBOARD_CARDS_SUMMARY, range),
  });

export const taskExecutionQuery = (range: { date_from: string; date_to: string }) =>
  queryOptions({
    queryKey: reportsKeys.staff('task-exec', range),
    queryFn: () => get<TaskExecutionStats>(DASHBOARD_TASK_EXECUTION_ATTENDANCE, range),
  });
