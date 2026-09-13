import type { AttendanceEvent, EmployeeAttendance } from '@/types';
import { buildRosterFromNormalized, buildRosterFromCategories, filterRoster, statusForCode } from '../attendanceRoster';

const DATE = '2026-08-12';
const row = (id: number, name: string, code?: string): EmployeeAttendance =>
  ({ id, legal_name: name, attendance: code ? { calendar: { [DATE]: code } } : null } as unknown as EmployeeAttendance);
const event = (employee_id: number, hhmm: string): AttendanceEvent =>
  ({ employee_id, happen_time: `${DATE}T${hhmm}:00` } as AttendanceEvent);

describe('statusForCode — server calendar code → donut zone', () => {
  it('maps presence / lateness / absence', () => {
    expect(statusForCode('present')).toBe('present');
    expect(statusForCode('early_leave')).toBe('present');
    expect(statusForCode('late')).toBe('late');
    expect(statusForCode('absent')).toBe('absent');
    expect(statusForCode('progul')).toBe('absent');
    expect(statusForCode(undefined)).toBe('absent');
  });
  it('every leave / trip / day-off code is "onLeave" (not expected today for a known reason)', () => {
    for (const code of ['sick_leave', 'annual_leave', 'business_trip', 'day_off', 'dekret', 'dismissed', 'holiday'])
      expect(statusForCode(code)).toBe('onLeave');
  });
});

describe('buildRosterFromNormalized', () => {
  it('returns ONE flat roster of ALL rows sorted alphabetically with server statuses', () => {
    const { rows, counts } = buildRosterFromNormalized(
      [row(1, 'Yusupov', 'late'), row(2, 'Abdullayev', 'present'), row(3, 'Karimov', 'sick_leave'), row(4, 'Zokirov', 'absent')],
      DATE,
    );
    expect(rows.map((r) => r.employee.legal_name)).toEqual(['Abdullayev', 'Karimov', 'Yusupov', 'Zokirov']);
    expect(rows.map((r) => r.status)).toEqual(['present', 'onLeave', 'late', 'absent']);
    expect(counts).toEqual({ total: 4, present: 1, late: 1, onLeave: 1, absent: 1 });
  });

  it('attaches first-entry / last-exit times from raw events only to present/late rows', () => {
    const { rows } = buildRosterFromNormalized(
      [row(1, 'A', 'present'), row(2, 'B', 'annual_leave')],
      DATE,
      [event(1, '09:03'), event(1, '18:01'), event(1, '12:00'), event(2, '10:00')],
    );
    expect(rows[0].entryTime).toBe(`${DATE}T09:03:00`);
    expect(rows[0].exitTime).toBe(`${DATE}T18:01:00`);
    expect(rows[1].entryTime).toBeUndefined();
    expect(rows[1].leaveName).toBeTruthy();
  });

  it('a row without a calendar entry for the day counts as absent (no silent drop)', () => {
    const { rows, counts } = buildRosterFromNormalized([row(1, 'A')], DATE);
    expect(rows[0].status).toBe('absent');
    expect(counts.absent).toBe(1);
  });
});

describe('buildRosterFromCategories — /dashboard/employees-by-category (today)', () => {
  const e = (id: number, name: string, extra: Record<string, unknown> = {}) => ({ id, legal_name: name, ...extra });
  it('maps the category lists with the web precedence (late wins over present; first list wins)', () => {
    const { rows, counts } = buildRosterFromCategories(
      {
        late_employees: [e(1, 'Kech')],
        present_employees: [e(1, 'Kech'), e(2, 'Ishda')],
        absent_employees: [e(3, 'Yoq')],
        day_off_employees: [e(4, 'Dam')],
        on_vacation_employees: [e(5, 'Tatil')],
        on_leave_employees: [e(6, 'Ruxsat', { category_name: "Ma'lumotnoma" })],
      },
      [event(1, '09:40'), event(2, '08:55'), event(2, '18:10')],
    );
    const byId = Object.fromEntries(rows.map((r) => [r.employee.id, r]));
    expect(byId[1].status).toBe('late');
    expect(byId[1].entryTime).toBe(`${DATE}T09:40:00`);
    expect(byId[2].status).toBe('present');
    expect(byId[2].exitTime).toBe(`${DATE}T18:10:00`);
    expect(byId[3].status).toBe('absent');
    expect(byId[4].status).toBe('onLeave');
    expect(byId[5].status).toBe('onLeave');
    expect(byId[6].leaveName).toBe("Ma'lumotnoma");
    expect(counts).toEqual({ total: 6, present: 1, late: 1, onLeave: 3, absent: 1 });
    expect(rows.map((r) => r.employee.legal_name)).toEqual(['Dam', 'Ishda', 'Kech', 'Ruxsat', 'Tatil', 'Yoq']);
  });

  it("uses yesterday's still-open entry as the entry time when there is no event today", () => {
    const { rows } = buildRosterFromCategories(
      { present_employees: [e(9, 'Tunda')], still_inside_since: { '9': '2026-08-11T22:10:00' } },
      [],
    );
    expect(rows[0].entryTime).toBe('2026-08-11T22:10:00');
  });

  it('filterRoster keeps only the given ids and recounts', () => {
    const full = buildRosterFromCategories({ present_employees: [e(1, 'A'), e(2, 'B')], absent_employees: [e(3, 'C')] });
    const mine = filterRoster(full, new Set([2, 3]));
    expect(mine.rows.map((r) => r.employee.id)).toEqual([2, 3]);
    expect(mine.counts).toEqual({ total: 2, present: 1, late: 0, onLeave: 0, absent: 1 });
  });
});
