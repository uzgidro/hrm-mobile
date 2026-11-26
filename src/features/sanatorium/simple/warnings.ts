// Toasts for the warnings a short action / check-in / check-out answers with. Warnings never block;
// they tell the registrar what needs a follow-up (full room, money to give back, a new payer).
import i18n from '@/i18n';
import { toast } from '@/lib/toast';
import { fmtMoney } from '../utils/sanatorium';
import { warningsOf, type ServerWarning } from './utils';

/** Codes shown elsewhere (debt after check-out, overpayment in the payment sheet). */
const QUIET = new Set(['debt', 'overpaid']);

export function warningText(w: ServerWarning): string {
  const params = { ...w, amount: w.amount != null ? fmtMoney(w.amount as string) : '', room_number: String(w.room_number ?? ''), name: String(w.name ?? '') } as Record<string, string>;
  if (w.code === 'room_not_ready') return `${i18n.t('sanSimple.warn.room_not_ready')}${params.room_number ? `: ${params.room_number}` : ''}`;
  return i18n.t(`sanSimple.warn.${w.code}`, { ...params, defaultValue: w.code });
}

export function toastWarnings(res: unknown, skip: string[] = []): void {
  for (const w of warningsOf(res)) {
    if (QUIET.has(w.code) || skip.includes(w.code)) continue;
    toast.info(warningText(w), 8000);
  }
}
