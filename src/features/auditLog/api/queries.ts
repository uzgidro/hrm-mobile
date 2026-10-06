import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  AUDIT_LOGS,
  AUDIT_LOGS_ONLINE,
  AUDIT_LOGS_ONLINE_HISTORY,
  AUDIT_LOGS_STATS,
  ORGANIZATION_BRANCHES,
} from '@/api/urls';
import type { AuditPage, AuditStats, OnlineDay, OnlineUser } from '../utils/auditLog';

export const AUDIT_PAGE_SIZE = 25;

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (p: object) => [...auditKeys.all, 'list', p] as const,
  stats: (p: object) => [...auditKeys.all, 'stats', p] as const,
  online: () => [...auditKeys.all, 'online'] as const,
  onlineHistory: (days: number) => [...auditKeys.all, 'online-history', days] as const,
  users: (q: string) => [...auditKeys.all, 'users', q] as const,
  branches: () => [...auditKeys.all, 'branches'] as const,
};

/** Bosh admin uchun; server sahifalaydi. 403 ni qayta so'rash befoyda (v2 `retry: false`). */
export function auditLogsQuery(params: Record<string, string | number>, page: number, enabled = true) {
  const p = { ...params, page, size: AUDIT_PAGE_SIZE };
  return queryOptions({
    queryKey: auditKeys.list(p),
    queryFn: () =>
      apiClient.get<Partial<AuditPage>>(AUDIT_LOGS, { params: p }).then((r): AuditPage => ({
        items: r.data?.items ?? [],
        total: r.data?.total ?? 0,
        page: r.data?.page ?? page,
        pages: r.data?.pages ?? 1,
      })),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/** Joriy tanlov toifalar bo'yicha (toifa filtrisiz — bosilgan toifa ro'yxatdagi son bilan mos). */
export function auditStatsQuery(params: Record<string, string | number>, enabled = true) {
  return queryOptions({
    queryKey: auditKeys.stats(params),
    queryFn: () =>
      apiClient
        .get<{ total?: number; by_category?: Record<string, number> | null }>(AUDIT_LOGS_STATS, { params })
        .then((r): AuditStats => ({ total: r.data?.total ?? 0, byCategory: r.data?.by_category ?? {} })),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

/** HOZIR ONLAYN — faqat joriy bo'lsa qiziq: har 30 s. */
export function onlineNowQuery(enabled = true) {
  return queryOptions({
    queryKey: auditKeys.online(),
    queryFn: () =>
      apiClient
        .get<{ count?: number; users?: OnlineUser[] }>(AUDIT_LOGS_ONLINE)
        .then((r) => ({ count: r.data?.count ?? 0, users: r.data?.users ?? [] })),
    enabled,
    refetchInterval: 30_000,
    retry: false,
  });
}

export const ONLINE_HISTORY_DAYS = 14;

export function onlineHistoryQuery(enabled = true) {
  return queryOptions({
    queryKey: auditKeys.onlineHistory(ONLINE_HISTORY_DAYS),
    queryFn: () =>
      apiClient
        .get(AUDIT_LOGS_ONLINE_HISTORY, { params: { days: ONLINE_HISTORY_DAYS } })
        .then((r) => unwrapList<OnlineDay>(r.data)),
    enabled,
    retry: false,
  });
}

export function auditBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: auditKeys.branches(),
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}
