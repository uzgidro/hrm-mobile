import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  LETTERS_LIST,
  LETTER_DETAIL,
  EMPLOYEES_LIST,
  ORGANIZATION_BRANCHES,
  ORGANIZATION_BRANCH_LEADERS,
} from '@/api/urls';
import { fetchAllEmployees } from '@/utils/employees';
import type { Employee, Letter } from '@/types';

// Hierarchical query keys.
//
// `all` is deliberately `['letters']` (NOT a fresh namespace): the old tab,
// create-letter and letter-detail screens invalidate/read `['letters']`
// directly, so keeping `all` equal to that string means those existing prefix
// invalidations still match every list AND any open detail. The list key is
// `['letters', tab]` — byte-for-byte the old tab key — so the tab's cache
// identity + refetchInterval are unchanged. The old detail lived under a
// separate `['letter-detail', id]` tree; it now lives under `all` (as
// `['letters', 'detail', id]`) so a single
// `invalidateQueries({ queryKey: letterKeys.all })` refreshes the list AND the
// open detail in one call (mirrors orderKeys / leaveKeys).
export type LettersTab = 'action' | 'mine' | 'all';

export const letterKeys = {
  all: ['letters'] as const,
  list: (tab: LettersTab) => [...letterKeys.all, tab] as const,
  detail: (id: number) => [...letterKeys.all, 'detail', id] as const,
};

// The list endpoint returns either a bare array or a { items } envelope.
function unwrapList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : ((data as { items?: T[] })?.items ?? [])) as T[];
}

function paramsForTab(tab: LettersTab): Record<string, unknown> {
  if (tab === 'action') return { assigned_signer: true };
  if (tab === 'mine') return { signer: true };
  return {};
}

// The list tab. Key/params mirror the old tab query exactly.
export function lettersListQuery(tab: LettersTab) {
  return queryOptions({
    queryKey: letterKeys.list(tab),
    queryFn: () =>
      apiClient.get(LETTERS_LIST, { params: paramsForTab(tab) }).then((r) => unwrapList<Letter>(r.data)),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function letterDetailQuery(id: number) {
  return queryOptions({
    queryKey: letterKeys.detail(id),
    queryFn: () => apiClient.get<Letter>(LETTER_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Sign state must reflect the server on every open — another signer may have
    // acted. Override the global staleTime so it always revalidates.
    refetchOnMount: 'always',
  });
}

// ── Create-letter dropdown queries ────────────────────────────────────────────
// These read-only lookups keep the old inline keys so they share the same cache
// entries as before the migration.

// Rahbariyat / kelishuvchi (imzolovchilar) — hr / deputy / ministr roli.
export function letterSignersQuery(branchId?: number) {
  return queryOptions({
    queryKey: ['letter-signers', branchId] as const,
    queryFn: () =>
      apiClient
        .get(EMPLOYEES_LIST, {
          params: {
            multi_org_employee_role: ['hr', 'deputy', 'ministr'],
            include_multi_org: true,
            size: 100,
            ...(branchId ? { organization_branch_id: branchId } : {}),
          },
        })
        .then((r) => unwrapList<Employee>(r.data)),
    staleTime: 5 * 60 * 1000,
  });
}

// Xizmat safari uchun rahbariyat. Filialga belgilangan rahbarlar bo'lsa —
// shular (web bilan bir xil); aks holda deputy/ministr roli.
export function letterRahbariyatQuery(branchId: number | undefined, enabled: boolean) {
  return queryOptions({
    queryKey: ['letter-rahbariyat', branchId] as const,
    enabled,
    queryFn: async () => {
      if (branchId) {
        const branchLeaders = await apiClient
          .get(ORGANIZATION_BRANCH_LEADERS(branchId))
          .then(
            (r) =>
              (Array.isArray(r.data) ? r.data : [])
                .map((l: { employee?: Employee }) => l.employee)
                .filter(Boolean) as Employee[]
          )
          .catch(() => [] as Employee[]);
        if (branchLeaders.length) return branchLeaders;
      }
      return apiClient
        .get(EMPLOYEES_LIST, {
          params: {
            multi_org_employee_role: ['deputy', 'ministr'],
            include_multi_org: true,
            size: 100,
            ...(branchId ? { organization_branch_id: branchId } : {}),
          },
        })
        .then((r) => unwrapList<Employee>(r.data));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function letterSubmittersQuery(branchId: number | undefined, enabled: boolean) {
  return queryOptions({
    queryKey: ['letter-submitters', branchId] as const,
    enabled,
    queryFn: () => fetchAllEmployees(branchId),
    staleTime: 5 * 60 * 1000,
  });
}

export function orgBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ['org-branches'] as const,
    enabled,
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name: string; region: string }>(r.data)),
    staleTime: 10 * 60 * 1000,
  });
}
