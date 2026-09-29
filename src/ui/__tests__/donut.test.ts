import { donutArcs } from '../Donut';
import { initials } from '../Avatar';

describe('donutArcs', () => {
  const r = 50;
  const C = 2 * Math.PI * r;

  it("ulushlarga mos yoylar, ketma-ket offset", () => {
    const arcs = donutArcs([{ value: 3, color: 'a' }, { value: 1, color: 'b' }], r, 0);
    expect(arcs).toHaveLength(2);
    expect(parseFloat(arcs[0].dasharray.split(' ')[0])).toBeCloseTo(C * 0.75, 3);
    expect(arcs[1].dashoffset).toBeCloseTo(-C * 0.75, 3);
  });

  it("nol qiymatli segment tashlab yuboriladi", () => {
    expect(donutArcs([{ value: 0, color: 'a' }, { value: 2, color: 'b' }], r)).toHaveLength(1);
  });

  it("jami 0 → bo'sh", () => {
    expect(donutArcs([{ value: 0, color: 'a' }], r)).toEqual([]);
    expect(donutArcs([], r)).toEqual([]);
  });

  it("manfiy qiymat 0 deb olinadi", () => {
    expect(donutArcs([{ value: -5, color: 'a' }, { value: 1, color: 'b' }], r)).toHaveLength(1);
  });
});

describe('initials', () => {
  it.each([
    ['Nodirboyev Javoxir', 'NJ'],
    ['ali', 'A'],
    ['  ', '?'],
    ["O'ktam Sobirov Ali", 'OS'],
  ])('%s → %s', (n, e) => expect(initials(n)).toBe(e));
});
