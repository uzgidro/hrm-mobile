// Error text of the simple flow: no connection and a passport of somebody else get their own sentence.
import i18n from '@/i18n';
import { sanErrorInfo, sanErrorMessage } from '../utils/sanatorium';

/** No answer at all (offline, timeout): pressing again is safe because of `client_ref`. */
export function isOfflineError(e: unknown): boolean {
  const err = e as { response?: unknown; isAxiosError?: boolean; code?: string; message?: string } | undefined;
  return !!err && !err.response && (err.isAxiosError === true || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED');
}

export function flowErrorText(e: unknown, fallback: string): string {
  if (isOfflineError(e)) return i18n.t('sanFlow.err.offline');
  const info = sanErrorInfo(e);
  if (info.code === 'duplicate_passport' && info.params.name) return i18n.t('sanFlow.err.passportOf', { name: String(info.params.name) });
  return sanErrorMessage(e, fallback);
}
