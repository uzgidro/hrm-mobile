import { fmtUnits } from '../units';

describe('fmtUnits (v2 staff)', () => {
  it.each([
    ['1.00', '1'],
    ['0.50', '0.5'],
    ['2.25', '2.25'],
    [-1, '-1'],
    ['-0.50', '-0.5'],
    [null, '0'],
    [undefined, '0'],
    ['abc', '0'],
    ['1.333', '1.33'],
  ])('%p → %p', (v, out) => expect(fmtUnits(v as never)).toBe(out));
});
