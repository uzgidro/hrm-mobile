// Pure helpers of the rest-day tabel screen (tested directly — see __tests__).
import type { AssignBody, CellSource, EntryBody, GridParams, WeekendCell, WeekendDay, WeekendRow } from '../types';

/** `8` / `7.5` — never `8.00`. */
export const fmtHours = (h: number): string => String(+Number(h).toFixed(2));

/** `2026-11-08` → `08.11.2026`. */
export const fmtDate = (iso: string): string => iso.split('-').reverse().join('.');

/** Parses a typed hours value (comma allowed). `null` when empty or outside 0..24. */
export function parseHours(text: string): number | null {
  const s = text.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 24 ? n : null;
}

/** Query of `GET /weekend-tabel` and `/export` (only the filters that are set). */
export function gridQuery(p: GridParams): Record<string, unknown> {
  return {
    year: p.year,
    month: p.month,
    organization_branch_id: p.organizationBranchId || undefined,
    department_id: p.departmentId || undefined,
    search: p.search?.trim() || undefined,
    include_all: p.includeAll || undefined,
  };
}

/** Body of `PUT /weekend-tabel/entry`; `hours: null` hands the day back to the turnstile. */
export function entryBody(employeeId: number, date: string, hours: number | null, note: string): EntryBody {
  const n = note.trim();
  return { employee_id: employeeId, date, hours, ...(n ? { note: n } : {}) };
}

/** Body of `POST /weekend-tabel/assign`. */
export function assignBody(v: {
  employeeIds: number[];
  dates: string[];
  hours: number | null;
  orderRef: string;
  orderActId?: number | null;
  note: string;
}): AssignBody {
  const ref = v.orderRef.trim();
  const note = v.note.trim();
  return {
    employee_ids: v.employeeIds,
    dates: [...v.dates].sort(),
    hours: v.hours,
    ...(ref ? { order_ref: ref } : {}),
    ...(v.orderActId ? { order_act_id: v.orderActId } : {}),
    ...(note ? { note } : {}),
  };
}

/** The cells of a row in date order, plus the days HR zeroed out. */
export type RowCell = { date: string; cell: WeekendCell | null; zero: boolean };

export function rowCells(row: WeekendRow): RowCell[] {
  const dates = new Set<string>([...Object.keys(row.cells), ...row.manual_zero]);
  return [...dates].sort().map((date) => ({ date, cell: row.cells[date] ?? null, zero: !row.cells[date] }));
}

/** Rows grouped by consecutive department (the server sorts by department, then name). */
export function groupRows(rows: WeekendRow[], noDepartment: string): { name: string; rows: WeekendRow[] }[] {
  const out: { name: string; rows: WeekendRow[] }[] = [];
  for (const r of rows) {
    const name = r.department || noDepartment;
    const last = out[out.length - 1];
    if (last && last.name === name) last.rows.push(r);
    else out.push({ name, rows: [r] });
  }
  return out;
}

/** Rest days (weekend / holiday) of the month. */
export const restDates = (days: WeekendDay[]): string[] => days.filter((d) => d.rest).map((d) => d.date);

/** Source badge tone. */
export function sourceTone(s: CellSource): 'neutral' | 'info' | 'brand' | 'warning' {
  if (s === 'manual') return 'info';
  if (s === 'import') return 'warning';
  if (s === 'order') return 'brand';
  return 'neutral';
}

/** A cell HR can hand back to the turnstile (anything that is not the plain turnstile figure). */
export function hasOverride(cell: WeekendCell | null, zero: boolean): boolean {
  return zero || (!!cell && cell.source !== 'turnstile');
}

/** Month stepping on a `{year, month}` pair (month 1..12). */
export function shiftMonth(ym: { year: number; month: number }, delta: number): { year: number; month: number } {
  const idx = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** File name the export is saved under (matches the server's own). */
export const exportName = (year: number, month: number, blank: boolean): string =>
  `dam-olish-tabeli-${year}-${String(month).padStart(2, '0')}${blank ? '-blank' : ''}.xlsx`;
