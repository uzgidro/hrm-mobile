// Pure helpers of the staff-side parity round (desk, nurse, kitchen, settings, setup, dashboard).
// Everything here is testable without React; screens only wire the results.
import dayjs from 'dayjs';
import type { User } from '@/types';
import type { Appointment, SanRole, StaffMember } from '../types';
import { formatUzPhone } from '@/utils/phone';

// ── Access ──
/** An invited («external») doctor: the server confines the account to the dashboard, desk and nurse screens. */
export const isExternalDoctorUser = (user: User | null | undefined): boolean => !!user?.external_doctor;
/** The only sanatorium routes an invited doctor may open (web EXTERNAL_TABS + «my guests», which lives on the desk). */
export const EXTERNAL_ROUTES = ['/sanatorium', '/sanatorium-doctor', '/sanatorium-nurse', '/sanatorium-my-guests', '/sanatorium-appointment', '/sanatorium-scan', '/sanatorium-guest'];
export const externalMayOpen = (route: string): boolean => EXTERNAL_ROUTES.includes(route);

// ── Dates ──
/** Monday of the week that holds `iso` (YYYY-MM-DD). */
export function mondayOf(iso: string): string {
  const d = dayjs(iso);
  return d.add(d.day() === 0 ? -6 : 1 - d.day(), 'day').format('YYYY-MM-DD');
}
/** 0 = Monday ... 6 = Sunday (the order of the `sanatorium.s2.wd.*` names). */
export const weekdayIndex = (iso: string): number => (dayjs(iso).day() + 6) % 7;

// ── Desk: finish / refer / procedure ──
export const FINISH_MAX = 4000;
export const REFER_NOTE_MAX = 2000;
export type FinishFields = { complaint: string; diagnosis: string; recommendation: string };
/** At least one non-empty field is required; no field may exceed 4000 characters. */
export function finishError(f: FinishFields): 'empty' | 'too_long' | null {
  const all = [f.complaint, f.diagnosis, f.recommendation];
  if (all.every((x) => !x.trim())) return 'empty';
  if (all.some((x) => x.trim().length > FINISH_MAX)) return 'too_long';
  return null;
}
/** Body of the finish request: empty fields go as `null`. */
export const finishBody = (f: FinishFields) => ({
  complaint: f.complaint.trim() || null,
  diagnosis: f.diagnosis.trim() || null,
  recommendation: f.recommendation.trim() || null,
});

export type ReferInput = { specialtyId: number | null; doctorId: number | null; when: string; duration: string; note: string };
/** i18n code of the first problem of a referral form (`sanStaff.desk.val.<code>` / errors), or null. */
export function referError(f: ReferInput): 'target' | 'duration' | 'note' | null {
  if (!f.specialtyId && !f.doctorId) return 'target';
  const d = Number.parseInt(f.duration, 10);
  if (!/^\d+$/.test(f.duration.trim()) || !Number.isFinite(d) || d < 5 || d > 240) return 'duration';
  if (f.note.trim().length > REFER_NOTE_MAX) return 'note';
  return null;
}
export const referDuration = (s: string): number => {
  const d = Number.parseInt(s, 10);
  return Number.isFinite(d) ? d : 20;
};
/** The referral picker lists doctor and lab specialties only (a procedure is added with «Procedure»). */
export const referSpecialties = <T extends { kind: string }>(list: T[]): T[] => list.filter((s) => s.kind !== 'procedure');
/** Doctors of the chosen specialty (all of them while none is chosen). */
export const doctorsOfSpecialty = <T extends { specialty_id?: number | null }>(list: T[], specialtyId: number | null): T[] =>
  list.filter((d) => !specialtyId || d.specialty_id === specialtyId);
/** End of a procedure may not be earlier than its start. */
export const endBeforeStart = (start: string | null, end: string | null): boolean => !!start && !!end && end < start;

