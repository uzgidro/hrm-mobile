import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { LETTER_NEXT_REG_NUMBER, ORGANIZATION_BRANCHES, ORGANIZATION_BRANCH_LEADERS } from '@/api/urls';
import type { BranchLeader } from '../utils/leaders';
import type { NextRegNumber, TabelBranch } from '../utils/tabelConfig';

export const tabelSettingsKeys = {
  all: ['tabel-settings'] as const,
  branches: () => [...tabelSettingsKeys.all, 'branches'] as const,
  leaders: (branchId: number) => [...tabelSettingsKeys.all, 'leaders', branchId] as const,
  nextNumber: (branchId: number) => [...tabelSettingsKeys.all, 'next-number', branchId] as const,
};

/** Barcha filiallar — TO'LIQ qatorlar (`tabel_config`, shtamp, blanklar); forma shundan to'ldiriladi (v2 `useTabelBranches`). */
export function tabelBranchesQuery() {
  return queryOptions({
    queryKey: tabelSettingsKeys.branches(),
    queryFn: () => apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<TabelBranch>(r.data)),
  });
}

/** Bitta filial rahbarlari — varaq ochilganda (v2 `useBranchLeaders`). */
export function branchLeadersQuery(branchId: number) {
  return queryOptions({
    queryKey: tabelSettingsKeys.leaders(branchId),
    queryFn: () =>
      apiClient
        .get(ORGANIZATION_BRANCH_LEADERS(branchId))
        .then((r) => (Array.isArray(r.data) ? r.data : []) as BranchLeader[]),
  });
}

/** Keyingi ro'yxat raqami (v2 `useNextRegNumber`) — faqat ruxsat bo'lsa so'raladi (aks holda server 403). */
export function nextRegNumberQuery(branchId: number, enabled: boolean) {
  return queryOptions({
    queryKey: tabelSettingsKeys.nextNumber(branchId),
    queryFn: () =>
      apiClient
        .get<NextRegNumber>(LETTER_NEXT_REG_NUMBER, { params: { organization_branch_id: branchId } })
        .then((r) => r.data),
    enabled,
    retry: false,
  });
}

