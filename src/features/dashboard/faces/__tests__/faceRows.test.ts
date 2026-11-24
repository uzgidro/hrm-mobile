import dayjs from 'dayjs';
import i18n from '@/i18n';
import { buildFace, clip, kindTone, upcomingHolidays } from '../faceRows';

const t = i18n.t.bind(i18n);

describe('face rows', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('clip collapses whitespace and cuts long text', () => {
    expect(clip('  a \n b  ')).toBe('a b');
    expect(clip('x'.repeat(100), 10)).toBe(`${'x'.repeat(10)}…`);
    expect(clip(null)).toBe('');
  });

  it('maps order status kinds to badge tones', () => {
    expect(kindTone('pending')).toBe('warning');
    expect(kindTone('error')).toBe('danger');
    expect(kindTone('neutral')).toBe('neutral');
  });

  it('an order row opens the order detail with a status badge', () => {
    const v = buildFace({ page: 'orders', data: [{ id: 7, status: 'confirmed', act_number: 12, category_rel: { id: 1, name: 'Ta’til' } }] as never }, t);
    expect(v.rows[0]).toMatchObject({ key: '7', title: 'Ta’til · №12', href: { pathname: '/order-detail', params: { id: '7' } } });
    expect(v.rows[0].badge?.tone).toBe('success');
  });

  it('letters carry the "waiting for me" note', () => {
    const v = buildFace({ page: 'letters', data: { items: [], awaiting: 3 } }, t);
    expect(v.note).toBe('3 ta hujjat javobingizni kutmoqda');
    expect(buildFace({ page: 'letters', data: { items: [], awaiting: 0 } }, t).note).toBeUndefined();
  });

  it('upcoming holidays project a yearly holiday and drop the past', () => {
    const now = dayjs('2026-11-24');
    const rows = upcomingHolidays(
      [
        { date_from: '2020-01-01', date_to: '2020-01-02', is_repeatable: true },
        { date_from: '2025-05-09', date_to: '2025-05-09', is_repeatable: false },
        { date_from: '2026-12-01', date_to: '2026-12-01', is_repeatable: false },
      ],
      4,
      now,
    );
    expect(rows.map((r) => r.from.format('YYYY-MM-DD'))).toEqual(['2026-12-01', '2027-01-01']);
  });

  it('employees face is four stat rows opening the roster', () => {
    const v = buildFace({ page: 'employees', data: { total: 10, hired_year: 2, no_birth_date: 0, no_position: 3 } }, t);
    expect(v.rows).toHaveLength(4);
    expect(v.rows[3].badge).toEqual({ label: '3', tone: 'warning' });
    expect(v.rows[0].href).toBe('/employees-list');
  });
});
