import {
  shiftColorKey,
  shiftColor,
  trimTime,
  timeRange,
  dutyDayMeta,
  sortScheduleDays,
  backendWeekdayToDayjs,
  shiftIndexIn,
  nextDutyCellState,
  DEPT_CELL_TYPES,
  deptCellCode,
  deptCellLabel,
  deptCellColorKey,
  nextDeptCellState,
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

describe('nextDutyCellState', () => {
  const shifts = [{ name: 'A', start: '08:00', end: '20:00' }, { name: 'B', start: '20:00', end: '08:00' }];

  it('empty → first shift (assign)', () => {
    expect(nextDutyCellState(undefined, shifts, false)).toEqual(
      { kind: 'assign', shiftName: 'A', isDayOff: false, start: '08:00', end: '20:00' },
    );
  });
  it('first shift → second shift', () => {
    const cur = { id: 1, employee_id: 5, schedule_date: '2026-07-10', schedule_type: 'A' };
    expect(nextDutyCellState(cur, shifts, false)).toMatchObject({ kind: 'assign', shiftName: 'B' });
  });
  it('last shift → clear when the group has no Dam', () => {
    const cur = { id: 1, employee_id: 5, schedule_date: '2026-07-10', schedule_type: 'B' };
    expect(nextDutyCellState(cur, shifts, false)).toEqual({ kind: 'clear' });
  });
  it('last shift → Dam when the group has Dam', () => {
    const cur = { id: 1, employee_id: 5, schedule_date: '2026-07-10', schedule_type: 'B' };
    expect(nextDutyCellState(cur, shifts, true)).toEqual(
      { kind: 'assign', shiftName: null, isDayOff: true, start: null, end: null },
    );
  });
  it('Dam → clear', () => {
    const cur = { id: 1, employee_id: 5, schedule_date: '2026-07-10', is_day_off: true };
    expect(nextDutyCellState(cur, shifts, true)).toEqual({ kind: 'clear' });
  });
  it('no shifts → noop', () => {
    expect(nextDutyCellState(undefined, [], false)).toEqual({ kind: 'noop' });
    expect(nextDutyCellState(undefined, null, false)).toEqual({ kind: 'noop' });
  });
});

// ── Bo'lim rejimi (department.has_navbatchilik) ──────────────────────────────
// Web NavbatchilikGrid CELL_TYPES / entryToCode / nextType bilan 1:1.

describe('dept-mode cells', () => {
  const row = (over: Partial<WorkScheduleDay>): WorkScheduleDay =>
    ({ id: 1, employee_id: 7, schedule_date: '2026-07-01', ...over }) as WorkScheduleDay;

  it('carries the web times — attendance is computed from them', () => {
    const day = DEPT_CELL_TYPES.find((t) => t.code === 'day')!;
    const night = DEPT_CELL_TYPES.find((t) => t.code === 'night')!;
    expect([day.start, day.end]).toEqual(['09:00', '21:00']);
    expect([night.start, night.end]).toEqual(['21:00', '09:00']);
  });

  describe('deptCellCode', () => {
    it('reads the stored contract code', () => {
      expect(deptCellCode(row({ schedule_type: 'day' }))).toBe('day');
      expect(deptCellCode(row({ schedule_type: 'night' }))).toBe('night');
    });
    it('is_day_off wins over schedule_type', () => {
      expect(deptCellCode(row({ is_day_off: true, schedule_type: 'day' }))).toBe('dam');
    });
    it('null for an empty cell or a row with no type', () => {
      expect(deptCellCode(undefined)).toBeNull();
      expect(deptCellCode(row({}))).toBeNull();
    });
  });

  describe('deptCellLabel', () => {
    it('maps the contract codes to the web letters', () => {
      expect(deptCellLabel(row({ schedule_type: 'day' }))).toBe('K');
      expect(deptCellLabel(row({ schedule_type: 'night' }))).toBe('T');
      expect(deptCellLabel(row({ is_day_off: true }))).toBe('D');
    });
    it('keeps an unknown/leftover type instead of blanking the cell', () => {
      expect(deptCellLabel(row({ schedule_type: 'Navbatchi' }))).toBe('Navbatchi');
      expect(deptCellLabel(row({}))).toBe('•');
    });
  });

  describe('deptCellColorKey', () => {
    it('gives each cell type a stable slot', () => {
      expect(deptCellColorKey(row({ schedule_type: 'day' }))).toBe('warning');
      expect(deptCellColorKey(row({ schedule_type: 'night' }))).toBe('primaryLight');
      expect(deptCellColorKey(row({ is_day_off: true }))).toBe('textMuted');
    });
  });

  describe('nextDeptCellState', () => {
    it('cycles empty → K → T → D → empty', () => {
      expect(nextDeptCellState(undefined)).toEqual(
        { kind: 'assign', shiftName: 'day', isDayOff: false, start: '09:00', end: '21:00' },
      );
      expect(nextDeptCellState(row({ schedule_type: 'day' }))).toEqual(
        { kind: 'assign', shiftName: 'night', isDayOff: false, start: '21:00', end: '09:00' },
      );
      expect(nextDeptCellState(row({ schedule_type: 'night' }))).toEqual(
        { kind: 'assign', shiftName: null, isDayOff: true, start: null, end: null },
      );
      expect(nextDeptCellState(row({ is_day_off: true }))).toEqual({ kind: 'clear' });
    });

    it('one tap clears an unknown leftover code (web nextType findIndex -1)', () => {
      expect(nextDeptCellState(row({ schedule_type: 'navbat' }))).toEqual({ kind: 'clear' });
    });
  });
});
