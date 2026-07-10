import { AxiosError } from 'axios';
import i18n from '@/i18n';

// Normalized API error. The backend (FastAPI) reports failures as either
// `{ detail: "message" }` or `{ detail: [{ msg, loc }, ...] }` (validation).
// This centralizes that parsing so screens stop hand-rolling
// `e?.response?.data?.detail || 'Xatolik yuz berdi'` in every catch block.
export interface ApiError {
  message: string;
  status?: number;
  detail?: unknown;
  original: unknown;
}

// Generic fallback message. Resolved lazily via a getter (not a const) so it
// follows the current app language: the value is read at call time when a caller
// omits an explicit fallback, not frozen at module load.
const defaultMessage = (): string => i18n.t('errors.generic');

function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    const msg = first && typeof first === 'object' ? (first as { msg?: unknown }).msg : undefined;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  const message = (data as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  return null;
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const data = (error as AxiosError | undefined)?.response?.data;
  return extractMessage(data) ?? fallback ?? defaultMessage();
}

export function toApiError(error: unknown, fallback?: string): ApiError {
  const response = (error as AxiosError | undefined)?.response;
  return {
    message: getApiErrorMessage(error, fallback),
    status: response?.status,
    detail: (response?.data as { detail?: unknown } | undefined)?.detail,
    original: error,
  };
}
