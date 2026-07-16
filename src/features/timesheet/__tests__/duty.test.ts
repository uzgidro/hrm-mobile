import {
  shiftColorKey,
  shiftColor,
  trimTime,
  timeRange,
  dutyDayMeta,
  sortScheduleDays,
  backendWeekdayToDayjs,
  shiftIndexIn,
} from '../duty';
import type { ThemeColors } from '@/theme/palettes';
import type { WorkScheduleDay } from '@/types';

describe('shiftColorKey / shiftColor', () => {
  const colors = { primaryLight: '#00f', warning: '#ff0', success: '#0f0', error: '#f00', textMuted: '#888' } as unknown as ThemeColors;

  it('assigns stable slots by shift index and cycles past the palette', () => {
    expect(shiftColorKey(0)).toBe('primaryLight');
    expect(shiftColorKey(1)).toBe('warning');
    expect(shiftColorKey(2)).toBe('success');
    expect(shiftColorKey(3)).toBe('error');
    expect(shiftColorKey(4)).toBe('primaryLight'); // cycles
  });

  it('muted for a not-found (-1) index', () => {
    expect(shiftColorKey(-1)).toBe('textMuted');
    expect(shiftColor(-1, colors)).toBe('#888');
  });
});

describe('trimTime / timeRange', () => {
  it('trims seconds off backend times', () => {
    expect(trimTime('09:00:00')).toBe('09:00');
    expect(trimTime('21:30')).toBe('21:30');
  });

  it('empty for null/undefined', () => {
    expect(trimTime(null)).toBe('');
    expect(trimTime(undefined)).toBe('');
  });

  it('builds a range and dashes a missing side', () => {
    expect(timeRange('09:00:00', '21:00:00')).toBe('09:00 – 21:00');
    expect(timeRange('09:00:00', null)).toBe('09:00 – —');
    expect(timeRange(null, null)).toBe('');
  });
});

describe('dutyDayMeta', () => {
  const day = (over: Partial<WorkScheduleDay>): WorkScheduleDay =>
    ({ id: 1, employee_id: 7, schedule_date: '2026-07-01', ...over }) as WorkScheduleDay;

  it('maps a shift day to its label and time range', () => {
    const m = dutyDayMeta(day({ schedule_type: 'K', working_hours_start: '09:00:00', working_hours_end: '21:00:00' }));
    expect(m).toEqual({ label: 'K', isDayOff: false, time: '09:00 – 21:00' });
  });

  it('marks a day off (label null, no time)', () => {
    const m = dutyDayMeta(day({ is_day_off: true, schedule_type: 'K' }));
    expect(m).toEqual({ label: null, isDayOff: true, time: '' });
  });

  it('null label for a plain working day without a shift name', () => {
    expect(dutyDayMeta(day({})).label).toBeNull();
  });
});

describe('sortScheduleDays', () => {
  const d = (id: number, date: string): WorkScheduleDay =>
    ({ id, employee_id: 7, schedule_date: date }) as WorkScheduleDay;

  it('sorts ascending by date', () => {
    const out = sortScheduleDays([d(1, '2026-07-10'), d(2, '2026-07-02'), d(3, '2026-07-05')]);
    expect(out.map((x) => x.schedule_date)).toEqual(['2026-07-02', '2026-07-05', '2026-07-10']);
  });

  it('dedupes same-date rows keeping the highest id (latest write)', () => {
    const out = sortScheduleDays([d(1, '2026-07-02'), d(5, '2026-07-02'), d(3, '2026-07-02')]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(5);
  });

  it('empty in, empty out', () => {
    expect(sortScheduleDays([])).toEqual([]);
  });
});

describe('backendWeekdayToDayjs', () => {
  it('maps backend Monday=0..Sunday=6 to dayjs Sunday=0..Saturday=6', () => {
    expect(backendWeekdayToDayjs(0)).toBe(1); // Mon
    expect(backendWeekdayToDayjs(4)).toBe(5); // Fri
    expect(backendWeekdayToDayjs(5)).toBe(6); // Sat
    expect(backendWeekdayToDayjs(6)).toBe(0); // Sun
  });
});

describe('shiftIndexIn', () => {
  const shifts = [{ name: 'Kunduzgi' }, { name: 'Tungi' }];

  it('finds the shift position by name', () => {
    expect(shiftIndexIn(shifts, 'Tungi')).toBe(1);
  });

  it('-1 for unknown/missing input', () => {
    expect(shiftIndexIn(shifts, 'Nope')).toBe(-1);
    expect(shiftIndexIn(shifts, null)).toBe(-1);
    expect(shiftIndexIn(null, 'Tungi')).toBe(-1);
    expect(shiftIndexIn(undefined, undefined)).toBe(-1);
  });
});
