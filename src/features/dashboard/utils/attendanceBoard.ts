// Web v2 `features/dashboard/attendance.ts` + `useDashboard.hydrateBoard` porti
// (2026-09-29). Turniket voqealari + kategoriya ro'yxatlari → bitta xodimga bitta
// qator, donut hisoblagichlari, status belgisi. Hisob-kitob web bilan AYNAN bir xil
// bo'lishi shart (paritet) — o'zgartirsangiz v2 da ham o'zgartiring.
import dayjs from 'dayjs';
import type { Employee } from '@/types';

export type BoardEvent = {
  id?: number;
  employee_id?: number;
  employee?: Employee;
  happen_time: string;
  direction_type?: 'entrance' | 'exit' | string;
  check_in_out_type?: number;
  is_granted?: boolean;
  photo_thumb_path?: string | null;
  turnstile?: { acs_dev_name?: string; name?: string } | null;
  turnstile_name?: string;
  turnstile_id?: number | null;
};

export type DayBoard = {
  day: string;
  entries: number;
  exits: number;
  total: number;
  max_id: number | null;
  people: {
    employee_id: number;
    entry_id: number | null;
    exit_id: number | null;
    last_id: number;
    last_direction: 'entry' | 'exit';
  }[];
  latest: number[];
  events: (Omit<BoardEvent, 'employee' | 'turnstile'> & { id: number })[];
  employees: Employee[];
  turnstiles: { id: number; acs_dev_name?: string; name?: string }[];
};

type CategoryEmployee = Employee & { category_name?: string | null };

export type EmployeesByCategory = {
  present_employees?: CategoryEmployee[];
  absent_employees?: CategoryEmployee[];
  late_employees?: CategoryEmployee[];
  on_vacation_employees?: CategoryEmployee[];
  on_business_trip_employees?: CategoryEmployee[];
  on_sick_leave_employees?: CategoryEmployee[];
  on_dekret_employees?: CategoryEmployee[];
  on_leave_employees?: CategoryEmployee[];
};

export type AttendanceCategory = 'present' | 'late' | 'absent' | 'vacation' | 'trip' | 'sick' | 'leave' | 'dekret';

export type AttendanceStatusKey =
  | 'present'
  | 'arrived'
  | 'left'
  | 'absent'
  | 'vacation'
  | 'trip'
  | 'sick'
  | 'leave'
  | 'dekret'
  | 'denied';

export type BoardRow = {
  id: number;
  employee: Employee;
  turnstile: string | null;
  entry: BoardEvent | null;
  exit: BoardEvent | null;
  hasExited: boolean;
  category: AttendanceCategory;
  note?: string | null;
};

/** entry=1, exit=2 — v1/v2 yo'nalish aniqlash (noma'lum → kirish). */
function eventType(e: BoardEvent): 1 | 2 {
  if (e.direction_type === 'entrance' || e.check_in_out_type === 1) return 1;
  if (e.direction_type === 'exit' || e.check_in_out_type === 2) return 2;
  const dev = (e.turnstile?.acs_dev_name || '').toLowerCase();
  if (dev.includes('chiqish') || dev.includes('exit')) return 2;
  return 1;
}

type Grouped = {
  id: number;
  employee: Employee;
  turnstile: string | null;
  entry: BoardEvent | null;
  exit: BoardEvent | null;
  lastEventType: 'entry' | 'exit' | null;
  lastEventTime: string | null;
};

function groupByEmployee(events: BoardEvent[]): Map<string, Grouped> {
  const groups = new Map<string, Grouped>();
  for (const e of events) {
    const empId = e.employee_id;
    if (!empId) continue;
    const key = String(empId);
    let g = groups.get(key);
    if (!g) {
      g = {
        id: empId,
        employee: e.employee || ({ id: empId } as Employee),
        turnstile: e.turnstile?.acs_dev_name || e.turnstile_name || e.turnstile?.name || null,
        entry: null,
        exit: null,
        lastEventType: null,
        lastEventTime: null,
      };
      groups.set(key, g);
    }
    const t = eventType(e);
    if (t === 1) {
      if (!g.entry || dayjs(e.happen_time).isBefore(dayjs(g.entry.happen_time))) g.entry = e;
    } else if (!g.exit || dayjs(e.happen_time).isAfter(dayjs(g.exit.happen_time))) {
      g.exit = e;
    }
    if (!g.lastEventTime || dayjs(e.happen_time).isAfter(dayjs(g.lastEventTime))) {
      g.lastEventTime = e.happen_time;
      g.lastEventType = t === 2 ? 'exit' : 'entry';
    }
  }
  return groups;
}

