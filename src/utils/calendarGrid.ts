// Monday-first calendar-grid math, shared by the three date/time pickers that
// each carried an identical copy (DatePicker, DateTimePicker and the leaves
// LeaveDateTimePicker).
//
// Pure by design: the grid offset `(day + 6) % 7` is a classic off-by-one
// source, so it gets direct unit tests rather than being verified through a
// rendered picker (hooks/components aren't unit-testable here under RNTL 14).
import type { Dayjs } from 'dayjs';

// Monday-first week: dayjs day() is 0=Sunday, so Sunday sorts last.
export const WEEK_DAY_INDEXES = [1, 2, 3, 4, 5, 6, 0] as const;

// Leading nulls pad the days before the 1st so the grid aligns to Monday.
export function buildMonthCells(month: Dayjs): (number | null)[] {
  const daysInMonth = month.daysInMonth();
  const firstDow = (month.day() + 6) % 7;
  return [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
}

export function stepHour(hour: number, delta: number): number {
  return (hour + delta + 24) % 24;
}

export function stepMinute(minute: number, delta: number): number {
  return (minute + delta + 60) % 60;
}