export const byTime = (a: Appointment, b: Appointment): number => a.scheduled_at.localeCompare(b.scheduled_at);
export const sortByTime = (list: Appointment[]): Appointment[] => [...list].sort(byTime);

// ── My guests ──
type NamedDiet = { name?: string | null; name_uz?: string | null; name_ru?: string | null; name_en?: string | null; code?: string | null };
/** Diet name in the app language (Uzbek fallback), then the plain `name`, then the code. */
export function dietLabel(d: NamedDiet | null | undefined, lang: string): string {
  if (!d) return '';
  const l = lang === 'ru' ? 'name_ru' : lang === 'en' ? 'name_en' : 'name_uz';
  return (d[l] || d.name_uz || d.name || d.code || '').trim();
}

// ── Kitchen ──
export const KITCHEN_RANGES = [7, 14, 30] as const;
export const filterByGuestName = <T extends { guest: { full_name: string } }>(rows: T[], q: string): T[] => {
  const s = q.trim().toLowerCase();
  return s ? rows.filter((r) => r.guest.full_name.toLowerCase().includes(s)) : rows;
};
/** Food line of a stay for the kitchen: «no meals» or diet + note. */
export function foodLine(s: { with_meals: boolean; diet_note?: string | null }, dietName: string | null, noMeals: string): string {
  return s.with_meals ? [dietName, s.diet_note].filter(Boolean).join(', ') : noMeals;
}

// ── Settings: staff ──
export const STAFF_ROLE_FLAGS = ['is_registrar', 'is_room_keeper', 'is_kitchen', 'is_doctor', 'is_nurse', 'is_housekeeper'] as const;
export type StaffFlag = (typeof STAFF_ROLE_FLAGS)[number];
export const CLINICAL_FLAGS: StaffFlag[] = ['is_doctor', 'is_nurse'];
const FLAG_ROLE: Record<StaffFlag, SanRole> = {
  is_registrar: 'registrar', is_room_keeper: 'room_keeper', is_kitchen: 'kitchen', is_doctor: 'doctor', is_nurse: 'nurse', is_housekeeper: 'housekeeper',
};
export const staffRoles = (m: Partial<Record<StaffFlag, boolean | undefined>>): SanRole[] => STAFF_ROLE_FLAGS.filter((f) => m[f]).map((f) => FLAG_ROLE[f]);
export type StaffFilter = { q: string; role: SanRole | ''; active: '' | '1' | '0' };
export function filterStaff(rows: StaffMember[], f: StaffFilter): StaffMember[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((m) =>
    (!q || m.full_name.toLowerCase().includes(q)) &&
    (!f.role || staffRoles(m).includes(f.role)) &&
    (!f.active || (f.active === '1') === m.is_active));
}
/** An invited user holds clinical roles only: everything else is locked off. */
export const flagLocked = (external: boolean, flag: StaffFlag): boolean => external && !CLINICAL_FLAGS.includes(flag);
export const lockExternal = <T extends Record<StaffFlag, boolean>>(flags: T, external: boolean): T =>
  external ? { ...flags, is_registrar: false, is_room_keeper: false, is_kitchen: false, is_housekeeper: false } : flags;
