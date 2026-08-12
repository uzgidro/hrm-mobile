// Pure attendance-roster logic for AttendanceDetailScreen (and its preview on
// Home). Extracted from the screen's useMemo so the bucketing + alphabetical
// ordering is unit-testable (RNTL 14 rule: test pure functions, not components).
//
// A single flat roster is returned — every employee tagged with a status — plus
// the counts the donut needs. The screen renders ONE alphabetical list and
// filters it by the donut zone, instead of three separate status sections.
import dayjs from 'dayjs';
import type { Employee, AttendanceEvent, WorkLeave } from '@/types';

export type AttendanceStatus = 'present' | 'late' | 'onLeave' | 'absent';

export interface RosterRow {
  employee: Employee;
  status: AttendanceStatus;
  entryTime?: string; // ISO — first turnstile event of the day
  exitTime?: string; // ISO — last turnstile event of the day
  leaveName?: string; // set only for onLeave
}

export interface AttendanceRoster {
  rows: RosterRow[]; // ALL employees, sorted by legal_name (A→Z, locale-aware)
  counts: { total: number; present: number; late: number; onLeave: number; absent: number };
}

// Minutes past the expected start after which an arrival counts as "late".
export const LATE_THRESHOLD_MIN = 5;

/** Build the day's roster from employees + turnstile events + team leaves.
 *  `leaveFallback` is the label used when a WorkLeave has no `type`. */
export function buildAttendanceRoster(
  employees: Employee[],
  events: AttendanceEvent[],
  workLeaves: WorkLeave[],
  selectedDate: string,
  leaveFallback: string,
): AttendanceRoster {
  const empIdSet = new Set(employees.map((e) => e.id));
  const firstEntry = new Map<number, string>();
  const lastExit = new Map<number, string>();

  for (const ev of events) {
    const eid = ev.employee_id;
    if (!eid || !empIdSet.has(eid)) continue;
    const exEntry = firstEntry.get(eid);
    if (!exEntry || ev.happen_time < exEntry) firstEntry.set(eid, ev.happen_time);
    const exExit = lastExit.get(eid);
    if (!exExit || ev.happen_time > exExit) lastExit.set(eid, ev.happen_time);
  }

  const dayStart = dayjs(selectedDate).startOf('day');
  const dayEnd = dayjs(selectedDate).endOf('day');
  const leaveMap = new Map<number, string>();
  for (const l of workLeaves) {
    if (!l.employee?.id) continue;
    const s = dayjs(l.start_date);
    const e = dayjs(l.end_date);
    if (s.isBefore(dayEnd) && e.isAfter(dayStart)) leaveMap.set(l.employee.id, l.type ?? leaveFallback);
  }

  const counts = { total: employees.length, present: 0, late: 0, onLeave: 0, absent: 0 };

  const rows: RosterRow[] = employees.map((emp) => {
    const entry = firstEntry.get(emp.id);
    const exit = lastExit.get(emp.id);
    const leaveName = leaveMap.get(emp.id);

    // onLeave wins only when the person has NO turnstile entry (a person who
    // came in despite an open leave is counted by their real arrival).
    if (leaveName && !entry) {
      counts.onLeave += 1;
      return { employee: emp, status: 'onLeave' as const, leaveName };
    }
    if (!entry) {
      counts.absent += 1;
      return { employee: emp, status: 'absent' as const };
    }
    if (emp.working_hours_start) {
      const expected = dayjs(`${selectedDate}T${emp.working_hours_start}`);
      if (dayjs(entry).diff(expected, 'minute') > LATE_THRESHOLD_MIN) {
        counts.late += 1;
        return { employee: emp, status: 'late' as const, entryTime: entry, exitTime: exit };
      }
    }
    counts.present += 1;
    return { employee: emp, status: 'present' as const, entryTime: entry, exitTime: exit };
  });

  rows.sort((a, b) =>
    (a.employee.legal_name ?? '').localeCompare(b.employee.legal_name ?? '', undefined, { sensitivity: 'base' }),
  );

  return { rows, counts };
}
