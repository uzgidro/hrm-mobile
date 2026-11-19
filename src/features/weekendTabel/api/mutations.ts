import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { appendFile, type UploadFile } from '@/api/formFile';
import { WEEKEND_TABEL_ASSIGN, WEEKEND_TABEL_ENTRY, WEEKEND_TABEL_IMPORT } from '@/api/urls';
import type { AssignBody, AssignResult, EntryBody, ImportPreview } from '../types';
import { weekendKeys } from './queries';

const meta = { skipErrorToast: true };

/** HR's word for one day (`hours: null` removes the entry — the turnstile figure applies again). */
export const saveEntry = (body: EntryBody) => apiClient.put(WEEKEND_TABEL_ENTRY, body).then((r) => r.data);

/** Designates rest-day work for many employees × dates (usually by an order). */
export const assignWork = (body: AssignBody) =>
  apiClient.post<AssignResult>(WEEKEND_TABEL_ASSIGN, body).then((r) => r.data);

/** Excel import: `dryRun` only reports what would be stored. */
export async function importExcel(v: {
  file: UploadFile;
  year: number;
  month: number;
  organizationBranchId?: number;
  dryRun: boolean;
}): Promise<ImportPreview> {
  const fd = new FormData();
  await appendFile(fd, 'file', v.file);
  const res = await apiClient.post<ImportPreview>(WEEKEND_TABEL_IMPORT, fd, {
    params: {
      year: v.year,
      month: v.month,
      organization_branch_id: v.organizationBranchId || undefined,
      dry_run: v.dryRun,
    },
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300_000,
  });
  return res.data;
}

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: weekendKeys.all });
}

export function useSaveEntry() {
  const onSuccess = useRefresh();
  return useMutation({ meta, mutationFn: saveEntry, onSuccess });
}
export function useAssignWork() {
  const onSuccess = useRefresh();
  return useMutation({ meta, mutationFn: assignWork, onSuccess });
}
export function useImportExcel() {
  const refresh = useRefresh();
  return useMutation({
    meta,
    mutationFn: importExcel,
    onSuccess: (_d, v) => (v.dryRun ? undefined : refresh()),
  });
}
