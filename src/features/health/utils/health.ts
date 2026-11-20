// Sog'liq ko'rigi — sof mantiq (web v2 `HealthChecksPage` + `useHealthChecks`).
// Holat KODLARI (good | limited | unfit) bazaniki — tarjima qilinmaydi, faqat yorliq.
import dayjs from 'dayjs';
import type { Tone } from '@/ui';

export type HealthStatus = 'good' | 'limited' | 'unfit';
export const HEALTH_STATUSES: HealthStatus[] = ['good', 'limited', 'unfit'];
export const STATUS_TONE: Record<string, Tone> = { good: 'success', limited: 'warning', unfit: 'danger' };

/** v2 `HealthRosterRow` — xodim + SHU KUNDAGI hal qiluvchi baho (yo'q bo'lsa status null). */
export interface HealthRosterRow {
  employee_id: number;
  check_id?: number | null;
  legal_name?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  position?: string | null;
  status?: string | null;
  label?: string | null;
  note?: string | null;
  date_from?: string | null;
  date_to?: string | null;
}

export interface HealthAccess {
  can_check: boolean;
  nurse_branch_ids: number[];
}

export interface BulkResult {
  ok: number[];
  failed: { id: number; error: string }[];
}

/** Hisoblagichlar to'liq ro'yxatdan (qidiruvsiz) — v2 checked/total + unfit, mobil'da har holat. */
export function rosterCounts(rows: HealthRosterRow[]) {
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  const checked = rows.filter((r) => !!r.status).length;
  return {
    total: rows.length,
    checked,
    unchecked: rows.length - checked,
    good: by('good'),
    limited: by('limited'),
    unfit: by('unfit'),
  };
}

/** «Qolganlarini sog'lom deb belgilash» — faqat bahosi yo'qlar. */
export function ungradedIds(rows: HealthRosterRow[]): number[] {
  return rows.filter((r) => !r.status).map((r) => r.employee_id);
}

/** Server `HealthCheckBulkGrade.employee_ids` max_length=200 — undan ko'pi bo'laklarga bo'linadi. */
export const BULK_MAX = 200;

export function buildBulkBodies(ids: number[], day: string) {
  const out: { employee_ids: number[]; status: HealthStatus; date_from: string; date_to: string }[] = [];
  for (let i = 0; i < ids.length; i += BULK_MAX) {
    out.push({ employee_ids: ids.slice(i, i + BULK_MAX), status: 'good', date_from: day, date_to: day });
  }
  return out;
}

export function mergeBulkResults(parts: Partial<BulkResult>[]): BulkResult {
  return {
    ok: parts.flatMap((p) => p?.ok ?? []),
    failed: parts.flatMap((p) => p?.failed ?? []),
  };
}

/** Server rad etgan qatorlar — id o'rniga xodim ismi bilan (ro'yxatdan; topilmasa `#id`). */
export function describeFailed(failed: BulkResult['failed'], rows: HealthRosterRow[]) {
  return failed.map((f) => ({
    id: f.id,
    name: rows.find((r) => r.employee_id === f.id)?.legal_name || `#${f.id}`,
    error: f.error,
  }));
}

export interface GradeForm {
  employeeId: number;
  checkId: number | null;
  hadStatus: boolean;
  status: HealthStatus | '';
  note: string;
  /** '' — faqat shu kun (smena bahosi). */
  dateTo: string;
}

/** v2 `openForm`: tugash sanasi faqat tanlangan kundan farq qilsa ko'rsatiladi. */
export function initialGradeForm(row: HealthRosterRow, day: string, preset?: HealthStatus): GradeForm {
  // `preset` — the quick button the nurse tapped on the row (E'tibor / Kasal open the sheet with it chosen).
  const current = HEALTH_STATUSES.includes(row.status as HealthStatus) ? (row.status as HealthStatus) : '';
  const status = preset ?? current;
  return {
    employeeId: row.employee_id,
    checkId: row.check_id ?? null,
    hadStatus: !!row.status,
    status,
    note: row.note ?? '',
    dateTo: row.date_to && row.date_to !== day ? row.date_to : '',
  };
}

export function validateGrade(form: GradeForm, day: string): 'pickStatus' | 'invalidRange' | null {
  if (!form.status) return 'pickStatus';
  // Server ham rad etadi (invalid_period) — so'rovsiz aytamiz. ISO sanalar satr sifatida solishtiriladi.
  if (form.dateTo && form.dateTo < day) return 'invalidRange';
  return null;
}

