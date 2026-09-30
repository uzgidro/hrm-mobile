import { dayTimeline, weekSummary } from '../dayTimeline';

const ev = (t: string, d: 'entrance' | 'exit', day = '2026-09-29') => ({
  happen_time: `${day}T${t}:00`,
  direction_type: d,
});

describe('dayTimeline', () => {
  it('kirish-chiqish juftlari ichkarida segment beradi', () => {
    const r = dayTimeline([ev('09:00', 'entrance'), ev('13:00', 'exit'), ev('14:00', 'entrance'), ev('18:00', 'exit')]);
    expect(r.segments).toHaveLength(2);
    expect(r.workedMinutes).toBe(8 * 60);
    expect(r.firstIn).toBe('09:00');
    expect(r.lastOut).toBe('18:00');
    expect(r.inside).toBe(false);
  });

  it('tartibsiz kelgan voqealar vaqt bo\'yicha saralanadi', () => {
    const r = dayTimeline([ev('18:00', 'exit'), ev('09:00', 'entrance')]);
    expect(r.workedMinutes).toBe(9 * 60);
  });

  it('ochiq kirish (hali ichkarida) — hozirgacha hisoblanadi', () => {
    const r = dayTimeline([ev('09:00', 'entrance')], 7, 23, new Date('2026-09-29T11:30:00'));
    expect(r.workedMinutes).toBe(150);
    expect(r.inside).toBe(true);
  });

  it("ketma-ket ikki kirish — ikkinchisi e'tiborsiz", () => {
    expect(dayTimeline([ev('09:00', 'entrance'), ev('09:05', 'entrance'), ev('10:00', 'exit')]).workedMinutes).toBe(60);
  });

  it('segment oynaga (07–23) nisbatan 0..1', () => {
    const [s] = dayTimeline([ev('07:00', 'entrance'), ev('15:00', 'exit')]).segments;
    expect(s.start).toBeCloseTo(0, 5);
    expect(s.end).toBeCloseTo(0.5, 5);
  });

  it("bo'sh kun", () => expect(dayTimeline([])).toMatchObject({ segments: [], workedMinutes: 0, inside: false }));
});

describe('weekSummary', () => {
  it("oxirgi N kun, yangisi birinchi; kechikish ish boshlanishiga nisbatan", () => {
    const events = [
      ev('08:50', 'entrance', '2026-09-29'),
      ev('18:00', 'exit', '2026-09-29'),
      ev('09:20', 'entrance', '2026-09-28'),
    ];
    const w = weekSummary(events, '2026-09-29', '09:00', 3);
    expect(w.map((d) => d.date)).toEqual(['2026-09-29', '2026-09-28', '2026-09-27']);
    expect(w[0]).toMatchObject({ firstIn: '08:50', lastOut: '18:00', status: 'present' });
    expect(w[1]).toMatchObject({ firstIn: '09:20', status: 'late' });
    expect(w[2]).toMatchObject({ firstIn: null, status: 'off' }); // 27.09 — yakshanba
  });

  it('ish vaqti noma\'lum — kechikish belgilanmaydi', () => {
    const w = weekSummary([ev('11:00', 'entrance')], '2026-09-29', null, 1);
    expect(w[0].status).toBe('present');
  });

  it("dam olish kuni (shanba/yakshanba) kelinmagan bo'lsa — 'off', qizil emas", () => {
    // 2026-09-27 — yakshanba, 2026-09-26 — shanba
    const w = weekSummary([], '2026-09-27', '09:00', 2);
    expect(w.map((d) => d.status)).toEqual(['off', 'off']);
  });

  it("dam olish kuni kelgan bo'lsa — present", () => {
    const w = weekSummary([ev('10:00', 'entrance', '2026-09-27')], '2026-09-27', '09:00', 1);
    expect(w[0].status).toBe('present');
  });

  it("ish kunida kelinmagan — none", () => {
    // 2026-09-30 — chorshanba
    expect(weekSummary([], '2026-09-30', '09:00', 1)[0].status).toBe('none');
  });
});
