// Pure helpers of the sanatorium module: roles, dates, error text, status tones.
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { getApiErrorMessage } from '@/api/errors';
import type { User } from '@/types';
import type { Tone } from '@/ui/Chip';
import type { ApptStatus, ProcStatus, RequestStatus, SanRole, StayStatus } from '../types';

const ALL_ROLES: SanRole[] = ['registrar', 'kitchen', 'room_keeper', 'doctor', 'nurse', 'housekeeper'];

export function sanRoles(user: User | null | undefined): SanRole[] {
  return (user?.sanatorium_roles ?? []).filter((r): r is SanRole => (ALL_ROLES as string[]).includes(r));
}
export const hasSanRole = (user: User | null | undefined, ...roles: SanRole[]) => {
  const mine = sanRoles(user);
  return roles.some((r) => mine.includes(r));
};
/** View-only account (the chairman): sees what the registrar sees, the server refuses every write. */
export const isSanReadOnly = (user: User | null | undefined) => user?.sanatorium_read_only === true;
/** May CHANGE data as one of `roles` — hasSanRole() minus the view-only account. Use for every write control. */
export const canSanWrite = (user: User | null | undefined, ...roles: SanRole[]) =>
  !isSanReadOnly(user) && hasSanRole(user, ...roles);
export const canSeeSanatorium = (user: User | null | undefined) => sanRoles(user).length > 0;

export const todayIso = () => dayjs().format('YYYY-MM-DD');
export const addDays = (iso: string, n: number) => dayjs(iso).add(n, 'day').format('YYYY-MM-DD');
export const fmtDate = (iso?: string | null) => (iso ? dayjs(iso).format('DD.MM.YYYY') : '—');
export const fmtTime = (iso?: string | null) => (iso ? dayjs(iso).format('HH:mm') : '—');
export const fmtDateTime = (iso?: string | null) => (iso ? dayjs(iso).format('DD.MM.YYYY HH:mm') : '—');
/** Local, zone-less datetime the backend expects (`2026-11-14T10:30:00`). */
export const toLocalIso = (d: string | Date | dayjs.Dayjs) => dayjs(d).format('YYYY-MM-DDTHH:mm:ss');

/** AA1234567 -> AA •••• 567: the full number is never needed on screen. */
export function maskPassport(p?: string | null): string {
  const s = (p ?? '').trim();
  if (s.length < 6) return s ? '••••' : '';
  return `${s.slice(0, 2)} ••••${s.slice(-3)}`;
}

/** Machine `code` (and `params`) of a sanatorium API error: `{detail:{code, params}}`. */
export function sanErrorInfo(e: unknown): { code: string | null; params: Record<string, unknown> } {
  const data = (e as { response?: { data?: unknown } } | undefined)?.response?.data as
    | { code?: unknown; params?: unknown; detail?: unknown }
    | undefined;
  const d = data && typeof data.detail === 'object' && data.detail && !Array.isArray(data.detail) ? (data.detail as Record<string, unknown>) : null;
  const code = typeof d?.code === 'string' ? d.code : typeof data?.code === 'string' ? data.code : null;
  const params = (d?.params ?? data?.params) as Record<string, unknown> | undefined;
  return { code, params: params && typeof params === 'object' ? params : {} };
}

/** `sanatorium.errors.<code>` first (translated, with params), then the generic API text. */
export function sanErrorMessage(e: unknown, fallback?: string): string {
  const err = e as { response?: { data?: { detail?: unknown } }; isAxiosError?: boolean; code?: string } | undefined;
  // No answer at all: it is the connection, not the data.
  if (err && !err.response && (err.isAxiosError === true || err.code === 'ERR_NETWORK')) return i18n.t('sanFlow.err.noNet');
  // The server's own validation sentences are English and name body keys: the fields are named in words instead.
  if (Array.isArray(err?.response?.data?.detail)) {
    const names = (err!.response!.data!.detail as { loc?: unknown[] }[]).flatMap((d) => {
      const key = [...(d?.loc ?? [])].reverse().find((x): x is string => typeof x === 'string' && x !== 'body');
      return key && i18n.exists(`sanFlow.fields.${key}`) ? [i18n.t(`sanFlow.fields.${key}`)] : [];
    });
    return names.length ? i18n.t('sanFlow.err.fields', { fields: [...new Set(names)].join(', ') }) : i18n.t('sanFlow.err.form');
  }
  const info = sanErrorInfo(e);
  const code = info.code;
  // ISO dates in the params read as DD.MM.YYYY in the message.
  const params: Record<string, unknown> = { ...info.params };
  for (const k of ['date', 'planned_to', 'planned_from']) {
    if (typeof params[k] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(params[k] as string)) params[k] = fmtDate(params[k] as string);
  }
  if (code) {
    // A variant that names the guest wins when the server sends `params.name` (guest_has_stay).
    const named = `sanSimple.errors.${code}_named`;
    if (params.name != null && i18n.exists(named)) return i18n.t(named, params as Record<string, string>);
    // room_full names the room and who is still in it (`guests` is a list of names).
    const detail = `sanSimple.errors.${code}_detail`;
    const who = Array.isArray(params.guests) ? params.guests.join(', ') : '';
    if (who && params.room_number != null && i18n.exists(detail)) return i18n.t(detail, { ...params, guests: who } as Record<string, string>);
    const key = `sanatorium.errors.${code}`;
    const text = i18n.t(key, params as Record<string, string>);
    if (text && text !== key) return text;
    // Error codes of the sections round live in their own catalog (san1.errors).
    const key1 = `san1.errors.${code}`;
    const text1 = i18n.t(key1, params as Record<string, string>);
    if (text1 && text1 !== key1) return text1;
    // Simplification round (work queue, arrival wizard, short actions).
    const key2 = `sanSimple.errors.${code}`;
    const text2 = i18n.t(key2, params as Record<string, string>);
    if (text2 && text2 !== key2) return text2;
  }
  return getApiErrorMessage(e, fallback);
}

export const stayTone = (s: StayStatus): Tone =>
  ({ booked: 'info', checked_in: 'success', checked_out: 'neutral', early_left: 'warning', cancelled: 'danger' } as const)[s];
export const apptTone = (s: ApptStatus): Tone =>
  ({ scheduled: 'info', done: 'success', cancelled: 'danger', missed: 'warning' } as const)[s];
export const procTone = (s: ProcStatus): Tone => ({ active: 'info', done: 'success', cancelled: 'danger' } as const)[s];
export const requestTone = (s: RequestStatus): Tone => ({ new: 'warning', accepted: 'success', rejected: 'danger' } as const)[s];

/** Free beds of a room over a whole period (capacity minus the busiest night). */
export function minFreeBeds(capacity: number, occupancy: number[]): number {
  return Math.max(0, capacity - Math.max(0, ...occupancy));
}

/** `14.03.1985` (also with `/`, `-`, `,`) -> `1985-03-14`; null when it is not a real past date. */
export function parseDmy(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[./,-](\d{1,2})[./,-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  // Round-trip through Date so 31.02 is rejected (no strict-parse plugin needed).
  const d = dayjs(iso);
  return d.isValid() && d.format('YYYY-MM-DD') === iso && d.isBefore(dayjs().add(1, 'day')) && d.year() >= 1900 ? iso : null;
}

/** `"1500000.00"` -> `1 500 000`; empty / missing -> an em dash. */
export function fmtMoney(v?: string | number | null): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—';
}
