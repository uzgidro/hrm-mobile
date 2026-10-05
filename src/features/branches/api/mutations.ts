import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  LOCATION,
  LOCATIONS_LIST,
  ORGANIZATION_BRANCH,
  ORGANIZATION_BRANCHES,
  ORGANIZATION_BRANCH_SYNC_HIK,
} from '@/api/urls';
import { branchesKeys } from './queries';

type Save = { id: number | null; body: Record<string, unknown> };

export const saveBranch = ({ id, body }: Save) =>
  (id == null ? apiClient.post(ORGANIZATION_BRANCHES, body) : apiClient.patch(ORGANIZATION_BRANCH(id), body)).then(
    (r) => r.data,
  );
export const deleteBranch = (id: number) => apiClient.delete(ORGANIZATION_BRANCH(id)).then((r) => r.data);
/** Filial xodimlarini HikCentral'ga QAYTA yuborish — fon vazifasi, javob faqat «navbatga qo'yildi». */
export const syncBranchToHik = (id: number) => apiClient.post(ORGANIZATION_BRANCH_SYNC_HIK(id), {}).then((r) => r.data);

export const saveLocation = ({ id, body }: Save) =>
  (id == null ? apiClient.post(LOCATIONS_LIST, body) : apiClient.patch(LOCATION(id), body)).then((r) => r.data);
export const deleteLocation = (id: number) => apiClient.delete(LOCATION(id)).then((r) => r.data);

const meta = { skipErrorToast: true };

/**
 * Turniketlar ekranining kesh ildizi — LITERAL (funksiyalararo import yo'q): u yerdagi manzil va filial
 * tanlagichlari (`turnstile` formasi, ISAPI terminali) shu filial/manzillarni ko'rsatadi.
 */
const TURNSTILES_ADMIN_KEY = ['turnstiles-admin'] as const;

function useInvalidate() {
  const qc = useQueryClient();
  // Filial nomi/viloyati umumiy filial katalogida ham bor (ma'lumotnoma, xat formasi — `org-branches`);
  // manzil va filial Turniketlar ekranining tanlagichlarida ham.
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: branchesKeys.all }),
      qc.invalidateQueries({ queryKey: ['org-branches'] }),
      qc.invalidateQueries({ queryKey: TURNSTILES_ADMIN_KEY }),
    ]);
}

export function useSaveBranch() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveBranch, onSuccess });
}
export function useDeleteBranch() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteBranch, onSuccess });
}
export function useSyncBranchToHik() {
  return useMutation({ meta, mutationFn: syncBranchToHik });
}

export function useSaveLocation() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveLocation, onSuccess });
}
export function useDeleteLocation() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: deleteLocation, onSuccess });
}
