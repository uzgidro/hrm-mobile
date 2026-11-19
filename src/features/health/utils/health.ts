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
export function initialGradeForm(row: HealthRosterRow, day: string): GradeForm {
  const status = HEALTH_STATUSES.includes(row.status as HealthStatus) ? (row.status as HealthStatus) : '';
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
