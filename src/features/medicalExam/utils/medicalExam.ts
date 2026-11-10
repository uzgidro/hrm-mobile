// Medical exam day — shapes and pure helpers shared by the employee and the doctor screens.
// Status / fitness VALUES are API enums: never translated, only their labels are (i18n).
import dayjs from 'dayjs';
import type { Tone } from '@/ui';
import type { User } from '@/types';

// ─────────────────────────────── Shapes ───────────────────────────────────

export const STATION_STATUSES = ['waiting', 'present', 'away', 'absent', 'done', 'skipped'] as const;
export type StationStatus = (typeof STATION_STATUSES)[number];
/** The only statuses a doctor / the desk can set by hand (server `STATION_MANUAL_STATUSES`). */
export const MANUAL_STATIONS = ['present', 'away', 'absent'] as const;
export type ManualStationStatus = (typeof MANUAL_STATIONS)[number];

export const VISIT_STATUSES = ['planned', 'arrived', 'in_progress', 'awaiting_head', 'finalized', 'no_show'] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const FITNESS_VALUES = ['fit', 'fit_limited', 'unfit', 'needs_followup'] as const;
export type Fitness = (typeof FITNESS_VALUES)[number];

export interface Station {
  id: number;
  specialty_id: number;
  specialty_name?: string | null;
  status: StationStatus;
  queued_at?: string | null;
  doctor_name?: string | null;
  returned?: boolean;
  skip_reason?: string | null;
  checkup_id?: number | null;
}

export interface Visit {
  id: number;
  campaign_name?: string | null;
  planned_date?: string | null;
  status: VisitStatus;
  walk_in?: boolean;
  unfinished?: boolean;
  stations_done?: number;
  stations_total?: number;
  stations?: Station[];
  final_fitness?: Fitness | null;
  final_conclusion?: string | null;
  finalized_by_name?: string | null;
  return_note?: string | null;
}

export interface MedicalQr {
  employee_id: number;
  legal_name?: string | null;
  branch_name?: string | null;
  department_name?: string | null;
  job_position_name?: string | null;
  qr: string;
}

export interface Diagnosis {
  code?: string | null;
  name: string;
}