/** Phone is optional; when typed it must hold a full Uzbek number (9 national digits). */
export function phoneIssue(raw: string): boolean {
  const digits = raw.replace(/\D+/g, '');
  if (!digits || digits === '998') return false;
  return !/^(998)?\d{9}$/.test(digits);
}
export const phoneValue = (raw: string): string | null => {
  const digits = raw.replace(/\D+/g, '');
  if (!digits || digits === '998') return null;
  return formatUzPhone(raw);
};
export type StaffForm = { hasPicked: boolean; flags: Record<StaffFlag, boolean>; phone: string };
export function staffError(f: StaffForm): 'user' | 'role' | 'phone' | null {
  if (!f.hasPicked) return 'user';
  if (!STAFF_ROLE_FLAGS.some((k) => f.flags[k])) return 'role';
  if (phoneIssue(f.phone)) return 'phone';
  return null;
}
/** Specialty only makes sense for a doctor; the territory point only for a doctor while the territory map is on. */
export function staffBody(f: {
  flags: Record<StaffFlag, boolean>; specialtyId: number | null; cabinet: string; phone: string; active: boolean; poiId: number | null; poiOn: boolean; userId?: number;
}) {
  return {
    ...(f.userId ? { user_id: f.userId } : {}),
    ...f.flags,
    specialty_id: f.flags.is_doctor ? f.specialtyId : null,
    cabinet: f.cabinet.trim() || null,
    phone: phoneValue(f.phone),
    is_active: f.active,
    ...(f.poiOn && f.flags.is_doctor ? { poi_id: f.poiId } : {}),
  };
}

