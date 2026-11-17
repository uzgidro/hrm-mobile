import type { WeekendRow } from '../types';
import {
  assignBody,
  entryBody,
  exportName,
  fmtDate,
  fmtHours,
  gridQuery,
  groupRows,
  hasOverride,
  parseHours,
  restDates,
  rowCells,
  shiftMonth,
} from '../utils/weekend';

const row = (over: Partial<WeekendRow> = {}): WeekendRow => ({
  employee_id: 1,
  name: 'Aliyev A.',
  department: 'Moliya',
  cells: {},
  manual_zero: [],
  days: 0,
  hours: 0,
  ...over,
});

describe('weekend helpers', () => {
  it('formats hours and dates', () => {
    expect(fmtHours(8)).toBe('8');
    expect(fmtHours(7.5)).toBe('7.5');
    expect(fmtHours(7.504)).toBe('7.5');
    expect(fmtDate('2026-11-08')).toBe('08.11.2026');
  });

  it('parses typed hours: comma allowed, 0..24 only, empty is invalid', () => {
    expect(parseHours('6,5')).toBe(6.5);
    expect(parseHours(' 0 ')).toBe(0);
    expect(parseHours('24')).toBe(24);
    expect(parseHours('')).toBeNull();
    expect(parseHours('25')).toBeNull();
    expect(parseHours('-1')).toBeNull();
    expect(parseHours('abc')).toBeNull();
  });

  it('builds the grid query with only the filters that are set', () => {
    expect(gridQuery({ year: 2026, month: 11 })).toEqual({
      year: 2026,
      month: 11,
      organization_branch_id: undefined,
      department_id: undefined,
      search: undefined,
      include_all: undefined,
    });
    expect(gridQuery({ year: 2026, month: 11, organizationBranchId: 5, departmentId: 3, search: ' ali ', includeAll: true })).toEqual({
      year: 2026,
      month: 11,
      organization_branch_id: 5,
      department_id: 3,
      search: 'ali',
      include_all: true,
    });
  });

  it('entry body: note only when typed, null hours hands the day back to the turnstile', () => {
    expect(entryBody(11, '2026-11-08', 6.5, ' x ')).toEqual({ employee_id: 11, date: '2026-11-08', hours: 6.5, note: 'x' });
    expect(entryBody(11, '2026-11-08', null, '')).toEqual({ employee_id: 11, date: '2026-11-08', hours: null });
  });

  it('assign body: sorted dates, optional order fields', () => {
    expect(
      assignBody({ employeeIds: [1, 2], dates: ['2026-11-08', '2026-11-01'], hours: 8, orderRef: ' №45 ', orderActId: 9, note: '' }),
    ).toEqual({ employee_ids: [1, 2], dates: ['2026-11-01', '2026-11-08'], hours: 8, order_ref: '№45', order_act_id: 9 });
    expect(assignBody({ employeeIds: [1], dates: ['2026-11-01'], hours: null, orderRef: '', note: '' })).toEqual({
      employee_ids: [1],
      dates: ['2026-11-01'],
      hours: null,
    });
  });

  it('row cells: dates in order, HR zeros included', () => {
    const r = row({
      cells: { '2026-11-08': { hours: 8, source: 'order', ref: '№45' }, '2026-11-01': { hours: 4, source: 'turnstile' } },
      manual_zero: ['2026-11-07'],
    });
    expect(rowCells(r).map((c) => [c.date, c.zero])).toEqual([
      ['2026-11-01', false],
      ['2026-11-07', true],
      ['2026-11-08', false],
    ]);
  });

  it('groups consecutive departments and names the empty one', () => {
    const g = groupRows([row({ department: 'A' }), row({ employee_id: 2, department: 'A' }), row({ employee_id: 3, department: null })], 'Bo‘limsiz');
    expect(g.map((x) => [x.name, x.rows.length])).toEqual([['A', 2], ['Bo‘limsiz', 1]]);
  });

  it('rest dates, override detection, month stepping, export name', () => {
    expect(restDates([{ date: 'a', day: 1, weekday: 6, rest: 'weekend' }, { date: 'b', day: 2, weekday: 0, rest: null }])).toEqual(['a']);
    expect(hasOverride({ hours: 8, source: 'turnstile' }, false)).toBe(false);
    expect(hasOverride({ hours: 8, source: 'order' }, false)).toBe(true);
    expect(hasOverride(null, true)).toBe(true);
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(exportName(2026, 3, true)).toBe('dam-olish-tabeli-2026-03-blank.xlsx');
    expect(exportName(2026, 11, false)).toBe('dam-olish-tabeli-2026-11.xlsx');
  });
});
