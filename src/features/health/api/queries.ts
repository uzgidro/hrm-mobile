import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { HEALTH_CHECKS_ACCESS, HEALTH_CHECKS_ROSTER, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { HealthAccess, HealthRosterRow } from '../utils/health';

export const healthKeys = {
  all: ['health-checks'] as const,
  access: (branchId: number | null) => [...healthKeys.all, 'access', branchId] as const,
  roster: (p: object) => [...healthKeys.all, 'roster', p] as const,
};

/**
 * v2 `useHealthAccess`. `organization_branch_id` berilsa `can_check` SHU filial
 * uchun javob beradi (server audit 2026-09-02); `nurse_branch_ids` — identitet,
 * filial bilan toraymaydi. `null` — «umuman hamshiramanmi» (filialni aniqlash uchun).
 */
export function healthAccessQuery(branchId: number | null, enabled = true) {
  return queryOptions({
    queryKey: healthKeys.access(branchId),
    queryFn: () =>
      apiClient
        .get<HealthAccess>(HEALTH_CHECKS_ACCESS, {
          params: branchId != null ? { organization_branch_id: branchId } : {},
        })
        .then((r) => ({
          can_check: !!r.data?.can_check,
          nurse_branch_ids: r.data?.nurse_branch_ids ?? [],
        })),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * v2 `useHealthRoster`: filial `branch_id` bilan ANIQ yuboriladi (mobil `apiClient`
 * global filial qo'shmaydi). Qidiruv SERVERDA (ism / lavozim, kirill bukilishi bilan).
 */
export function healthRosterQuery(branchId: number | null, day: string, search = '') {
  const term = search.trim();
  const params: Record<string, string | number> = { branch_id: branchId ?? 0, day };
  if (term) params.search = term;
  return queryOptions({
    queryKey: healthKeys.roster(params),
    queryFn: () => apiClient.get(HEALTH_CHECKS_ROSTER, { params }).then((r) => unwrapList<HealthRosterRow>(r.data)),
    enabled: branchId != null && !!day,
    placeholderData: keepPreviousData,
  });
}

/** Filial nomlari (tanlagich uchun). Faqat tanlagich kerak bo'lganda yoqiladi. */
export function healthBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ['health-checks-branches'] as const,
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}
