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
  /** `razryad` — by-category (backend 943ffd4) va /normalized (to'liq lavozim) beradi. */
  job_position?: { id?: number; name?: string | null; razryad?: number | null } | null;
  department?: { id?: number; name?: string | null } | null;
}

/**
 * «Mening bo'limim» tartibi (foydalanuvchi 2026-10-06): lavozim razryadi kamayish bo'yicha
 * (rahbar tepada), razryadsizlar oxirida, keyin ism — backend `sort_by_razryad` bilan bir qoida.
 */
export function compareByRazryad(a: RosterRow, b: RosterRow): number {
  const ra = a.employee.job_position?.razryad;
  const rb = b.employee.job_position?.razryad;
  if (ra != null || rb != null) {
    if (ra == null) return 1;
    if (rb == null) return -1;
    if (ra !== rb) return rb - ra;
  }
  return (a.employee.legal_name ?? '').localeCompare(b.employee.legal_name ?? '');
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
  /** Everyone who COUNTS today (expected at work, or away for a known reason), A→Z. */
  rows: RosterRow[];
  counts: { total: number; present: number; late: number; onLeave: number; absent: number };
  /**
   * People not expected today at all — day off, holiday, shift rest, otgul.
   * Kept OUT of `rows` / `counts`, exactly like web v2's DashboardPage («Bugungi
   * tabelda» = arrived + absent + other) and the server's `counted_employees_count`
   * («dam kunidagilar bo'lakka kirmaydi»). QA 2026-10-05: they were counted as
   * «so'rovda» — Davomat said 153 «7 so'rovda» while Home said 146 and 0 leave.
   * Rows carry `status: 'onLeave'` (the neutral stripe) and `code` / `leaveName` «Dam olish».
   */
  dayOff?: RosterRow[];
}

/** Codes that mean "not expected today" (web v2 `mapCalStatus` → `day_off`). */
const DAY_OFF_CODES = new Set(['day_off', 'dam_olish', 'holiday', 'off', 'otgul']);

export function isDayOffCode(code: string | undefined | null): boolean {
  return !!code && DAY_OFF_CODES.has(String(code).toLowerCase());
}

const byName = (a: RosterRow, b: RosterRow) =>
  (a.employee.legal_name ?? '').localeCompare(b.employee.legal_name ?? '', undefined, { sensitivity: 'base' });

/** Backend calendar code → donut zone. Anything that is neither presence nor
 *  absence (leave, trip, day off, holiday, dismissed …) is "onLeave": the
 *  person is not expected today for a reason the server knows. */
export function statusForCode(code: string | undefined | null): AttendanceStatus {
  if (code === 'present' || code === 'early_leave') return 'present';
  if (code === 'late') return 'late';
  // Unexcused absence with a reason attached is still an absence (v2 mapCalStatus).
  if (code === 'absent' || code === 'progul' || code === 'noaniq_sabab' || !code) return 'absent';
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

  const counts = { total: 0, present: 0, late: 0, onLeave: 0, absent: 0 };
  const out: RosterRow[] = [];
  const dayOff: RosterRow[] = [];
  for (const emp of rows) {
    const code = emp.attendance?.calendar?.[date];
    if (isDayOffCode(code)) {
      dayOff.push({ employee: emp, status: 'onLeave', code: code ?? undefined, leaveName: i18n.t(tabelCodeMeta('day_off').labelKey) });
      continue;
    }
    const status = statusForCode(code);
    counts[status] += 1;
    const row: RosterRow = { employee: emp, status, code: code ?? undefined };
    if (status === 'present' || status === 'late') {
      row.entryTime = firstEntry.get(emp.id);
      row.exitTime = lastExit.get(emp.id);
    } else if (status === 'onLeave') {
      row.leaveName = i18n.t(tabelCodeMeta(code).labelKey);
    }
    out.push(row);
  }
  counts.total = out.length;
  out.sort(byName);
  dayOff.sort(byName);
  return { rows: out, counts, dayOff };
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
  take(cats.present_employees, 'present', 'present');
  take(cats.absent_employees, 'absent', 'absent');

  // Not expected today — listed apart, never counted (v2 DashboardPage, server
  // `counted_employees_count`). Precedence unchanged: a person already placed
  // above (e.g. came in on a rest day) stays there.
  const dayOff: RosterRow[] = [];
  for (const e of cats.day_off_employees ?? []) {
    if (e.id == null || seen.has(e.id)) continue;
    seen.add(e.id);
    dayOff.push({ employee: e, status: 'onLeave', code: 'day_off', leaveName: i18n.t(tabelCodeMeta('day_off').labelKey) });
  }

  counts.total = rows.length;
  rows.sort(byName);
  dayOff.sort(byName);
  return { rows, counts, dayOff };
}