export interface ExamCheckup {
  id: number;
  checkup_date?: string | null;
  conclusion?: string | null;
  recommendation?: string | null;
  specialty_id?: number | null;
  specialty_name?: string | null;
  doctor_name?: string | null;
  doctor_workplace?: string | null;
  doctor_is_external?: boolean;
  diagnoses?: Diagnosis[];
  fitness?: Fitness | null;
  locked?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface AnnualIndexRow {
  id?: number;
  year?: number | null;
  health_index?: string | null;
  index_note?: string | null;
}

export interface MyCheckups {
  checkups: ExamCheckup[];
  annual_indexes: AnnualIndexRow[];
}

export interface PatientRow {
  id: number;
  legal_name?: string | null;
  photo_thumb_path?: string | null;
  branch_name?: string | null;
  department_name?: string | null;
  job_position_name?: string | null;
  birth_date?: string | null;
  gender?: number | null;
}

export interface PatientCard {
  employee: PatientRow;
  checkups: ExamCheckup[];
  annual_indexes: AnnualIndexRow[];
  can_add_checkup: boolean;
  can_set_annual_index?: boolean;
  visit?: Visit | null;
  my_station_ids?: number[];
}

export interface QueueItem {
  station_id: number;
  visit_id: number;
  specialty_id: number;
  specialty_name?: string | null;
  status: StationStatus;
  returned?: boolean;
  return_note?: string | null;
  stations_done?: number;
  stations_total?: number;
  employee: {
    id: number;
    legal_name?: string | null;
    photo_thumb_path?: string | null;
    branch_name?: string | null;
    department_name?: string | null;
    job_position_name?: string | null;
  };
}

export interface QueueResponse {
  campaign: { id: number; name: string } | null;
  specialty_ids: number[];
  items: QueueItem[];
}

// ─────────────────────────────── Roles ────────────────────────────────────

/** An invited doctor: not an employee, confined by the server to a short route list. */
export const isExternalDoctor = (u?: Pick<User, 'type'> | null): boolean => u?.type === 'external-doctor';

/** Any doctor (staff or invited): may use the doctor's desk screens. */
export const isDoctor = (u?: Pick<User, 'is_doctor'> | null): boolean => u?.is_doctor === true;

/** Staff doctor: may open the «Shifokor qabuli» section. */
export function isStaffDoctor(u?: Pick<User, 'type' | 'is_doctor'> | null): boolean {
  return u?.is_doctor === true && u.type !== 'external-doctor';
}

// ─────────────────────────────── Tones ────────────────────────────────────

const STATION_TONE: Record<StationStatus, Tone> = {
  waiting: 'neutral',
  present: 'info',
  away: 'warning',
  absent: 'danger',
  done: 'success',
  skipped: 'neutral',
};
export const stationTone = (s?: string | null): Tone => STATION_TONE[s as StationStatus] ?? 'neutral';

const VISIT_TONE: Record<VisitStatus, Tone> = {
  planned: 'neutral',
  arrived: 'info',
  in_progress: 'info',
  awaiting_head: 'warning',
  finalized: 'success',
  no_show: 'danger',
};
export const visitTone = (s?: string | null): Tone => VISIT_TONE[s as VisitStatus] ?? 'neutral';

const FITNESS_TONE: Record<Fitness, Tone> = {
  fit: 'success',
  fit_limited: 'warning',
  unfit: 'danger',
  needs_followup: 'info',
};
export const fitnessTone = (f?: string | null): Tone => FITNESS_TONE[f as Fitness] ?? 'neutral';

// ─────────────────────────────── Route sheet ──────────────────────────────

/** A line is resolved once the specialist closed it or the head skipped it. */
export const isStationResolved = (s: Pick<Station, 'status'>): boolean => s.status === 'done' || s.status === 'skipped';

/** Route sheet split into what is finished and what is left (server order kept). */
export function splitRoute(stations: Station[] | null | undefined): { done: Station[]; left: Station[] } {
  const list = stations ?? [];
  return { done: list.filter(isStationResolved), left: list.filter((s) => !isStationResolved(s)) };
}

/** Header counter: the server's counters when present, otherwise derived from the lines. */
export function routeProgress(v: Pick<Visit, 'stations' | 'stations_done' | 'stations_total'>): { done: number; total: number } {
  const total = v.stations_total ?? v.stations?.length ?? 0;
  const done = v.stations_done ?? (v.stations ?? []).filter(isStationResolved).length;
  return { done, total };
}

/** Stations the doctor may set by hand: not resolved yet. */
export const canSetStationStatus = (s: Pick<Station, 'status'>): boolean => !isStationResolved(s);

// ─────────────────────────────── People ───────────────────────────────────

/** Whole years between the birth date and `now`; null for a missing, invalid or future date. */
export function ageFromBirthDate(birth: string | null | undefined, now: dayjs.ConfigType = dayjs()): number | null {
  if (!birth) return null;
  const b = dayjs(birth.slice(0, 10));
  const n = dayjs(now);
  if (!b.isValid() || !n.isValid() || b.isAfter(n, 'day')) return null;
  return n.diff(b, 'year');
}

/** employees.gender code: 1 = male, 2 = female. */
export function genderKey(g: number | null | undefined): 'male' | 'female' | null {
  return g === 1 ? 'male' : g === 2 ? 'female' : null;
}

export const fmtDate = (d?: string | null) => (d ? dayjs(d.slice(0, 10)).format('DD.MM.YYYY') : '—');

// ─────────────────────────────── Results ──────────────────────────────────

export interface YearGroup {
  year: number | null;
  checkups: ExamCheckup[];
  index: AnnualIndexRow | null;
}

/**
 * Own records grouped by year, newest year first and newest record first inside a year.
 * A year that has only an annual index (no records) still gets a group.
 */
export function groupCheckupsByYear(
  checkups: ExamCheckup[] | null | undefined,
  indexes: AnnualIndexRow[] | null | undefined,
): YearGroup[] {
  const byYear = new Map<number | null, YearGroup>();
  const slot = (year: number | null) => {
    let g = byYear.get(year);
    if (!g) {
      g = { year, checkups: [], index: null };
      byYear.set(year, g);
    }
    return g;
  };
  for (const c of checkups ?? []) {
    const y = c.checkup_date ? Number(c.checkup_date.slice(0, 4)) : NaN;
    slot(Number.isFinite(y) ? y : null).checkups.push(c);
  }
  for (const i of indexes ?? []) if (i.year != null) slot(i.year).index = i;
  const groups = [...byYear.values()];
  for (const g of groups) {
    g.checkups.sort(
      (a, b) => String(b.checkup_date ?? '').localeCompare(String(a.checkup_date ?? '')) || b.id - a.id,
    );
  }
  return groups.sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
}

/** History on the doctor's card: newest first. */
export function sortCheckups(list: ExamCheckup[] | null | undefined): ExamCheckup[] {
  return [...(list ?? [])].sort(
    (a, b) => String(b.checkup_date ?? '').localeCompare(String(a.checkup_date ?? '')) || b.id - a.id,
  );
}

/**
 * The specialty whose queue the employee just joined. The join answer is only the updated
 * visit, so find the line that changed against the previous sheet; with no previous sheet fall
 * back to the most recently queued open line.
 */
export function joinedSpecialty(prev: Visit | null | undefined, next: Visit): string | null {
  const open = (next.stations ?? []).filter((s) => s.status === 'present' || s.status === 'waiting');
  const before = new Map((prev?.stations ?? []).map((s) => [s.id, s]));
  const changed = open.filter((s) => {
    const p = before.get(s.id);
    return p ? p.status !== s.status || p.queued_at !== s.queued_at : false;
  });
  const pool = changed.length ? changed : open;
  const latest = [...pool].sort((a, b) => String(b.queued_at ?? '').localeCompare(String(a.queued_at ?? '')))[0];
  return latest?.specialty_name ?? null;
}
