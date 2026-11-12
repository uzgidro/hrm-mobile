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
type TimesheetColorKey = 'present' | 'absent' | 'warningMark' | 'primaryLight' | 'textMuted';

export interface TabelCodeMeta {
  /** dotted i18n key into the `timesheet` namespace */
  labelKey: string;
  /** palette color slot for the day cell / legend dot */
  colorKey: TimesheetColorKey;
  /** short tabel letter shown inside the day cell */
  letter: string;
}

// Canonical code → display meta. Harflar = HR tabel kodlari (backend `tabel_template.STATUS_META`,
// filial shabloni «Kodlar» varag'i bilan bir xil). 2026-10-06: ilgari bu yerda eski kirill
// harflari edi — xizmat safari «БС» chiqib HR'dagi «BS» (haqsiz ta'til) bilan, «kech qolgan» «К»
// esa HR'dagi «K» (xizmat safari) bilan adashardi. HR'da kodi soat yoki bo'sh bo'lgan holatlar
// (kelgan, kech qolgan, kelmagan, dam olish) harfsiz belgi bilan ko'rsatiladi. Filial o'z kodini
// bergan bo'lsa — `useTabelCodes()` (GET organization-branches/tabel-codes) ustun.
//
// Colours are a traffic light (2026-11-12, same as the web): present and an
// approved permission GREEN, late / early leave YELLOW, absent RED, other
// documented absences blue. The `*Mark` fills are used because `warning`
// (#89540A) is tuned for text and reads brown as a dot.
const CODE_META: Record<string, TabelCodeMeta> = {
  present: { labelKey: 'timesheet.codePresent', colorKey: 'present', letter: '✓' },
  late: { labelKey: 'timesheet.codeLate', colorKey: 'warningMark', letter: '!' },
  early_leave: { labelKey: 'timesheet.codeEarlyLeave', colorKey: 'warningMark', letter: '!' },
  absent: { labelKey: 'timesheet.codeAbsent', colorKey: 'absent', letter: '×' },
  progul: { labelKey: 'timesheet.codeProgul', colorKey: 'absent', letter: 'PR' },
  day_off: { labelKey: 'timesheet.codeDayOff', colorKey: 'textMuted', letter: '–' },
  business_trip: { labelKey: 'timesheet.codeBusinessTrip', colorKey: 'primaryLight', letter: 'K' },
  annual_leave: { labelKey: 'timesheet.codeAnnualLeave', colorKey: 'primaryLight', letter: 'OT' },
  sick_leave: { labelKey: 'timesheet.codeSickLeave', colorKey: 'primaryLight', letter: 'B' },
  unpaid_leave: { labelKey: 'timesheet.codeUnpaidLeave', colorKey: 'primaryLight', letter: 'BS' },
  tolanmaydigan_tatil: { labelKey: 'timesheet.codeNonPaidLeave', colorKey: 'primaryLight', letter: 'TT' },
  work_leave: { labelKey: 'timesheet.codeWorkLeave', colorKey: 'present', letter: '8' },
  dekret: { labelKey: 'timesheet.codeDekret', colorKey: 'primaryLight', letter: 'DT' },
  oquv_tatil: { labelKey: 'timesheet.codeStudyLeave', colorKey: 'primaryLight', letter: 'UT' },
  malaka_oshirish: { labelKey: 'timesheet.codeTraining', colorKey: 'primaryLight', letter: 'MO' },
  harbiy_xizmat: { labelKey: 'timesheet.codeMilitary', colorKey: 'primaryLight', letter: 'XX' },
  malumotnoma: { labelKey: 'timesheet.codeReference', colorKey: 'primaryLight', letter: 'MA' },
  ish_haqi_saqlangan: { labelKey: 'timesheet.codePaidAbsence', colorKey: 'primaryLight', letter: 'IT' },
  otgul: { labelKey: 'timesheet.codeOtgul', colorKey: 'primaryLight', letter: 'OG' },
  noaniq_sabab: { labelKey: 'timesheet.codeUnknownReason', colorKey: 'textMuted', letter: 'NS' },
  dismissed: { labelKey: 'timesheet.codeDismissed', colorKey: 'textMuted', letter: 'O' },
};

const UNKNOWN_META: TabelCodeMeta = { labelKey: 'timesheet.codeUnknown', colorKey: 'textMuted', letter: '?' };

/** Filial kodlari (`useTabelCodes`): kalit → HR kodi. Soat qolipi (`{hours}`) yoki bo'sh kod
 *  harf emas — u holatlarda standart belgi qoladi. */
export type TabelCodeOverrides = Readonly<Record<string, string>>;

/** Display meta for a calendar status code. Empty/unknown → neutral fallback. */
export function tabelCodeMeta(code?: string | null, overrides?: TabelCodeOverrides): TabelCodeMeta {
  if (!code) return UNKNOWN_META;
  const meta = CODE_META[code];
  const own = overrides?.[code]?.trim();
  if (own && !own.includes('{')) return { ...(meta ?? UNKNOWN_META), letter: own };
  return meta ?? UNKNOWN_META;
}

/** Resolve a code's palette color slot to a concrete hex from the theme. */
export function tabelCodeColor(code: string | null | undefined, c: ThemeColors): string {
  return c[tabelCodeMeta(code).colorKey];
}
