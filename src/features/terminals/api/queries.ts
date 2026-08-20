import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { HIK_MONITORING_DEVICES, HIK_MONITORING_SUMMARY } from '@/api/urls';
import type { HikDevice, HikSummary } from '@/types';

// Turniket (HikCentral) monitoringi. Backend darvozasi `require_system_admin`
// va javob KO'LAMI ham serverda: filial AKT xodimi FAQAT o'z filialini oladi,
// master-admin hammasini — mijoz hech qanday filial filtri yubormaydi.
export const terminalKeys = {
  all: ['hik-monitoring'] as const,
  summary: () => [...terminalKeys.all, 'summary'] as const,
  devices: (online?: boolean) => [...terminalKeys.all, 'devices', online ?? 'all'] as const,
};

export function terminalSummaryQuery() {
  return queryOptions({
    queryKey: terminalKeys.summary(),
    queryFn: () => apiClient.get<HikSummary>(HIK_MONITORING_SUMMARY).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function terminalDevicesQuery(online?: boolean) {
  return queryOptions({
    queryKey: terminalKeys.devices(online),
    queryFn: () =>
      apiClient
        .get<{ items?: HikDevice[]; total?: number }>(HIK_MONITORING_DEVICES, {
          params: { size: 100, page: 1, ...(online == null ? {} : { online }) },
        })
        .then((r) => r.data?.items ?? []),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
