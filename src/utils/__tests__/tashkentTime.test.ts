import { formatTashkentDate, formatTashkentDateTime, tashkentWall } from '../tashkentTime';

describe('tashkentTime', () => {
  it("ofsetli vaqt Toshkentga o'tkaziladi (qurilma TZ'idan mustaqil)", () => {
    expect(tashkentWall('2026-10-05T07:30:00+00:00')).toBe('2026-10-05T12:30:00');
    expect(tashkentWall('2026-10-05T21:10:05.123456Z')).toBe('2026-10-06T02:10:05');
    expect(formatTashkentDateTime('2026-10-05T07:30:00+00:00')).toBe('05.10.2026 12:30');
  });

  it('mintaqasiz satr — Toshkent deb olinadi (qayta zonalanmaydi)', () => {
    expect(formatTashkentDateTime('2026-10-05T09:15:00')).toBe('05.10.2026 09:15');
    expect(formatTashkentDateTime('2026-10-05 09:15:00')).toBe('05.10.2026 09:15');
  });

  it("bo'sh yoki yaroqsiz — «—»", () => {
    expect(formatTashkentDateTime(null)).toBe('—');
    expect(formatTashkentDateTime('')).toBe('—');
    expect(formatTashkentDateTime('kecha')).toBe('—');
    expect(tashkentWall('2026-10-05')).toBeNull();
  });

  it('faqat sana: vaqt Toshkentda, sof sana (YYYY-MM-DD) siljimaydi', () => {
    expect(formatTashkentDate('2026-10-05T21:10:05Z')).toBe('06.10.2026');
    expect(formatTashkentDate('1990-03-07')).toBe('07.03.1990');
    expect(formatTashkentDate(null)).toBe('—');
    expect(formatTashkentDate('kecha')).toBe('—');
  });
});
