import type { Employee, AttendanceEvent, WorkLeave } from '@/types';
import { buildAttendanceRoster, LATE_THRESHOLD_MIN } from '../attendanceRoster';

const DATE = '2026-08-12';
const emp = (id: number, name: string, start = '09:00'): Employee =>
  ({ id, legal_name: name, working_hours_start: start } as Employee);
const event = (employee_id: number, hhmm: string): AttendanceEvent =>
  ({ employee_id, happen_time: `${DATE}T${hhmm}:00` } as AttendanceEvent);
const leave = (empId: number, type: string | null): WorkLeave =>
  ({ employee: { id: empId }, start_date: `${DATE}T00:00:00`, end_date: `${DATE}T23:59:00`, type } as WorkLeave);

describe('buildAttendanceRoster', () => {
  it('returns ONE flat roster of ALL employees sorted alphabetically', () => {
    const employees = [emp(1, 'Yusupov'), emp(2, 'Abdullayev'), emp(3, 'Karimov')];
    const { rows } = buildAttendanceRoster(employees, [], [], DATE, 'Ruxsat');
    expect(rows.map((r) => r.employee.legal_name)).toEqual(['Abdullayev', 'Karimov', 'Yusupov']);
    expect(rows).toHaveLength(3); // everyone appears, not just one status group
  });

  it('tags present when arrival is within the late threshold', () => {
    const { rows, counts } = buildAttendanceRoster([emp(1, 'A', '09:00')], [event(1, '09:03')], [], DATE, 'L');
    expect(rows[0].status).toBe('present');
    expect(rows[0].entryTime).toBe(`${DATE}T09:03:00`);
    expect(counts.present).toBe(1);
  });

  it('tags late when arrival is more than the threshold past the expected start', () => {
    // 09:00 + 5min threshold → 09:06 is late.
    const { rows, counts } = buildAttendanceRoster([emp(1, 'A', '09:00')], [event(1, '09:06')], [], DATE, 'L');
    expect(rows[0].status).toBe('late');
    expect(counts.late).toBe(1);
    expect(LATE_THRESHOLD_MIN).toBe(5);
  });

  it('tags absent when there is no turnstile entry', () => {
    const { rows, counts } = buildAttendanceRoster([emp(1, 'A')], [], [], DATE, 'L');
    expect(rows[0].status).toBe('absent');
    expect(counts.absent).toBe(1);
  });

  it('tags onLeave (with the leave label) only when there is no entry', () => {
    const { rows, counts } = buildAttendanceRoster([emp(1, 'A')], [], [leave(1, 'mehnat_tatili')], DATE, 'L');
    expect(rows[0].status).toBe('onLeave');
    expect(rows[0].leaveName).toBe('mehnat_tatili');
    expect(counts.onLeave).toBe(1);
  });

  it('an employee who came in despite an open leave counts by their arrival, not onLeave', () => {
    const { rows } = buildAttendanceRoster([emp(1, 'A', '09:00')], [event(1, '08:50')], [leave(1, 'kasal')], DATE, 'L');
    expect(rows[0].status).toBe('present');
  });

  it('falls back to the provided label when a leave has no type', () => {
    const { rows } = buildAttendanceRoster([emp(1, 'A')], [], [leave(1, null)], DATE, 'Ruxsat');
    expect(rows[0].leaveName).toBe('Ruxsat');
  });

  it('counts.total is the full employee count and the segments sum to it', () => {
    const employees = [emp(1, 'A', '09:00'), emp(2, 'B', '09:00'), emp(3, 'C'), emp(4, 'D')];
    const events = [event(1, '08:55'), event(2, '09:30')]; // A present, B late
    const leaves = [leave(3, 'kasal')]; // C onLeave; D absent
    const { counts } = buildAttendanceRoster(employees, events, leaves, DATE, 'L');
    expect(counts).toEqual({ total: 4, present: 1, late: 1, onLeave: 1, absent: 1 });
    expect(counts.present + counts.late + counts.onLeave + counts.absent).toBe(counts.total);
  });

  it('ignores events for employees outside the roster', () => {
    const { rows, counts } = buildAttendanceRoster([emp(1, 'A')], [event(999, '08:00')], [], DATE, 'L');
    expect(rows[0].status).toBe('absent');
    expect(counts.absent).toBe(1);
  });
});
