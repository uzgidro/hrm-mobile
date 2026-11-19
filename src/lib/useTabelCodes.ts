// HR tabel kodlari (backend `GET organization-branches/tabel-codes`): xodim filialining kodlari —
// standart HR jadvali + filial shabloni «Kodlar» varag'idagi o'zgarishlar. `tabelCodeMeta(code,
// overrides)` shu xaritani oladi; eski server (404) yoki tarmoq xatosida — ichki HR standartlari.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { TABEL_CODES } from '@/api/urls';
import type { TabelCodeOverrides } from '@/utils/tabelCodes';

export interface TabelCodeRow {
  key: string;
  code: string;
  label: string;
  full_day?: boolean;
}

export function tabelCodesQueryOptions(orgBranchId?: number) {
  return {
    queryKey: ['tabel-codes', orgBranchId ?? null] as const,
    queryFn: () =>
      apiClient
        .get<{ items: TabelCodeRow[] }>(TABEL_CODES, { params: orgBranchId ? { organization_branch_id: orgBranchId } : undefined })
        .then((r) => r.data?.items ?? []),
    staleTime: 60 * 60 * 1000,
    retry: false,
  };
}

export function toOverrides(rows: TabelCodeRow[] | undefined): TabelCodeOverrides {
  const out: Record<string, string> = {};
  for (const r of rows ?? []) if (r?.key) out[r.key] = r.code ?? '';
  return out;
}

export function useTabelCodes(orgBranchId?: number): TabelCodeOverrides {
  const q = useQuery(tabelCodesQueryOptions(orgBranchId));
  return useMemo(() => toOverrides(q.data), [q.data]);
}
