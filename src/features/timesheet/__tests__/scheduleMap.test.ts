import { scheduleDayMap, daysForEmployee } from '../duty';
import type { WorkScheduleDay } from '@/types';

const day = (id: number, empId: number, date: string, type = '1-smena'): WorkScheduleDay => ({
  id,
  employee_id: empId,
  schedule_date: date,
  schedule_type: type,
});

describe('scheduleDayMap', () => {
  it('keys each day by `${employee_id}_${schedule_date}`', () => {
    const map = scheduleDayMap([day(1, 10, '2026-07-04'), day(2, 11, '2026-07-05')]);
    expect(map['10_2026-07-04']?.id).toBe(1);
    expect(map['11_2026-07-05']?.id).toBe(2);
  });

  it('on a duplicate (employee_id, date) keeps the highest id (latest edit wins)', () => {
    const map = scheduleDayMap([day(1, 10, '2026-07-04'), day(5, 10, '2026-07-04')]);
    expect(map['10_2026-07-04']?.id).toBe(5);
  });

  it('returns an empty map for no days', () => {
    expect(scheduleDayMap([])).toEqual({});
  });
});

describe('daysForEmployee', () => {
  it('returns only that employee`s days, sorted by date', () => {
    const days = [
      day(1, 10, '2026-07-15'),
      day(2, 11, '2026-07-04'),
      day(3, 10, '2026-07-04'),
    ];
    const mine = daysForEmployee(days, 10);
    expect(mine.map((d) => d.id)).toEqual([3, 1]); // emp 10, date-ascending
  });

  it('returns [] when the employee has no days', () => {
    expect(daysForEmployee([day(1, 10, '2026-07-04')], 99)).toEqual([]);
  });
});
