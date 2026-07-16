import {
  tabelCodeMeta,
  tabelCodeColor,
  legendCodesFor,
  tabelSummary,
} from '../utils';
import type { ThemeColors } from '@/theme/palettes';
import type { AttendanceSummary } from '@/types';

describe('tabelCodeMeta', () => {
  it('maps known codes to a label key, color slot and tabel letter', () => {
    expect(tabelCodeMeta('present')).toEqual({ labelKey: 'timesheet.codePresent', colorKey: 'present', letter: '·' });
    expect(tabelCodeMeta('late').colorKey).toBe('warning');
    expect(tabelCodeMeta('absent').colorKey).toBe('error');
    expect(tabelCodeMeta('annual_leave').letter).toBe('ОТ');
    expect(tabelCodeMeta('business_trip').colorKey).toBe('primaryLight');
  });

  it('falls back to a neutral meta for empty, null or unknown codes', () => {
    const fallback = { labelKey: 'timesheet.codeUnknown', colorKey: 'textMuted', letter: '?' };
    expect(tabelCodeMeta(undefined)).toEqual(fallback);
    expect(tabelCodeMeta(null)).toEqual(fallback);
    expect(tabelCodeMeta('')).toEqual(fallback);
    expect(tabelCodeMeta('some_future_code')).toEqual(fallback);
  });

  it('maps the label-only cyrillic-letter codes (CALENDAR_TO_LABEL family)', () => {
    // these arrive from the backend's CALENDAR_TO_LABEL map
    expect(tabelCodeMeta('tolanmaydigan_tatil').letter).toBe('О');
    expect(tabelCodeMeta('progul').colorKey).toBe('error');
    expect(tabelCodeMeta('malaka_oshirish').letter).toBe('ПК');
  });
});

describe('tabelCodeColor', () => {
  const colors = { present: '#0f0', warning: '#ff0', error: '#f00', primaryLight: '#00f', textMuted: '#888' } as unknown as ThemeColors;

  it('resolves a code to a concrete hex off the theme palette', () => {
    expect(tabelCodeColor('present', colors)).toBe('#0f0');
    expect(tabelCodeColor('late', colors)).toBe('#ff0');
    expect(tabelCodeColor('absent', colors)).toBe('#f00');
    expect(tabelCodeColor('annual_leave', colors)).toBe('#00f');
  });

  it('resolves unknown codes to the muted slot', () => {
    expect(tabelCodeColor('nope', colors)).toBe('#888');
  });
});

describe('legendCodesFor', () => {
  it('returns the distinct codes present, in canonical display order', () => {
    const cal = { '2026-07-01': 'absent', '2026-07-02': 'present', '2026-07-03': 'late', '2026-07-04': 'present' };
    // canonical order is present, late, ..., absent — not calendar insertion order
    expect(legendCodesFor(cal)).toEqual(['present', 'late', 'absent']);
  });

  it('is empty for a null / empty calendar', () => {
    expect(legendCodesFor(null)).toEqual([]);
    expect(legendCodesFor(undefined)).toEqual([]);
    expect(legendCodesFor({})).toEqual([]);
  });

  it('appends unknown (future) codes after the known ones, sorted', () => {
    const cal = { a: 'present', b: 'zeta_code', c: 'alpha_code' };
    expect(legendCodesFor(cal)).toEqual(['present', 'alpha_code', 'zeta_code']);
  });

  it('ignores empty-string values', () => {
    expect(legendCodesFor({ a: '', b: 'present' })).toEqual(['present']);
  });
});

describe('tabelSummary', () => {
  it('prefers the backend-computed counts and rounds hours to 1 dp', () => {
    const a: AttendanceSummary = {
      present_days_count: 18,
      late_days_count: 2,
      absent_days_count: 1,
      work_duration_hours: 143.27,
      calendar: {},
    };
    expect(tabelSummary(a)).toEqual({ present: 18, late: 2, absent: 1, hours: 143.3 });
  });

  it('falls back to counting the calendar when a count field is absent', () => {
    const a: AttendanceSummary = {
      // no *_days_count fields
      calendar: { d1: 'present', d2: 'present', d3: 'late', d4: 'absent' },
    };
    expect(tabelSummary(a)).toEqual({ present: 2, late: 1, absent: 1, hours: 0 });
  });

  it('returns zeros for null/undefined', () => {
    expect(tabelSummary(null)).toEqual({ present: 0, late: 0, absent: 0, hours: 0 });
    expect(tabelSummary(undefined)).toEqual({ present: 0, late: 0, absent: 0, hours: 0 });
  });

  it('treats a 0 count as an explicit 0, not a missing field', () => {
    const a: AttendanceSummary = {
      present_days_count: 0,
      late_days_count: 0,
      absent_days_count: 0,
      calendar: { d1: 'present' }, // would count 1 present if it fell back
    };
    expect(tabelSummary(a).present).toBe(0);
  });
});