export function buildAttendanceRows(events: BoardEvent[], categorized: EmployeesByCategory | undefined): BoardRow[] {
  const grouped = groupByEmployee(events.filter((e) => !!e.employee_id));
  const rows = new Map<string, BoardRow>();
  const consume = (list: CategoryEmployee[] | undefined, category: AttendanceCategory) => {
    if (!list) return;
    for (const emp of list) {
      const key = String(emp.id);
      if (rows.has(key)) continue;
      const attended = grouped.get(key);
      const hasEvent = !!(attended?.entry || attended?.exit);
      rows.set(key, {
        id: emp.id,
        employee: emp,
        turnstile: attended?.turnstile ?? null,
        entry: attended?.entry ?? null,
        exit: attended?.exit ?? null,
        hasExited: attended?.lastEventType === 'exit',
        category: hasEvent && category === 'absent' ? 'present' : category,
        note: emp.category_name ?? null,
      });
      grouped.delete(key);
    }
  };

  // Tartib muhim: maxsus holatlar 'present' dan oldin (u ro'yxat ular bilan kesishadi).
  consume(categorized?.late_employees, 'late');
  consume(categorized?.on_vacation_employees, 'vacation');
  consume(categorized?.on_business_trip_employees, 'trip');
  consume(categorized?.on_sick_leave_employees, 'sick');
  consume(categorized?.on_dekret_employees, 'dekret');
  consume(categorized?.on_leave_employees, 'leave');
  consume(categorized?.present_employees, 'present');
  consume(categorized?.absent_employees, 'absent');

  grouped.forEach((g, key) => {
    if (rows.has(key)) return;
    rows.set(key, {
      id: g.id,
      employee: g.employee,
      turnstile: g.turnstile,
      entry: g.entry,
      exit: g.exit,
      hasExited: g.lastEventType === 'exit',
      category: 'present',
    });
  });

  return Array.from(rows.values()).sort((a, b) =>
    (a.employee.legal_name || '').toLowerCase().localeCompare((b.employee.legal_name || '').toLowerCase(), 'uz'),
  );
}

export type StatusCounts = Record<AttendanceCategory, number> & { arrived: number; other: number; total: number };

export function countByStatus(rows: BoardRow[]): StatusCounts {
  const c: Record<AttendanceCategory, number> = {
    present: 0,
    late: 0,
    absent: 0,
    vacation: 0,
    trip: 0,
    sick: 0,
    leave: 0,
    dekret: 0,
  };
  for (const r of rows) c[r.category]++;
  const arrived = c.present + c.late;
  const other = c.vacation + c.trip + c.sick + c.leave + c.dekret;
  return { ...c, arrived, other, total: arrived + c.absent + other };
}

export function countDirections(events: BoardEvent[]): { entries: number; exits: number } {
  let entries = 0;
  let exits = 0;
  for (const e of events) {
    if (eventType(e) === 1) entries++;
    else exits++;
  }
  return { entries, exits };
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

/** Belgi kaliti + ton. Ko'rinadigan matn: t(`dashboard.status.${key}`). */
export function getDisplayStatus(row: BoardRow): { key: AttendanceStatusKey; tone: StatusTone } {
  const denied = (row.entry && row.entry.is_granted === false) || (row.exit && row.exit.is_granted === false);
  if (denied) return { key: 'denied', tone: 'danger' };
  switch (row.category) {
    case 'present':
      return row.hasExited ? { key: 'left', tone: 'neutral' } : { key: 'present', tone: 'success' };
    case 'late':
      return row.hasExited ? { key: 'left', tone: 'neutral' } : { key: 'arrived', tone: 'success' };
    case 'absent':
      return { key: 'absent', tone: 'danger' };
    case 'vacation':
      return { key: 'vacation', tone: 'info' };
    case 'trip':
      return { key: 'trip', tone: 'brand' };
    case 'sick':
      return { key: 'sick', tone: 'brand' };
    case 'leave':
      return { key: 'leave', tone: 'info' };
    case 'dekret':
      return { key: 'dekret', tone: 'brand' };
  }
}

export type HydratedBoard = {
  entries: number;
  exits: number;
  maxId: number | null;
  latest: BoardEvent[];
  personEvents: BoardEvent[];
};

/** `day-board` javobi (id'lar bilan siqilgan) → xodim/turniket ulangan voqealar. */
export function hydrateDayBoard(b: DayBoard | undefined): HydratedBoard {
  if (!b) return { entries: 0, exits: 0, maxId: null, latest: [], personEvents: [] };
  const emps = new Map(b.employees.map((e) => [e.id, e]));
  const gates = new Map(b.turnstiles.map((t) => [t.id, t]));
  const byId = new Map<number, BoardEvent>();
  for (const e of b.events) {
    const gate = e.turnstile_id != null ? gates.get(e.turnstile_id) : undefined;
    byId.set(e.id, {
      ...e,
      employee: e.employee_id != null ? emps.get(e.employee_id) : undefined,
      turnstile: gate ?? null,
      turnstile_name: gate?.acs_dev_name ?? undefined,
    });
  }
  const pick = (id: number | null | undefined) => (id != null ? byId.get(id) : undefined);
  const personEvents: BoardEvent[] = [];
  for (const p of b.people) {
    const seen = new Set<number>();
    for (const id of [p.last_id, p.entry_id, p.exit_id]) {
      const ev = pick(id);
      if (ev && ev.id != null && !seen.has(ev.id)) {
        seen.add(ev.id);
        personEvents.push(ev);
      }
    }
  }
  return {
    entries: b.entries,
    exits: b.exits,
    maxId: b.max_id ?? null,
    latest: b.latest.map(pick).filter((e): e is BoardEvent => !!e),
    personEvents,
  };
}

export function formatTime(iso?: string | null): string {
  return iso ? dayjs(iso).format('HH:mm') : '—:—';
}
