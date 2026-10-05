import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { REPORT_RUN } from '@/api/urls';
import type { ReportTableJson, RunBody } from '../utils/types';

/**
 * `POST reports/{code}/run` (format json). Drill ham shu yo'l: `drill` — maqsad hisobot va
 * parametrlari, `code` — ota hisobot (server ruxsatni oilasi bo'yicha tekshiradi). So'rov —
 * mutatsiya: natija keshlanmaydi, drill stack ekran holatida turadi (v2 `useReportRun`).
 */
export const runReport = ({ code, body }: { code: string; body: RunBody }) =>
  apiClient.post<ReportTableJson>(REPORT_RUN(code), body).then((r) => r.data);

export function useRunReport() {
  return useMutation({ meta: { skipErrorToast: true }, mutationFn: runReport });
}
