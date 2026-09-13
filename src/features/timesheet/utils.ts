import dayjs from 'dayjs';
import type { AttendanceEvent, AttendanceSummary } from '@/types';

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

// Code catalog moved to `@/utils/tabelCodes` (shared with the team roster);
// re-exported so the screen and tests keep importing from here.
export { tabelCodeMeta, tabelCodeColor } from '@/utils/tabelCodes';
import { CODE_ORDER, isKnownTabelCode } from '@/utils/tabelCodes';

// The DISTINCT codes present in a month's calendar, in a stable display order
// (present/late/absent first, then leave/other), so the legend only lists what
// actually occurred this month. Order index is the canonical CODE_META order.
export function legendCodesFor(calendar?: Record<string, string> | null): string[] {
  if (!calendar) return [];
  const seen = new Set(Object.values(calendar).filter(Boolean));
  const known = CODE_ORDER.filter((code) => seen.has(code));
  // any codes not in CODE_META (future backend codes) go last, sorted for stability
  const extra = [...seen].filter((code) => !isKnownTabelCode(code)).sort();
  return [...known, ...extra];
}

interface TabelSummary {
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

// ─────────────────────────────────────────────────────────────────────────────
// Раw entry/exit derivation for the day detail (Вход/Выход + Журнал). The
// normalized tabel row has no per-event times, so this works off the raw
// turnstile-attendance-events (GET /turnstile-attendance-events) that
// EmployeeCalendarScreen also uses. An event is an entry when
// direction_type==='entrance' OR check_in_out_type===1; an exit when
// direction_type==='exit' OR check_in_out_type===2 (the backend sends either).

interface DayAttendanceDetail {
  /** first entry event of the day (earliest), if any */
  firstEntry?: AttendanceEvent;
  /** last exit event of the day (latest), if any */
  lastExit?: AttendanceEvent;
  /** all of the day's events, chronologically ascending */
  journal: AttendanceEvent[];
}

const isEntry = (e: AttendanceEvent) => e.direction_type === 'entrance' || e.check_in_out_type === 1;
const isExit = (e: AttendanceEvent) => e.direction_type === 'exit' || e.check_in_out_type === 2;

export function dayAttendanceDetail(events: AttendanceEvent[], date: string): DayAttendanceDetail {
  const dayEvents = events
    .filter((e) => dayjs(e.happen_time).format('YYYY-MM-DD') === date)
    .sort((a, b) => dayjs(a.happen_time).diff(dayjs(b.happen_time)));
  const entries = dayEvents.filter(isEntry);
  const exits = dayEvents.filter(isExit);
  return {
    firstEntry: entries[0],
    lastExit: exits[exits.length - 1],
    journal: dayEvents,
  };
}
