// Pure attendance-roster logic shared by AttendanceDetailScreen (attendance
// feature), TeamScreen and its content preview on HomeScreen (dashboard
// feature). Lives in `src/utils` so both features can import it without a
// cross-feature import — see `src/features/README.md`.
//
// SOURCE OF TRUTH (2026-09-13): the SERVER. `GET /turnstile-attendance-events/
// normalized` returns one row per employee with `attendance.calendar[date]`
// already resolved — present / late / absent / day_off / business_trip / every
// leave code — using the schedule, holidays, `ignore_lateness`, remote workers
// and the lateness excuses the backend knows about. The previous client
// re-computation (employees + raw events + 20 newest work-leaves, a fixed
// 5-minute lateness threshold, and no status check on the leaves — so a
// REJECTED request counted as "on leave") is gone. Raw turnstile events are
// only used to show the first entry / last exit time on a row.
import type { AttendanceEvent, EmployeeAttendance, EmployeeCategories, EmployeeDashboardRow } from '@/types';
import { tabelCodeMeta } from './tabelCodes';
import i18n from '@/i18n';

export type AttendanceStatus = 'present' | 'late' | 'onLeave' | 'absent';

/** What a roster row needs to render (avatar, name, position/department). Both
 *  sources — a `/normalized` row (full Employee) and a
 *  `/dashboard/employees-by-category` row — satisfy it. */
export interface RosterEmployee {
  id: number;
  legal_name?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  job_position?: { id?: number; name?: string | null } | null;
  department?: { id?: number; name?: string | null } | null;
}

export interface RosterRow {
  employee: RosterEmployee;
  status: AttendanceStatus;
  /** Raw backend calendar code for the day (`present`, `sick_leave`, `day_off` …). */
  code?: string;
  entryTime?: string; // ISO — first turnstile event of the day
  exitTime?: string; // ISO — last turnstile event of the day
  leaveName?: string; // set only for onLeave (localised calendar code label)
}

export interface AttendanceRoster {
  rows: RosterRow[]; // ALL employees, sorted by legal_name (A→Z, locale-aware)
  counts: { total: number; present: number; late: number; onLeave: number; absent: number };
}

/** Backend calendar code → donut zone. Anything that is neither presence nor
 *  absence (leave, trip, day off, holiday, dismissed …) is "onLeave": the
 *  person is not expected today for a reason the server knows. */
export function statusForCode(code: string | undefined | null): AttendanceStatus {
  if (code === 'present' || code === 'early_leave') return 'present';
  if (code === 'late') return 'late';
  if (code === 'absent' || code === 'progul' || !code) return 'absent';
  return 'onLeave';
}

/** Build the day's roster from the normalized rows (+ optional raw events for
 *  entry/exit times). */
export function buildRosterFromNormalized(
  rows: EmployeeAttendance[],
  date: string,
  events: AttendanceEvent[] = [],
): AttendanceRoster {
  const { firstEntry, lastExit } = indexEvents(events);

  const counts = { total: rows.length, present: 0, late: 0, onLeave: 0, absent: 0 };
  const out: RosterRow[] = rows.map((emp) => {
    const code = emp.attendance?.calendar?.[date];
    const status = statusForCode(code);
    counts[status] += 1;
    const row: RosterRow = { employee: emp, status, code: code ?? undefined };
    if (status === 'present' || status === 'late') {
      row.entryTime = firstEntry.get(emp.id);
      row.exitTime = lastExit.get(emp.id);
    } else if (status === 'onLeave') {
      row.leaveName = i18n.t(tabelCodeMeta(code).labelKey);
    }
    return row;
  });

  out.sort((a, b) =>
    (a.employee.legal_name ?? '').localeCompare(b.employee.legal_name ?? '', undefined, { sensitivity: 'base' }),
  );
  return { rows: out, counts };
}

// ── TODAY: `/dashboard/employees-by-category` → roster ──────────────────────
// Precedence mirrors the web EmployeeDashboardPage `processList` order: a
// person may sit in several lists (late employees are also in
// present_employees; a trip may overlap), so the FIRST list wins.
function indexEvents(events: AttendanceEvent[]) {
  const firstEntry = new Map<number, string>();
  const lastExit = new Map<number, string>();
  for (const ev of events) {
    const eid = ev.employee_id;
    if (!eid) continue;
    const exEntry = firstEntry.get(eid);
    if (!exEntry || ev.happen_time < exEntry) firstEntry.set(eid, ev.happen_time);
    const exExit = lastExit.get(eid);
    if (!exExit || ev.happen_time > exExit) lastExit.set(eid, ev.happen_time);
  }
  return { firstEntry, lastExit };
}

export function buildRosterFromCategories(
  cats: EmployeeCategories,
  events: AttendanceEvent[] = [],
): AttendanceRoster {
  const { firstEntry, lastExit } = indexEvents(events);
  const carried = cats.still_inside_since ?? {};
  const seen = new Set<number>();
  const rows: RosterRow[] = [];
  const counts = { total: 0, present: 0, late: 0, onLeave: 0, absent: 0 };

  const take = (
    list: EmployeeDashboardRow[] | undefined,
    status: AttendanceStatus,
    code?: string,
    leaveName?: (e: EmployeeDashboardRow) => string | undefined,
  ) => {
    for (const e of list ?? []) {
      if (e.id == null || seen.has(e.id)) continue;
      seen.add(e.id);
      const row: RosterRow = { employee: e, status, code };
      if (status === 'present' || status === 'late') {
        // Yesterday's still-open entry shows as the entry time when there is
        // no event today (web "Kirish" column parity).
        row.entryTime = firstEntry.get(e.id) ?? carried[String(e.id)];
        row.exitTime = lastExit.get(e.id);
      } else if (status === 'onLeave') {
        row.leaveName = leaveName?.(e) ?? i18n.t(tabelCodeMeta(code).labelKey);
      }
      counts[status] += 1;
      rows.push(row);
    }
  };

  take(cats.late_employees, 'late', 'late');
  take(cats.on_vacation_employees, 'onLeave', 'annual_leave');
  take(cats.on_business_trip_employees, 'onLeave', 'business_trip');
  take(cats.on_sick_leave_employees, 'onLeave', 'sick_leave');
  take(cats.on_dekret_employees, 'onLeave', 'dekret');
  take(cats.on_leave_employees, 'onLeave', 'work_leave', (e) => e.category_name ?? undefined);
  take(cats.day_off_employees, 'onLeave', 'day_off');
  take(cats.present_employees, 'present', 'present');
  take(cats.absent_employees, 'absent', 'absent');

  counts.total = rows.length;
  rows.sort((a, b) =>
    (a.employee.legal_name ?? '').localeCompare(b.employee.legal_name ?? '', undefined, { sensitivity: 'base' }),
  );
  return { rows, counts };
}

/** Keep only `ids` (the "faqat bo'ysunuvchilar" toggle) and recount. */
export function filterRoster(roster: AttendanceRoster, ids: Set<number>): AttendanceRoster {
  const rows = roster.rows.filter((r) => ids.has(r.employee.id));
  const counts = { total: rows.length, present: 0, late: 0, onLeave: 0, absent: 0 };
  for (const r of rows) counts[r.status] += 1;
  return { rows, counts };
}