// ── Settings: meal windows ──
/** `"08:00-09:00"` -> ['08:00', '09:00']; a single time gives an empty end. */
export function splitWindow(v: string | null | undefined): [string, string] {
  const [a = '', b = ''] = (v ?? '').split('-').map((s) => s.trim());
  return [a, b];
}
/** Window text for the server: both ends -> `from-to`, only a start -> `from`, nothing -> null (default). */
export function joinWindow(from: string, to: string): string | null {
  return from && to ? `${from}-${to}` : from || null;
}
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** A window is fine when empty, or a valid start with an optional later end. */
export function windowValid(from: string, to: string): boolean {
  if (!from) return !to;
  return HM.test(from) && (!to || (HM.test(to) && from < to));
}
/** Only the meals that have a value are sent; the server keeps the default for the others. */
export function mealTimesBody(m: Record<'breakfast' | 'lunch' | 'dinner', [string, string]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ['breakfast', 'lunch', 'dinner'] as const) {
    const v = joinWindow(m[k][0], m[k][1]);
    if (v) out[k] = v;
  }
  return out;
}
/** Hour / minute stepper of the time field: wraps around, minutes move by 5. */
export const stepTime = (hm: string, part: 'h' | 'm', dir: 1 | -1): string => {
  const [h0, m0] = (HM.test(hm) ? hm : '09:00').split(':').map(Number) as [number, number];
  const h = part === 'h' ? (h0 + dir + 24) % 24 : h0;
  const m = part === 'm' ? (m0 + dir * 5 + 60) % 60 : m0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ── Setup status ──
/** Settings tab each setup key is filled in on (the screen route comes from SETUP_ROUTES). */
export const SETUP_SETTINGS_TAB: Record<string, 'staff' | 'specialties' | 'texts' | 'visit'> = {
  doctors: 'staff', doctor_cabinets: 'staff', nurse: 'staff', room_keeper: 'staff', kitchen: 'staff', housekeeper: 'staff',
  specialties: 'specialties', contacts: 'texts', exam_hours: 'visit',
};
/** Keys the registrar cannot fill in from the app (the HRM administrator enters the bot token). */
export const SETUP_NO_LINK = ['bot_token'];
/** Keys whose `count` is how many are still MISSING (the others count what exists). */
export const SETUP_COUNT_MISSING = ['room_prices', 'doctor_cabinets'];
export type SetupLike = { key: string; ok: boolean; severity: 'required' | 'recommended'; count?: number };
/** Open items first, required before recommended; the server order is kept inside a group. */
export function sortSetup<T extends SetupLike>(items: T[]): T[] {
  const rank = (i: T) => (i.ok ? 2 : i.severity === 'required' ? 0 : 1);
  return items.map((x, n) => ({ x, n })).sort((a, b) => rank(a.x) - rank(b.x) || a.n - b.n).map((o) => o.x);
}

// ── Dashboard ──
export type DashTile = {
  key: string;
  tint: 'cyan' | 'green' | 'drop' | 'amber' | 'orange' | 'pink' | 'violet';
  icon: 'building' | 'users' | 'arrowDown' | 'arrowUp' | 'clock' | 'logout' | 'gift' | 'inbox' | 'wallet' | 'bell';
  value: string;
  hint?: { kind: 'free' | 'overdue' | 'appointments'; n: number };
  danger?: boolean;
  route?: string;
};
/** Tiles the server filled in, in the order of the web dashboard; a missing stat never shows a zero tile. */
export function dashboardTiles(s: Record<string, number | string | undefined>): DashTile[] {
  const has = (k: string) => s[k] !== undefined && s[k] !== null;
  const num = (k: string) => Number(s[k] ?? 0) || 0;
  const out: DashTile[] = [];
  if (has('occupied_beds') || has('total_beds')) out.push({ key: 'occupied_beds', tint: 'cyan', icon: 'building', value: `${num('occupied_beds')} / ${num('total_beds')}`, hint: has('free_beds') ? { kind: 'free', n: num('free_beds') } : undefined });
  if (has('in_house')) out.push({ key: 'in_house', tint: 'green', icon: 'users', value: String(num('in_house')) });
  if (has('arrivals_today')) out.push({ key: 'arrivals_today', tint: 'drop', icon: 'arrowDown', value: String(num('arrivals_today')), hint: num('overdue_arrivals') ? { kind: 'overdue', n: num('overdue_arrivals') } : undefined, danger: num('overdue_arrivals') > 0 });
  if (has('departures_today')) out.push({ key: 'departures_today', tint: 'amber', icon: 'arrowUp', value: String(num('departures_today')) });
  if (has('leaving_tomorrow')) out.push({ key: 'leaving_tomorrow', tint: 'orange', icon: 'clock', value: String(num('leaving_tomorrow')) });
  if (has('early_leaves_30d')) out.push({ key: 'early_leaves_30d', tint: 'amber', icon: 'logout', value: String(num('early_leaves_30d')), danger: num('early_leaves_30d') > 0 });
  if (has('meals_today')) out.push({ key: 'meals_today', tint: 'orange', icon: 'gift', value: String(num('meals_today')) });
  if (has('new_requests')) out.push({ key: 'new_requests', tint: 'pink', icon: 'inbox', value: String(num('new_requests')), danger: num('new_requests') > 0, route: '/sanatorium-requests' });
  if (has('debt_total')) out.push({ key: 'debt_total', tint: 'pink', icon: 'wallet', value: String(s.debt_total), danger: true });
  if (has('appointments_today')) out.push({ key: 'appointments_today', tint: 'violet', icon: 'bell', value: `${num('appointments_done')} / ${num('appointments_today')}`, hint: { kind: 'appointments', n: 0 } });
  return out;
}
/** Departures the check-out button applies to (planned_to up to today) vs tomorrow's list. */
export const splitDepartures = <T extends { planned_to: string }>(rows: T[], today: string): { today: T[]; tomorrow: T[] } => ({
  today: rows.filter((r) => r.planned_to <= today),
  tomorrow: rows.filter((r) => r.planned_to > today),
});
/** Event kind -> icon of the activity feed. */
export const EVENT_ICONS: Record<string, 'user' | 'check' | 'calendar' | 'arrowDown' | 'arrowUp' | 'logout' | 'close' | 'edit' | 'wallet' | 'lock' | 'users' | 'bell' | 'checklist' | 'doc'> = {
  registered: 'user', request_accepted: 'check', booked: 'calendar', checked_in: 'arrowDown', checked_out: 'arrowUp', early_leave: 'logout',
  cancelled: 'close', no_show: 'close', stay_changed: 'edit', payment: 'wallet', credentials: 'lock', family: 'users', appointment: 'calendar',
  appointment_moved: 'calendar', appointment_done: 'checklist', referral: 'doc', nurse_notified: 'bell', procedure: 'checklist', procedure_done: 'check',
};
export const eventIcon = (kind: string) => EVENT_ICONS[kind] ?? 'clock';
