// Pure helpers of the sanatorium module: roles, dates, error text, status tones.
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { getApiErrorMessage } from '@/api/errors';
import type { User } from '@/types';
import type { Tone } from '@/ui/Chip';
import type { ApptStatus, ProcStatus, RequestStatus, SanRole, StayStatus } from '../types';

const ALL_ROLES: SanRole[] = ['registrar', 'kitchen', 'room_keeper', 'doctor', 'nurse'];

export function sanRoles(user: User | null | undefined): SanRole[] {
  return (user?.sanatorium_roles ?? []).filter((r): r is SanRole => (ALL_ROLES as string[]).includes(r));
}
export const hasSanRole = (user: User | null | undefined, ...roles: SanRole[]) => {
  const mine = sanRoles(user);
  return roles.some((r) => mine.includes(r));
};
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
  const { code, params } = sanErrorInfo(e);
  if (code) {
    const key = `sanatorium.errors.${code}`;
    const text = i18n.t(key, params as Record<string, string>);
    if (text && text !== key) return text;
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
