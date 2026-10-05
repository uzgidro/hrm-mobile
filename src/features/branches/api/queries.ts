import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { LOCATIONS_LIST, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { BranchRow, LocationRow } from '../utils/branches';

export const branchesKeys = {
  all: ['branches-admin'] as const,
  branches: () => [...branchesKeys.all, 'branches'] as const,
  locations: () => [...branchesKeys.all, 'locations'] as const,
};

/** Barcha filiallar — TO'LIQ qatorlar (v2 `useBranchAdmin`): forma ro'yxat qatoridan to'ldiriladi. */
export function branchesQuery() {
  return queryOptions({
    queryKey: branchesKeys.branches(),
    queryFn: () => apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<BranchRow>(r.data)),
  });
}

/**
 * Manzillar — filial filtrisiz (v2 `useLocations(null)`): master-admin hammasini oladi, AKT xodimini
 * server o'z filialiga toraytiradi. 403 — «ruxsat yo'q» (qayta urinilmaydi).
 */
export function locationsQuery() {
  return queryOptions({
    queryKey: branchesKeys.locations(),
    queryFn: () => apiClient.get(LOCATIONS_LIST).then((r) => unwrapList<LocationRow>(r.data)),
    retry: false,
  });
}
