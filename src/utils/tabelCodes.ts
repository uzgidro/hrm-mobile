// Attendance calendar CODES → display meta. The codes are backend contract
// identifiers (turnstile_attendance_event.py normalized calendar +
// CALENDAR_TO_LABEL) — never translated; only their display labels
// (`labelKey` resolved via i18n) and the short tabel LETTER localise.
//
// Lives in `src/utils` (not the timesheet feature) because the team roster
// (attendance + dashboard features) reads the same codes from
// `/turnstile-attendance-events/normalized` since 2026-09-13 and features may
// not import each other. Pure: no React, no i18n singleton.
import type { ThemeColors } from '@/theme/palettes';

// A color slot on the theme palette. We return a KEY, not a hex, so the mapping
// stays theme-agnostic and pure; the screen resolves it against `colors`.
type TimesheetColorKey = 'present' | 'warning' | 'error' | 'primaryLight' | 'textMuted';

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


/** Canonical display order of the known codes (present/late/absent first). */
export const CODE_ORDER = Object.keys(CODE_META);

export function isKnownTabelCode(code: string): boolean {
  return !!CODE_META[code];
}
