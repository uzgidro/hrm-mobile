import { givenName, shiftProgress } from '../shiftProgress';

describe('shiftProgress', () => {
  const now = new Date('2026-09-28T14:08:00');

  it('kelgandan hozirgacha ishlangan vaqt va smena ulushi', () => {
    expect(shiftProgress('2026-09-28T08:52:00', undefined, '09:00:00', '18:00:00', now)).toEqual({ workedMin: 316, pct: 59 });
  });

  it('ketgan bo\'lsa — ketish vaqtigacha, 100% dan oshmaydi', () => {
    expect(shiftProgress('2026-09-28T08:00:00', '2026-09-28T19:30:00', '09:00', '18:00', now)).toEqual({ workedMin: 690, pct: 100 });
  });

  it('tungi smena yarim tundan o\'tadi', () => {
    const p = shiftProgress('2026-09-28T20:00:00', '2026-09-29T02:00:00', '20:00', '08:00', now);
    expect(p).toEqual({ workedMin: 360, pct: 50 });
  });

  it('kelish yo\'q yoki jadval noma\'lum bo\'lsa null', () => {
    expect(shiftProgress(undefined, undefined, '09:00', '18:00', now)).toBeNull();
    expect(shiftProgress('2026-09-28T08:52:00', undefined, null, '18:00', now)).toBeNull();
    expect(shiftProgress('2026-09-28T08:52:00', undefined, '09:00', '09:00', now)).toBeNull();
  });
});

describe('givenName', () => {
  it('«Familiya Ism Otasining» dan ismni oladi', () => {
    expect(givenName('Aliyeva Zulfiya Karimovna')).toBe('Zulfiya');
    expect(givenName('  Aziz ')).toBe('Aziz');
    expect(givenName(undefined)).toBe('');
  });
});
