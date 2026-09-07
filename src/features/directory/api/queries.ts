import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { PHONE_DIRECTORY, ORGANIZATION_BRANCHES } from '@/api/urls';
import type { PhoneDirectoryEntry, OrganizationBranch } from '@/types';

// Phone book, fetched PER SCOPE. Search/filter stays client-side (see
// PhoneDirectoryScreen). Same per-feature queryOptions pattern as visitors.
//
// Kalitga filial id'si kiradi, shuning uchun har ko'lam react-query keshida
// ALOHIDA yashaydi: ko'lam almashtirilib qaytilganda qayta so'rov ketmaydi.
export const directoryKeys = {
  all: ['phone-directory'] as const,
  scope: (branchId: number | null) => ['phone-directory', branchId ?? 'all'] as const,
};

// Branch list — used to name the scope/branch filter and to find the executive
// ("Ijro apparati") branch. Shared cache key so it de-dupes with any other
// branch fetch. Rarely changes.
export function directoryBranchesQuery() {
  return queryOptions({
    queryKey: ['org-branches'] as const,
    queryFn: () =>
      apiClient
        .get<OrganizationBranch[] | { items?: OrganizationBranch[] }>(ORGANIZATION_BRANCHES)
        .then((r) => {
          const d = r.data as OrganizationBranch[] | { items?: OrganizationBranch[] } | null;
          return (Array.isArray(d) ? d : (d?.items ?? [])) as OrganizationBranch[];
        }),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * `branchId` berilsa faqat o'sha filial, `null` bo'lsa butun tashkilot.
 *
 * NEGA (audit 2026-09-07): bu so'rov butun tashkilotni olib kelardi — 21
 * filial, 2321 xodim, 2.6 MB. Ekran esa odatda bitta ko'lamni ko'rsatadi
 * (filial xodimi uchun o'z filiali, qolganlar uchun "Ijro apparati"), ya'ni
 * javobning katta qismi mobil internetdan yuklanib, darhol tashlab
 * yuborilardi. Web'da o'lchandi: 2.6 MB → 163 KB.
 *
 * ATAYLAB `branch_id`, `organization_branch_id` EMAS — oxirgisini so'rov
 * qatlami har so'rovga o'zi qo'shadi va backend uni bu endpointda ataylab
 * e'tiborsiz qoldiradi.
 */
export function phoneDirectoryQuery(branchId: number | null = null) {
  return queryOptions({
    queryKey: directoryKeys.scope(branchId),
    queryFn: () =>
      apiClient
        .get<PhoneDirectoryEntry[] | { items: PhoneDirectoryEntry[] }>(PHONE_DIRECTORY, {
          params: branchId == null ? undefined : { branch_id: branchId },
        })
        .then((r) => {
          const d = r.data as PhoneDirectoryEntry[] | { items?: PhoneDirectoryEntry[] } | null;
          if (Array.isArray(d)) return d;
          return d?.items ?? [];
        }),
    // The directory changes rarely; keep it warm across opens.
    staleTime: 10 * 60 * 1000,
  });
}
