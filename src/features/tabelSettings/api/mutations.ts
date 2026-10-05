import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  ORGANIZATION_BRANCH,
  ORGANIZATION_BRANCH_DOC_TEMPLATE,
  ORGANIZATION_BRANCH_LEADER,
  ORGANIZATION_BRANCH_LEADERS,
  ORGANIZATION_BRANCH_LOGO,
  ORGANIZATION_BRANCH_TABEL_TEMPLATE,
  USER_INFO,
} from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import type { BlankDocType } from '../utils/blank';
import { leadersDiff, type BranchLeader, type PendingLeader } from '../utils/leaders';
import { tabelSettingsKeys } from './queries';

type Patch = { id: number; body: Record<string, unknown> };

/** Filial sozlamasi (tabel konfiguratsiyasi yoki bitta hujjat turining blanki) — PATCH. */
export const patchBranch = ({ id, body }: Patch) => apiClient.patch(ORGANIZATION_BRANCH(id), body).then((r) => r.data);
/** Filialning Excel tabel shablonini olib tashlaydi — eksport standart shaklga qaytadi. */
export const removeTabelTemplate = (id: number) =>
  apiClient.delete(ORGANIZATION_BRANCH_TABEL_TEMPLATE(id)).then((r) => r.data);
/** Yuklangan tayyor .docx blankni olib tashlaydi — formadagi sozlama saqlanadi. */
export const removeBlankFile = ({ id, doc }: { id: number; doc: BlankDocType }) =>
  apiClient.delete(ORGANIZATION_BRANCH_DOC_TEMPLATE(id, doc)).then((r) => r.data);
/** Filial logosini olib tashlaydi — hujjatlar umumiy logoga qaytadi. */
export const removeLogo = (id: number) => apiClient.delete(ORGANIZATION_BRANCH_LOGO(id)).then((r) => r.data);

/**
 * Rahbarlar ro'yxatini saqlash (v2 `BranchLeadersModal.save`): avval olib tashlanganlar (faqat o'sha rol —
 * `?role=`), keyin yangilari, ketma-ket. Bittasi o'xshamasa ham qolganlari davom etadi — natijada `failed`.
 */
export async function saveLeaders({
  id,
  original,
  pending,
}: {
  id: number;
  original: BranchLeader[];
  pending: PendingLeader[];
}): Promise<{ failed: boolean }> {
  const { remove, add } = leadersDiff(original, pending);
  let failed = false;
  for (const op of remove) {
    try {
      await apiClient.delete(ORGANIZATION_BRANCH_LEADER(id, op.employee_id), { params: { role: op.role } });
    } catch {
      failed = true;
    }
  }
  for (const op of add) {
    try {
      await apiClient.post(ORGANIZATION_BRANCH_LEADERS(id), { employee_id: op.employee_id, leadership_role: op.role });
    } catch {
      failed = true;
    }
  }
  return { failed };
}

/** `/auth/me` — `*_branch_ids` ro'yxatlari (menyu va tugmalar shularga tayanadi) o'zini tayinlagandan keyin ham yangilansin. */
export async function refreshCurrentUser(): Promise<void> {
  try {
    const me = await apiClient.get<User>(USER_INFO).then((r) => r.data);
    useAuthStore.getState().setUser(me);
  } catch {
    // Keyingi ishga tushirishda baribir yangilanadi; saqlash muvaffaqiyatli hisoblanadi.
  }
}

const meta = { skipErrorToast: true };

// Filial yozuvi boshqa ekranlarda ham bor: Filiallar (`branches-admin`), umumiy filial katalogi (`org-branches`).
const BRANCH_KEYS = [['branches-admin'], ['org-branches']];
// Ish kuni, kechikish imtiyozi va «avtomatik to'liq kun» davomat/tabel hisobini o'zgartiradi.
const ATTENDANCE_KEYS = [['team-attendance'], ['timesheet']];
// Rahbarlar: xat/buyruq imzolovchilari, avtopark va sog'liq ko'rigi shu ro'yxatdan o'qiydi.
const LEADER_KEYS = [
  ['letter-signers'],
  ['letter-rahbariyat'],
  ['letter-agreement-signers'],
  ['letter-submitters'],
  ['order-leadership'],
  ['vehicles'],
  ['health-checks'],
];

function useInvalidate(extra: string[][]) {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [[...tabelSettingsKeys.all], ...BRANCH_KEYS, ...extra].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
}

export function useSaveTabelConfig() {
  const onSuccess = useInvalidate(ATTENDANCE_KEYS);
  return useMutation({ meta, mutationFn: patchBranch, onSuccess });
}
export function useRemoveTabelTemplate() {
  const onSuccess = useInvalidate([]);
  return useMutation({ meta, mutationFn: removeTabelTemplate, onSuccess });
}
export function useSaveBlank() {
  const onSuccess = useInvalidate([]);
  return useMutation({ meta, mutationFn: patchBranch, onSuccess });
}
export function useRemoveBlankFile() {
  const onSuccess = useInvalidate([]);
  return useMutation({ meta, mutationFn: removeBlankFile, onSuccess });
}
export function useRemoveLogo() {
  const onSuccess = useInvalidate([]);
  return useMutation({ meta, mutationFn: removeLogo, onSuccess });
}
export function useSaveLeaders() {
  const invalidate = useInvalidate(LEADER_KEYS);
  return useMutation({
    meta,
    mutationFn: saveLeaders,
    // Qisman xato bo'lsa ham ro'yxat qayta o'qiladi (v2 `refetch()` + `invalidate()`).
    onSettled: async () => {
      await invalidate();
      await refreshCurrentUser();
    },
  });
}