/** Keep only `ids` (the "faqat bo'ysunuvchilar" toggle) and recount. */
export function filterRoster(roster: AttendanceRoster, ids: Set<number>): AttendanceRoster {
  const rows = roster.rows.filter((r) => ids.has(r.employee.id));
  const counts = { total: rows.length, present: 0, late: 0, onLeave: 0, absent: 0 };
  for (const r of rows) counts[r.status] += 1;
  return { rows, counts, dayOff: (roster.dayOff ?? []).filter((r) => ids.has(r.employee.id)) };
}

// ── «Mening jamoam»: `GET /employees/my-team?day=` → roster ──────────────────
// Web v2 MyTeamPage source: the line manager's OWN people (direct + indirect
// reports + headed departments — server `line_manager_scope`), each with the
// day's tabel status. QA 2026-10-05: the Team screen used the branch-wide
// category endpoint and showed 153 people instead of the leader's team.
export type TeamVia = 'direct' | 'indirect' | 'department';

export interface MyTeamMember {
  id: number;
  legal_name: string;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  job_position_name?: string | null;
  department_name?: string | null;
  via: TeamVia;
  /** Tabel status for the day (present, late, absent, day_off, leave kinds…); null — none. */
  status?: string | null;
  first_in?: string | null; // "HH:mm"
  last_out?: string | null; // "HH:mm"
}

export interface MyTeamResponse {
  date: string;
  items: MyTeamMember[];
  summary: Record<string, number>;
}

/**
 * The team as a roster. A member without a status counts as a day off — v2
 * `mapCalStatus(null)` is `day_off` (the tabel engine had nothing to expect).
 * `onlyDirect` = the «faqat bo'ysunuvchilar» preference: direct reports only.
 */
export function buildRosterFromMyTeam(data: MyTeamResponse | undefined, onlyDirect = false): AttendanceRoster {
  const counts = { total: 0, present: 0, late: 0, onLeave: 0, absent: 0 };
  const rows: RosterRow[] = [];
  const dayOff: RosterRow[] = [];
  const day = data?.date;
  const at = (hhmm?: string | null) => (day && hhmm ? `${day}T${hhmm}:00` : undefined);
  for (const m of data?.items ?? []) {
    if (onlyDirect && m.via !== 'direct') continue;
    const employee: RosterEmployee = {
      id: m.id,
      legal_name: m.legal_name,
      photo_path: m.photo_path,
      photo_thumb_path: m.photo_thumb_path,
      job_position: m.job_position_name ? { name: m.job_position_name } : null,
      department: m.department_name ? { name: m.department_name } : null,
    };
    const code = m.status ?? undefined;
    if (!code || isDayOffCode(code)) {
      dayOff.push({ employee, status: 'onLeave', code: 'day_off', leaveName: i18n.t(tabelCodeMeta('day_off').labelKey) });
      continue;
    }
    const status = statusForCode(code);
    counts[status] += 1;
    const row: RosterRow = { employee, status, code };
    if (status === 'present' || status === 'late') {
      row.entryTime = at(m.first_in);
      row.exitTime = at(m.last_out);
    } else if (status === 'onLeave') {
      row.leaveName = i18n.t(tabelCodeMeta(code).labelKey);
    }
    rows.push(row);
  }
  counts.total = rows.length;
  rows.sort(byName);
  dayOff.sort(byName);
  return { rows, counts, dayOff };
}
