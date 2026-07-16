import { dateRangeLabel, sortByDateFrom, isOngoing } from '../holidays';
import type { Holiday } from '@/types';

describe('dateRangeLabel', () => {
  it('renders a single day once', () => {
    expect(dateRangeLabel('2026-01-01', '2026-01-01')).toBe('1 Jan 2026');
    expect(dateRangeLabel('2026-01-01', null)).toBe('1 Jan 2026');
  });

  it('renders a same-year range with one year suffix', () => {
    expect(dateRangeLabel('2026-03-20', '2026-03-22')).toBe('20 Mar – 22 Mar 2026');
  });

  it('spells both years for a cross-year range', () => {
    expect(dateRangeLabel('2026-12-31', '2027-01-02')).toBe('31 Dec 2026 – 2 Jan 2027');
  });

  it('empty for a missing start', () => {
    expect(dateRangeLabel(null, '2026-01-01')).toBe('');
  });
});

describe('sortByDateFrom', () => {
  const h = (id: number, from: string): Holiday => ({ id, date_from: from, date_to: from });

  it('sorts ascending by start date without mutating the input', () => {
    const input = [h(1, '2026-09-01'), h(2, '2026-01-01'), h(3, '2026-03-21')];
    const out = sortByDateFrom(input);
    expect(out.map((x) => x.id)).toEqual([2, 3, 1]);
    expect(input.map((x) => x.id)).toEqual([1, 2, 3]); // untouched
  });

  it('tiebreaks equal dates by id for stability', () => {
    const out = sortByDateFrom([h(5, '2026-01-01'), h(2, '2026-01-01')]);
    expect(out.map((x) => x.id)).toEqual([2, 5]);
  });
});

describe('isOngoing', () => {
  const row: Holiday = { id: 1, date_from: '2026-03-20', date_to: '2026-03-22' };

  it('true inside the range (inclusive bounds)', () => {
    expect(isOngoing(row, '2026-03-20')).toBe(true);
    expect(isOngoing(row, '2026-03-21')).toBe(true);
    expect(isOngoing(row, '2026-03-22')).toBe(true);
  });

  it('false outside', () => {
    expect(isOngoing(row, '2026-03-19')).toBe(false);
    expect(isOngoing(row, '2026-03-23')).toBe(false);
  });

  it('repeatable holidays match by month-day regardless of the stored year', () => {
    const navruz: Holiday = { id: 2, date_from: '2024-03-21', date_to: '2024-03-21', is_repeatable: true };
    expect(isOngoing(navruz, '2026-03-21')).toBe(true);
    expect(isOngoing(navruz, '2026-03-22')).toBe(false);
  });

  it('repeatable ranges that wrap the new year match both sides', () => {
    const newYear: Holiday = { id: 3, date_from: '2023-12-31', date_to: '2024-01-02', is_repeatable: true };
    expect(isOngoing(newYear, '2026-12-31')).toBe(true);
    expect(isOngoing(newYear, '2026-01-01')).toBe(true);
    expect(isOngoing(newYear, '2026-01-02')).toBe(true);
    expect(isOngoing(newYear, '2026-01-03')).toBe(false);
    expect(isOngoing(newYear, '2026-12-30')).toBe(false);
  });

  it('non-repeatable rows still compare full dates', () => {
    const old: Holiday = { id: 4, date_from: '2024-03-21', date_to: '2024-03-21', is_repeatable: false };
    expect(isOngoing(old, '2026-03-21')).toBe(false);
  });
});
