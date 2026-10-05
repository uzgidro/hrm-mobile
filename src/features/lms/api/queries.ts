import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { LMS_LOGS, LMS_SETTINGS } from '@/api/urls';
import type { LmsSettings, LmsSyncLog } from '../utils/lms';

export const lmsKeys = {
  all: ['lms'] as const,
  settings: () => [...lmsKeys.all, 'settings'] as const,
  logs: (limit: number) => [...lmsKeys.all, 'logs', limit] as const,
};

/** Sozlamalar (kalitning o'zi YO'Q — faqat `has_api_key`). 403 ni qayta so'rash befoyda (v2 `retry: false`). */
export function lmsSettingsQuery(enabled = true) {
  return queryOptions({
    queryKey: lmsKeys.settings(),
    queryFn: () => apiClient.get<LmsSettings>(LMS_SETTINGS).then((r) => r.data ?? {}),
    enabled,
    retry: false,
  });
}

/** v2: oxirgi 10 ta sinxronizatsiya. */
export const LMS_LOGS_LIMIT = 10;

export function lmsLogsQuery(enabled = true) {
  return queryOptions({
    queryKey: lmsKeys.logs(LMS_LOGS_LIMIT),
    queryFn: () =>
      apiClient.get(LMS_LOGS, { params: { limit: LMS_LOGS_LIMIT } }).then((r) => unwrapList<LmsSyncLog>(r.data)),
    enabled,
    retry: false,
  });
}
