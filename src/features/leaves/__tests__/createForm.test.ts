import dayjs from 'dayjs';
import { approverNotice, earliestLeaveStart, leaveReasonOptions } from '../utils';

jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

describe('earliestLeaveStart', () => {
  const now = dayjs('2026-09-28T14:30:00');

  it('bugun boshidan max_days_back kun orqaga', () => {
    expect(earliestLeaveStart({ max_days_back: 3, exempt: false }, now)?.format('YYYY-MM-DD HH:mm')).toBe('2026-09-25 00:00');
  });

  it('ozod foydalanuvchi yoki qoidalar hali yuklanmagan — cheklov yo\'q', () => {
    expect(earliestLeaveStart({ max_days_back: 3, exempt: true }, now)).toBeNull();
    expect(earliestLeaveStart(undefined, now)).toBeNull();
  });
});

describe('leaveReasonOptions', () => {
  const FALLBACK = ["Xizmat topshirig'i", 'Shaxsiy sabab'];

  it('lug\'at nomlari — tozalangan, takrorlarsiz, tartibda', () => {
    expect(leaveReasonOptions([{ name: ' Kasal ' }, { name: 'Oilaviy' }, { name: 'Kasal' }, { name: '' }], FALLBACK))
      .toEqual(['Kasal', 'Oilaviy']);
  });

  it('lug\'at bo\'sh yoki yetib kelmasa — zaxira ro\'yxat', () => {
    expect(leaveReasonOptions([], FALLBACK)).toEqual(FALLBACK);
    expect(leaveReasonOptions(undefined, FALLBACK)).toEqual(FALLBACK);
  });

  it('massiv emas javob (`{ items }` / obyekt) — yiqilmaydi', () => {
    expect(leaveReasonOptions({ items: [{ name: 'Kasal' }] }, FALLBACK)).toEqual(['Kasal']);
    expect(leaveReasonOptions({ detail: 'x' }, FALLBACK)).toEqual(FALLBACK);
    expect(leaveReasonOptions([null, { name: 5 }], FALLBACK)).toEqual(FALLBACK);
  });
});

describe('approverNotice', () => {
  it('rahbar yoki bo\'lim boshlig\'i, bo\'lmasa kadrlar bo\'limi', () => {
    expect(approverNotice([{ legal_name: 'Karimov A', via: 'supervisor' }])).toEqual({ kind: 'supervisor', names: 'Karimov A' });
    expect(approverNotice([{ legal_name: 'Aliyeva Z', via: 'department_head' }, { legal_name: 'Rustamov B', via: 'department_head' }]))
      .toEqual({ kind: 'department_head', names: 'Aliyeva Z, Rustamov B' });
    expect(approverNotice([])).toEqual({ kind: 'nobody', names: '' });
    expect(approverNotice(undefined)).toEqual({ kind: 'nobody', names: '' });
  });

  it('massiv emas javob — `.map is not a function` emas', () => {
    expect(approverNotice({ items: [{ legal_name: 'Karimov A', via: 'supervisor' }] }))
      .toEqual({ kind: 'supervisor', names: 'Karimov A' });
    expect(approverNotice({})).toEqual({ kind: 'nobody', names: '' });
    expect(approverNotice([null])).toEqual({ kind: 'nobody', names: '' });
  });
});
