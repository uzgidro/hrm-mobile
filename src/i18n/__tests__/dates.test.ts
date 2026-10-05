import dayjs from 'dayjs';
import { setDayjsLocale } from '../dayjs';
import { monthName, dayMonth } from '../dates';

// QA: Russian dates read «5 октябрь» (standalone nominative) — after a day number
// the month must be genitive («5 октября»). uz/en have no separate form.
describe('monthName / dayMonth', () => {
  afterAll(() => setDayjsLocale('uz-Latn'));

  it('ru: standalone by default, genitive on request and in dayMonth', () => {
    setDayjsLocale('ru');
    expect(monthName(9)).toBe('октябрь');
    expect(monthName(9, { genitive: true })).toBe('октября');
    expect(monthName(2, { genitive: true })).toBe('марта');
    expect(dayMonth('2026-10-05')).toBe('5 октября');
    expect(dayMonth(dayjs('2026-05-01'), { year: true })).toBe('1 мая 2026');
  });

  it('uz-Latn: one form', () => {
    setDayjsLocale('uz-Latn');
    expect(monthName(9)).toBe(monthName(9, { genitive: true }));
    expect(dayMonth('2026-10-05')).toBe(`5 ${monthName(9)}`);
  });

  it('uz-Cyrl: one form', () => {
    setDayjsLocale('uz-Cyrl');
    expect(monthName(9, { genitive: true })).toBe(monthName(9));
  });

  it('en: one form', () => {
    setDayjsLocale('en');
    expect(monthName(9, { genitive: true })).toBe('October');
    expect(dayMonth('2026-10-05', { year: true })).toBe('5 October 2026');
  });

  it('invalid date → empty string', () => {
    setDayjsLocale('en');
    expect(dayMonth('not a date')).toBe('');
  });
});
