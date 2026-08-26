// Pure attendance-roster logic shared by AttendanceDetailScreen (attendance
// feature) and its content preview on HomeScreen (dashboard feature).
// Extracted from the screen's useMemo so the bucketing + alphabetical
// ordering is unit-testable (RNTL 14 rule: test pure functions, not
// components). Lives in `src/utils` (not the attendance feature) so both
// features can import it without a cross-feature import — see
// `src/features/README.md`.
//
// A single flat roster is returned — every employee tagged with a status — plus
// the counts the donut needs. The screen renders ONE alphabetical list and
// filters it by the donut zone, instead of three separate status sections.
import dayjs from 'dayjs';
import type { Employee, AttendanceEvent, WorkLeave } from '@/types';
import { getMultiOrgRoles } from '@/utils/roles';

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

// Grace period past the expected start; an arrival counts as "late" only
// STRICTLY beyond it. 6 daqiqa — backend (`> effective_start + interval
// '6 minutes'`) va web bilan bir xil; ilgari bu 5 edi va aynan 09:06 da
// kelgan xodim ilovada "kechikdi", web/tabelda esa "keldi" bo'lardi.
export const LATE_THRESHOLD_MIN = 6;

/** Turniketsiz avtomatik "keldi" yuritiladigan xodim — backenddagi
 *  `is_auto_present_employee` ning aynan o'zi (ministr, yashirin xodim,
 *  masofaviy ishchi). Ular turniketdan o'tmaydi, shu sabab ro'yxatda
 *  "Kelmagan" bo'lib chiqardi — backend/tabelda esa "Keldi" (8 soat). */
export function isAutoPresentEmployee(emp: Employee): boolean {
  if (getMultiOrgRoles(emp).includes('ministr')) return true;
  return !!emp.hidden_from_regular || !!emp.is_remote_worker;
}

/** Xodimning shu kunda ish kuni bormi (working_days; ko'rsatilmagan bo'lsa
 *  Dush–Juma — backenddagi default bilan bir xil). */
function isWorkingDayFor(emp: Employee, date: string): boolean {
  const dow = (dayjs(date).day() + 6) % 7; // 0 = dushanba
  const days = emp.working_days ?? [0, 1, 2, 3, 4];
  return days.includes(dow);
}

/** Build the day's roster from employees + turnstile events + team leaves.
 *  `leaveFallback` is the label used when a WorkLeave has no `type`.
 *
 *  `excusedEmployeeIds` — backend aytgan "o'sha kuni kechikish uzri bor"
 *  xodimlar (ta'til, buyruq, xizmat safari xati; `latenessExcusedQuery`).
 *  Ular hech qachon `late` bo'lmaydi: kelgan bo'lsa `present`, kelmagan bo'lsa
 *  `onLeave`. Uzr sharti backendda yagona joyda turadi — bu yerda faqat
 *  ro'yxat ayiriladi (kechikish mantig'ining nusxasi ko'paymasin). */
export function buildAttendanceRoster(
  employees: Employee[],
  events: AttendanceEvent[],
  workLeaves: WorkLeave[],
  selectedDate: string,
  leaveFallback: string,
  excusedEmployeeIds?: Iterable<number> | null,
): AttendanceRoster {
  const excused = new Set<number>(excusedEmployeeIds ?? []);
  // ГПХ ("yonlanib ishlovchi") xodim bosh sahifa/davomat ro'yxatida UMUMAN
  // ko'rinmaydi — web bilan bir xil qoida (uning davomati tabelda ALOHIDA
  // tabda yuritiladi, shtatdagilar sanog'iga qo'shilmaydi).
  const roster = employees.filter((e) => !e.is_gpx_worker);
  const empIdSet = new Set(roster.map((e) => e.id));
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

  const counts = { total: roster.length, present: 0, late: 0, onLeave: 0, absent: 0 };

  const rows: RosterRow[] = roster.map((emp) => {
    const entry = firstEntry.get(emp.id);
    const exit = lastExit.get(emp.id);
    const leaveName = leaveMap.get(emp.id);

    const isExcused = excused.has(emp.id);

    // onLeave wins only when the person has NO turnstile entry (a person who
    // came in despite an open leave is counted by their real arrival).
    if ((leaveName || isExcused) && !entry) {
      counts.onLeave += 1;
      return { employee: emp, status: 'onLeave' as const, leaveName: leaveName ?? leaveFallback };
    }
    if (!entry) {
      // Turniketsiz avto-davomat (ministr, yashirin xodim, masofaviy ishchi):
      // ish kunida turniket o'tishisiz ham "Keldi" — backend/tabel shunday
      // sanaydi, ilova esa ularni har kuni "Kelmagan" qilib ko'rsatardi.
      if (isAutoPresentEmployee(emp) && isWorkingDayFor(emp, selectedDate)) {
        counts.present += 1;
        return { employee: emp, status: 'present' as const };
      }
      counts.absent += 1;
      return { employee: emp, status: 'absent' as const };
    }
    // Uzri bor xodim kelib turniketdan o'tsa — "keldi", hech qachon "kechikdi"
    // emas (backenddagi "Kech qolganlar" ro'yxati bilan bir xil qoida).
    // `ignore_lateness` — kadr kartasidagi bayroq: bu xodimda kechikish
    // UMUMAN hisoblanmaydi (backend va web ham shunday).
    if (emp.working_hours_start && !isExcused && !emp.ignore_lateness) {
      const expected = dayjs(`${selectedDate}T${emp.working_hours_start}`);
      if (dayjs(entry).diff(expected, 'second') > LATE_THRESHOLD_MIN * 60) {
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
