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
import type { AttendanceEvent, EmployeeAttendance } from '@/types';
import { tabelCodeMeta } from './tabelCodes';
import i18n from '@/i18n';

export type AttendanceStatus = 'present' | 'late' | 'onLeave' | 'absent';

export interface RosterRow {
  employee: EmployeeAttendance;
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
