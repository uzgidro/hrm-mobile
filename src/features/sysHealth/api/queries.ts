import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { SYSTEM_OPS_DIAGNOSTICS, SYSTEM_OPS_INCIDENTS, SYSTEM_OPS_STATE } from '@/api/urls';
import type { Diagnostics, Incident, OpsState } from '../utils/sysHealth';

/** v2 `['sysops', …]` — amallardan keyin hammasi birga yangilanadi. */
export const sysHealthKeys = {
  all: ['sysops'] as const,
  state: () => [...sysHealthKeys.all, 'state'] as const,
  diagnostics: () => [...sysHealthKeys.all, 'diagnostics'] as const,
  incidents: (limit: number) => [...sysHealthKeys.all, 'incidents', limit] as const,
};

/** v2: rejim har 60 s da yangilanadi. */
export function opsStateQuery(enabled = true) {
  return queryOptions({
    queryKey: sysHealthKeys.state(),
    queryFn: () => apiClient.get<OpsState>(SYSTEM_OPS_STATE).then((r) => r.data ?? {}),
    enabled,
    refetchInterval: 60_000,
  });
}

/** v2: o'z-o'zini tekshiruv har 120 s da (server har chaqiruvda haqiqatan tekshiradi). */
export function diagnosticsQuery(enabled = true) {
  return queryOptions({
    queryKey: sysHealthKeys.diagnostics(),
    queryFn: () => apiClient.get<Diagnostics>(SYSTEM_OPS_DIAGNOSTICS).then((r) => r.data ?? {}),
    enabled,
    refetchInterval: 120_000,
  });
}

/** v2: oxirgi 30 ta hodisa. */
export const INCIDENTS_LIMIT = 30;

export function incidentsQuery(enabled = true) {
  return queryOptions({
    queryKey: sysHealthKeys.incidents(INCIDENTS_LIMIT),
    queryFn: () =>
      apiClient
        .get(SYSTEM_OPS_INCIDENTS, { params: { limit: INCIDENTS_LIMIT } })
        .then((r) => unwrapList<Incident>(r.data)),
    enabled,
  });
}
