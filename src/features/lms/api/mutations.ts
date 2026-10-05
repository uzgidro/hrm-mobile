import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LMS_SETTINGS, LMS_SYNC, LMS_TEST } from '@/api/urls';
import { buildLmsBody, type LmsForm, type LmsSettings } from '../utils/lms';
import { lmsKeys } from './queries';

export const saveLmsSettings = (f: LmsForm) =>
  apiClient.put<LmsSettings>(LMS_SETTINGS, buildLmsBody(f)).then((r) => r.data);

/** Platformaga ulanib ko'radi va javob beradi; hech narsani o'zgartirmaydi. */
export const testLmsConnection = () =>
  apiClient.post<{ ok?: boolean; message?: string }>(LMS_TEST, {}).then((r) => r.data ?? {});

export const syncLmsNow = () =>
  apiClient
    .post<{ status?: string; message?: string; created?: number; updated?: number }>(LMS_SYNC, {})
    .then((r) => r.data ?? {});

const meta = { skipErrorToast: true };

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: lmsKeys.all });
}

export function useSaveLmsSettings() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveLmsSettings, onSuccess });
}
export function useTestLmsConnection() {
  return useMutation({ meta, mutationFn: testLmsConnection });
}
export function useSyncLmsNow() {
  // Muvaffaqiyatsiz sinxron ham jurnalga yoziladi — tarix baribir yangilanadi.
  const onSettled = useInvalidate();
  return useMutation({ meta, mutationFn: syncLmsNow, onSettled });
}
