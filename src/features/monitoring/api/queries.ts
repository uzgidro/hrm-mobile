// Monitoring so'rovlari — web v2 `features/monitoring/useMonitoring.ts` manbalari.
// Filial bo'lmasa hech narsa so'ralmaydi (v2: «filial tanlang»). Real vaqt: v2
// soketi o'rniga v2 zaxira kadensi — 120 s.
import { queryOptions } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  DASHBOARD_MAIN,
  DASHBOARD_LATE_EMPLOYEES,
  DASHBOARD_LATE_EMPLOYEES_FREQUENT,
  ORGANIZATION_BRANCHES,
  VISITOR_TURNSTILE_ATTENDANCE,
} from '@/api/urls';

export const POLL_MS = 120_000;

export type MainStats = {
  total_employees_count?: number;
  present_employees_count?: number;
  absent_employees_count?: number;
  late_employees_count?: number;
};

export type LateEmployeeRow = {
  employee_id: number;
  employee?: { legal_name?: string | null; photo_path?: string | null; job_position?: { name?: string } | null; department?: { name?: string } | null } | null;
  happen_time: string;
  late_minutes: number;
};

export type FrequentLate = {
  employee_id?: number;
  employee_name?: string | null;
  job_position_name?: string | null;
  department_name?: string | null;
  photo_path?: string | null;
  late_count?: number;
};

export type VisitorPassRow = {
  id?: number;
  event_id?: number | string;
  happen_time?: string;
  direction_type?: string;
  visitor?: { legal_name?: string | null; photo_path?: string | null } | null;
  turnstile?: { display_name?: string | null; acs_dev_name?: string | null } | null;
};

export const monitoringKeys = {
  all: ['monitoring'] as const,
  main: (b: number | undefined, day: string) => ['monitoring', 'main', b ?? null, day] as const,
  late: (b: number | undefined) => ['monitoring', 'late', b ?? null] as const,
  frequent: (b: number | undefined, day: string) => ['monitoring', 'frequent-late', b ?? null, day.slice(0, 7)] as const,
  visitors: (b: number | undefined, day: string) => ['monitoring', 'visitors', b ?? null, day] as const,
  branches: () => ['monitoring', 'branches'] as const,
};

export type BranchOption = { id: number; name?: string | null; is_head_office?: boolean | null };

/**
 * Filial tanlagichi ro'yxati (v2 sarlavhadagi `BranchSelector` — `organization-branches?slim`).
 * Faqat tanlagich kerak bo'lganda (global yoki ko'p filialli hisob) so'raladi.
 */
export function monitoringBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: monitoringKeys.branches(),
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES, { params: { slim: true } }).then((r) => unwrapList<BranchOption>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function monitoringMainQuery(branchId: number | undefined, day: string) {
  return queryOptions({
    queryKey: monitoringKeys.main(branchId, day),
    queryFn: () =>
      apiClient
        .get<MainStats>(DASHBOARD_MAIN, { params: { organization_branch_id: branchId, date_from: day, date_to: day } })
        .then((r) => r.data ?? {}),
    enabled: branchId != null,
    refetchInterval: POLL_MS,
  });
}

export function lateEmployeesQuery(branchId: number | undefined, enabled = true) {
  return queryOptions({
    queryKey: monitoringKeys.late(branchId),
    queryFn: () =>
      apiClient
        .get<LateEmployeeRow[]>(DASHBOARD_LATE_EMPLOYEES, { params: { organization_branch_id: branchId } })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: enabled && branchId != null,
    refetchInterval: POLL_MS,
    retry: false,
  });
}

export function frequentLateQuery(branchId: number | undefined, day: string, enabled = true) {
  const d = dayjs(day);
  return queryOptions({
    queryKey: monitoringKeys.frequent(branchId, day),
    queryFn: () =>
      apiClient
        .get<FrequentLate[]>(DASHBOARD_LATE_EMPLOYEES_FREQUENT, {
          params: {
            organization_branch_id: branchId,
            limit: 5,
            date_from: d.startOf('month').format('YYYY-MM-DD'),
            date_to: d.endOf('month').format('YYYY-MM-DD'),
          },
        })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: enabled && branchId != null,
    retry: false,
  });
}

export function visitorPassesQuery(branchId: number | undefined, day: string) {
  return queryOptions({
    queryKey: monitoringKeys.visitors(branchId, day),
    queryFn: () =>
      apiClient
        .get(VISITOR_TURNSTILE_ATTENDANCE, { params: { organization_branch_id: branchId, date_from: day, date_to: day } })
        .then((r) => unwrapList<VisitorPassRow>(r.data).slice(0, 50)),
    enabled: branchId != null,
    refetchInterval: POLL_MS,
  });
}
