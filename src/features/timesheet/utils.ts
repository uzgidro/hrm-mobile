import type { AttendanceSummary } from '@/types';
import type { ThemeColors } from '@/theme/palettes';

// ─────────────────────────────────────────────────────────────────────────────
// "Мой табель" — the monthly tabel grid (GET /turnstile-attendance-events/
// normalized, one row per employee with attendance.calendar {date -> code}).
//
// The status CODES below are backend contract identifiers
// (turnstile_attendance_event.py:1752-1949 + CALENDAR_TO_LABEL) — never
// translated; only their display labels (`labelKey` resolved via i18n) and the
// short tabel LETTER localize/display. Pure functions only (no React, no i18n
// singleton) so they're unit-testable without renderHook.
// ─────────────────────────────────────────────────────────────────────────────

// A color slot on the theme palette. We return a KEY, not a hex, so the mapping
// stays theme-agnostic and pure; the screen resolves it against `colors`.
export type TimesheetColorKey = 'present' | 'warning' | 'error' | 'primaryLight' | 'textMuted';

export interface TabelCodeMeta {
  /** dotted i18n key into the `timesheet` namespace */
  labelKey: string;
  /** palette color slot for the day cell / legend dot */
  colorKey: TimesheetColorKey;
  /** short tabel letter shown inside the day cell */
  letter: string;
}

// Canonical code → display meta. Unknown codes fall back to `unknownCode` so a
// new backend code renders as a neutral cell rather than crashing.
const CODE_META: Record<string, TabelCodeMeta> = {
  present: { labelKey: 'timesheet.codePresent', colorKey: 'present', letter: '·' },
  late: { labelKey: 'timesheet.codeLate', colorKey: 'warning', letter: 'К' },
  early_leave: { labelKey: 'timesheet.codeEarlyLeave', colorKey: 'warning', letter: 'Э' },
  absent: { labelKey: 'timesheet.codeAbsent', colorKey: 'error', letter: 'Ҳ' },
  progul: { labelKey: 'timesheet.codeProgul', colorKey: 'error', letter: 'П' },
  day_off: { labelKey: 'timesheet.codeDayOff', colorKey: 'textMuted', letter: 'Д' },
  business_trip: { labelKey: 'timesheet.codeBusinessTrip', colorKey: 'primaryLight', letter: 'БС' },
  annual_leave: { labelKey: 'timesheet.codeAnnualLeave', colorKey: 'primaryLight', letter: 'ОТ' },
  sick_leave: { labelKey: 'timesheet.codeSickLeave', colorKey: 'primaryLight', letter: 'Б' },
  unpaid_leave: { labelKey: 'timesheet.codeUnpaidLeave', colorKey: 'primaryLight', letter: 'О' },
  tolanmaydigan_tatil: { labelKey: 'timesheet.codeUnpaidLeave', colorKey: 'primaryLight', letter: 'О' },
  work_leave: { labelKey: 'timesheet.codeWorkLeave', colorKey: 'primaryLight', letter: 'Р' },
  dekret: { labelKey: 'timesheet.codeDekret', colorKey: 'primaryLight', letter: 'ДТ' },
  oquv_tatil: { labelKey: 'timesheet.codeStudyLeave', colorKey: 'primaryLight', letter: 'У' },
  malaka_oshirish: { labelKey: 'timesheet.codeTraining', colorKey: 'primaryLight', letter: 'ПК' },
  harbiy_xizmat: { labelKey: 'timesheet.codeMilitary', colorKey: 'primaryLight', letter: 'ВС' },
  malumotnoma: { labelKey: 'timesheet.codeReference', colorKey: 'primaryLight', letter: 'С' },
  ish_haqi_saqlangan: { labelKey: 'timesheet.codePaidAbsence', colorKey: 'primaryLight', letter: 'ОС' },
  noaniq_sabab: { labelKey: 'timesheet.codeUnknownReason', colorKey: 'textMuted', letter: '?' },
  dismissed: { labelKey: 'timesheet.codeDismissed', colorKey: 'textMuted', letter: '—' },
};

const UNKNOWN_META: TabelCodeMeta = { labelKey: 'timesheet.codeUnknown', colorKey: 'textMuted', letter: '?' };

/** Display meta for a calendar status code. Empty/unknown → neutral fallback. */
export function tabelCodeMeta(code?: string | null): TabelCodeMeta {
  if (!code) return UNKNOWN_META;
  return CODE_META[code] ?? UNKNOWN_META;
}

/** Resolve a code's palette color slot to a concrete hex from the theme. */
export function tabelCodeColor(code: string | null | undefined, c: ThemeColors): string {
  return c[tabelCodeMeta(code).colorKey];
}

// The DISTINCT codes present in a month's calendar, in a stable display order
// (present/late/absent first, then leave/other), so the legend only lists what
// actually occurred this month. Order index is the canonical CODE_META order.
const CODE_ORDER = Object.keys(CODE_META);
export function legendCodesFor(calendar?: Record<string, string> | null): string[] {
  if (!calendar) return [];
  const seen = new Set(Object.values(calendar).filter(Boolean));
  const known = CODE_ORDER.filter((code) => seen.has(code));
  // any codes not in CODE_META (future backend codes) go last, sorted for stability
  const extra = [...seen].filter((code) => !CODE_META[code]).sort();
  return [...known, ...extra];
}

export interface TabelSummary {
  present: number;
  late: number;
  absent: number;
  hours: number;
}

// Backend-computed counts are authoritative; fall back to counting the calendar
// only when a count field is absent (older payloads). `hours` rounds to 1 dp.
export function tabelSummary(a?: AttendanceSummary | null): TabelSummary {
  if (!a) return { present: 0, late: 0, absent: 0, hours: 0 };
  const cal = a.calendar ?? {};
  const countCode = (code: string) => Object.values(cal).filter((v) => v === code).length;
  const num = (v: number | null | undefined, code: string) =>
    typeof v === 'number' ? v : countCode(code);
  return {
    present: num(a.present_days_count, 'present'),
    late: num(a.late_days_count, 'late'),
    absent: num(a.absent_days_count, 'absent'),
    hours: Math.round((a.work_duration_hours ?? 0) * 10) / 10,
  };
}
