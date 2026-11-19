// Faol filial — barcha filialga bog'liq ekranlar uchun YAGONA manba (web v2 `selectedBranchId`
// + `useBranchInit` mobil nusxasi, 2026-10-07).
//
// Qoidalar (web v2 `visibleBranches` / `canSwitchBranchScope`):
//   - tanlanmagan bo'lsa — hisobning o'z (asosiy) filiali (`userBranchIds[0]`);
//   - o'z filiali yo'q global hisob (master-admin, ministr) — BOSH filial, «Barcha filiallar»
//     EMAS: aks holda har ekran butun tashkilotni yuklab ilova qotardi;
//   - tanlov faqat ruxsat etilgan filiallar ichidan: global — istalgani, qolganlar — o'zinikilar;
//   - `null` («Barcha filiallar») faqat `canSwitchBranchScope` bo'lganlarga — `undefined` qaytadi
//     (so'rovga filial qo'shilmaydi).
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { ORGANIZATION_BRANCHES } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { canSwitchBranchScope } from '@/utils/roles';
import { defaultGlobalBranchId, hasGlobalBranchScope, needsBranchPicker, userBranchIds } from '@/utils/userBranch';
import { findExecutiveBranchId } from '@/utils/branch';
import type { User } from '@/types';

export interface BranchOption {
  id: number;
  name?: string | null;
  is_head_office?: boolean | null;
}

/** Tanlagich ro'yxati: `?slim=true` (faqat id/nom) — bosh sahifa, 30 daqiqa kesh. */
export function pickerBranchesQuery(enabled: boolean) {
  return {
    queryKey: ['active-branch', 'options'] as const,
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES, { params: { slim: true } }).then((r) => unwrapList<BranchOption>(r.data)),
    staleTime: 30 * 60 * 1000,
    enabled,
  };
}

/** Sof qoida (test qilinadi): saqlangan tanlov + hisob + filiallar ro'yxati → so'rovga boradigan filial. */
export function resolveActiveBranch(
  user: User | null | undefined,
  saved: { userId: number | null; selected: number | null | undefined },
  branches: BranchOption[] | undefined,
): number | undefined {
  if (!user) return undefined;
  const own = userBranchIds(user);
  const global = hasGlobalBranchScope(user);
  const execId = findExecutiveBranchId((branches ?? []).map((b) => ({ id: b.id, name: b.name ?? '' })));
  const mine = saved.userId === user.id ? saved.selected : undefined;
  if (mine === null && canSwitchBranchScope(user, execId)) return undefined;
  if (typeof mine === 'number' && (global || own.includes(mine))) return mine;
  if (own.length) return own[0];
  return global ? defaultGlobalBranchId(branches) : undefined;
}

export function useActiveBranchId(): number | undefined {
  const user = useAuthStore((s) => s.user);
  const userId = useBranchStore((s) => s.userId);
  const selected = useBranchStore((s) => s.selected);
  const needList = hasGlobalBranchScope(user) && !userBranchIds(user).length;
  const branches = useQuery(pickerBranchesQuery(needList)).data;
  return useMemo(() => resolveActiveBranch(user, { userId, selected }, branches), [user, userId, selected, branches]);
}

/** Tanlagich kerakmi (global hisob yoki bir nechta o'z filiali). */
export function useNeedsBranchPicker(): boolean {
  const user = useAuthStore((s) => s.user);
  return needsBranchPicker(user);
}
