import { AxiosError } from 'axios';
import i18n from '@/i18n';

// Normalized API error. The backend (FastAPI) reports failures as either
// `{ detail: "message" }` or `{ detail: [{ msg, loc }, ...] }` (validation).
// This centralizes that parsing so screens stop hand-rolling
// `e?.response?.data?.detail || 'Xatolik yuz berdi'` in every catch block.
interface ApiError {
  message: string;
  status?: number;
  detail?: unknown;
  original: unknown;
}

// Generic fallback message. Resolved lazily via a getter (not a const) so it
// follows the current app language: the value is read at call time when a caller
// omits an explicit fallback, not frozen at module load.
const defaultMessage = (): string => i18n.t('errors.generic');

/**
 * The server's `code`, translated — before falling back to its own prose.
 *
 * ⚠️ `code` USED TO BE IGNORED ENTIRELY. Every `AppException` carries
 * `{code, i18n_key, message}` and the message is written in Uzbek, so a user
 * running the app in Russian or English got Uzbek error text on every failure.
 * Looking the code up in the catalogue first fixes that for the codes we know,
 * and the server's own sentence remains the fallback for the ones we do not —
 * which is exactly what the web does.
 */
function translateCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { code?: unknown; detail?: unknown };
  // The code may sit at the top level or inside an object-shaped `detail`
  // (query guards return the latter).
  const nested = d.detail && typeof d.detail === 'object' && !Array.isArray(d.detail)
    ? (d.detail as { code?: unknown }).code
    : undefined;
  const code = typeof d.code === 'string' ? d.code : typeof nested === 'string' ? nested : null;
  if (!code) return null;
  const key = `errors.${code}`;
  const text = i18n.t(key);
  // i18next echoes the key back when it has no entry.
  return text && text !== key ? text : null;
}

function extractMessage(data: unknown): string | null {
  if (!data) return null;
  // Ba'zi javoblar JSON EMAS: shlyuz (nginx) 502/504 da HTML sahifa qaytaradi.
  // Ilgari bunday tana jimgina tashlab yuborilardi va foydalanuvchi sababsiz
  // "Xatolik" ko'rardi — endi HTML bo'lmasa matnning o'zi ko'rsatiladi.
  if (typeof data === 'string') {
    const text = data.trim();
    if (!text || text.startsWith('<')) return null;
    return text.slice(0, 300);
  }
  if (typeof data !== 'object') return null;
  const translated = translateCode(data);
  if (translated) return translated;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    const msg = first && typeof first === 'object' ? (first as { msg?: unknown }).msg : undefined;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  // ⚠️ An OBJECT-shaped `detail` ({code, message}) used to fall straight
  // through to the generic "Xatolik yuz berdi", hiding what the server said.
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const dm = (detail as { message?: unknown }).message;
    if (typeof dm === 'string' && dm.trim()) return dm;
  }
  const message = (data as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  return null;
}

/** Javobsiz uzilgan so'rov (vaqt tugadi / tarmoq yo'q) — sabab AYTILADI.
 *  Ilgari bu holat ham umumiy "Xatolik yuz berdi" bo'lib chiqardi va
 *  foydalanuvchi amal bajarilmaganini nimadan bilishni bilmasdi. */
function networkMessage(error: unknown): string | null {
  const e = error as AxiosError | undefined;
  if (!e || e.response) return null;
  if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message ?? '')) {
    return i18n.t('errors.timeout');
  }
  if (e.code === 'ERR_NETWORK' || /Network Error/i.test(e.message ?? '')) {
    return i18n.t('errors.network');
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const response = (error as AxiosError | undefined)?.response;
  const fromBody = extractMessage(response?.data);
  if (fromBody) return fromBody;
  const fromNetwork = networkMessage(error);
  if (fromNetwork) return fromNetwork;
  // Server matnsiz javob berdi (masalan shlyuzning HTML sahifasi) — hech
  // bo'lmasa HOLAT KODI ko'rsatilsin, aks holda xabar butunlay ma'nosiz.
  const base = fallback ?? defaultMessage();
  return response?.status ? `${base} (${response.status})` : base;
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