/** v2 `save`: sana bo'sh — faqat SHU KUN; izoh bo'sh — null. */
export function buildGradeBody(form: GradeForm, day: string) {
  return {
    employee_id: form.employeeId,
    status: form.status,
    date_from: day,
    date_to: form.dateTo || day,
    note: form.note.trim() || null,
  };
}

/** Badge qo'shimchasi: baho boshqa kungacha amal qilsa « · DD.MM». */
export function untilSuffix(row: HealthRosterRow, day: string): string {
  return row.date_to && row.date_to !== day ? ` · ${dayjs(row.date_to).format('DD.MM')}` : '';
}

/**
 * Qaysi filial ochiladi. v2: «hamshira filiali birinchi, global tanlangani faqat
 * zaxira» — mobil'da global filial yo'q, uning o'rnini ekrandagi tanlagich bosadi.
 * `nurse_branch_ids` auth/me dan, bo'lmasa `access` javobidan.
 */
export function branchCandidates(userIds?: number[] | null, accessIds?: number[] | null): number[] {
  return userIds?.length ? userIds : (accessIds ?? []);
}

export function resolveHealthBranch(picked: number | null, candidates: number[]): number | null {
  return picked ?? candidates[0] ?? null;
}

/** Nurse's queue view: who is still waiting, who is already graded, or everyone. */
export type HealthView = 'todo' | 'done' | 'all';

export function filterByView(rows: HealthRosterRow[], view: HealthView): HealthRosterRow[] {
  if (view === 'todo') return rows.filter((r) => !r.status);
  if (view === 'done') return rows.filter((r) => !!r.status);
  return rows;
}

/**
 * Where the screen opens: a nurse lands on the queue of people still waiting; when
 * nobody is waiting (or the viewer cannot grade) the whole list is more useful.
 */
export function defaultView(canCheck: boolean, ungradedCount: number): HealthView {
  return canCheck && ungradedCount > 0 ? 'todo' : 'all';
}

export interface GradeBody {
  employee_id: number;
  status: string;
  date_from: string;
  date_to: string;
  note?: string | null;
}

/** True when a grade written for `body`'s period covers the roster `day`. ISO dates compare as strings. */
export function gradeCoversDay(body: GradeBody, day: string): boolean {
  return body.date_from <= day && day <= body.date_to;
}

/**
 * Optimistic roster: the graded row shows its new status right away (the server's
 * answer replaces it on the next refetch, including the new `check_id`).
 */
export function applyGrade(rows: HealthRosterRow[], body: GradeBody): HealthRosterRow[] {
  return rows.map((r) =>
    r.employee_id === body.employee_id
      ? {
          ...r,
          status: body.status,
          label: null,
          note: body.note ?? null,
          date_from: body.date_from,
          date_to: body.date_to,
        }
      : r,
  );
}

/** Quick period presets in the grade sheet: '' = this day only, otherwise the last day (inclusive). */
export const PERIOD_PRESETS = [0, 2, 6] as const;

export function presetEnd(day: string, extraDays: number): string {
  return extraDays ? dayjs(day).add(extraDays, 'day').format('YYYY-MM-DD') : '';
}

/**
 * Opening the health screen right after sign-in (2026-11-20): only for a nurse
 * (a branch to grade in, the module switched on), only once per signed-in user per
 * app session, and only while the user sits on the start tab — a deep link or a
 * notification tap that opened another screen is never covered.
 */
export function shouldAutoOpenHealth(p: {
  nurseBranches: number;
  moduleOn: boolean;
  onStartTab: boolean;
  alreadyOpenedFor: number | null;
  userId: number | null | undefined;
}): boolean {
  if (p.userId == null || !p.nurseBranches || !p.moduleOn || !p.onStartTab) return false;
  return p.alreadyOpenedFor !== p.userId;
}

/** «Muddati tugayapti» row (v2 `ExpiringRow`): a period ending soon with nothing newer after it. */
export interface ExpiringRow {
  check_id: number;
  employee_id: number;
  legal_name?: string | null;
  status: string;
  label?: string | null;
  date_from: string;
  date_to: string;
  days_left: number;
}

/** `health-checks/renew` answer; `apply=false` is a preview (only `items`/`skipped`). */
export interface RenewResult {
  items: { check_id: number; employee_id: number; status: string; date_from: string; date_to: string }[];
  skipped: { check_id: number; reason: string }[];
  created: number[];
  failed: { check_id: number; error: string }[];
}

/** v2 shows the expiring list for the next 14 days. */
export const EXPIRING_DAYS = 14;

export function normalizeRenew(d: Partial<RenewResult> | null | undefined): RenewResult {
  return { items: d?.items ?? [], skipped: d?.skipped ?? [], created: d?.created ?? [], failed: d?.failed ?? [] };
}
