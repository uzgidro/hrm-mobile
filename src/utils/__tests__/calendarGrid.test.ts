import dayjs from 'dayjs';
import { buildMonthCells, stepHour, stepMinute, WEEK_DAY_INDEXES } from '../calendarGrid';

describe('buildMonthCells', () => {
  it('pads a month starting on a Friday with 4 leading nulls (Monday-first)', () => {
    // 2026-05-01 is a Friday → Mon,Tue,Wed,Thu are blank
    const cells = buildMonthCells(dayjs('2026-05-01'));
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toBe(1);
  });

  it('does not pad a month starting on a Monday', () => {
    // 2026-06-01 is a Monday
    const cells = buildMonthCells(dayjs('2026-06-01'));
    expect(cells[0]).toBe(1);
  });

  it('pads a month starting on a Sunday with 6 leading nulls (Monday-first)', () => {
    // 2026-11-01 is a Sunday
    const cells = buildMonthCells(dayjs('2026-11-01'));
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(cells[6]).toBe(1);
  });

  it('pads a month starting mid-week (Wednesday) with 2 leading nulls', () => {
    // 2026-07-01 is a Wednesday
    const cells = buildMonthCells(dayjs('2026-07-01'));
    expect(cells.slice(0, 2)).toEqual([null, null]);
    expect(cells[2]).toBe(1);
  });

  it('ends on the last day of the month', () => {
    const cells = buildMonthCells(dayjs('2026-05-01'));
    expect(cells[cells.length - 1]).toBe(31);
  });

  it('handles February in a leap year', () => {
    const cells = buildMonthCells(dayjs('2028-02-01'));
    expect(cells[cells.length - 1]).toBe(29);
  });
});

describe('stepHour / stepMinute wrap around', () => {
  it('wraps the hour past midnight in both directions', () => {
    expect(stepHour(23, 1)).toBe(0);
    expect(stepHour(0, -1)).toBe(23);
  });

  it('wraps the minute past the hour in both directions', () => {
    expect(stepMinute(59, 1)).toBe(0);
    expect(stepMinute(0, -1)).toBe(59);
  });

  it('steps normally away from the boundary', () => {
    expect(stepHour(10, 1)).toBe(11);
    expect(stepMinute(30, -1)).toBe(29);
  });
});

describe('WEEK_DAY_INDEXES', () => {
  it('is Monday-first with Sunday last', () => {
    expect(WEEK_DAY_INDEXES).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
