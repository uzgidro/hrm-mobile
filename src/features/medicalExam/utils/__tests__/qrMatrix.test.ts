import { numericQrMatrix, QR_MAX_DIGITS, QR_SIZE } from '../qrMatrix';

const draw = (m: boolean[][]) => m.map((r) => r.map((c) => (c ? '#' : '.')).join('')).join('/');

// The symbol for this code, as produced by the encoder AND read back by a real
// decoder (jsQR) when it was written — together with 3 687 other codes of every
// length from 1 to 34 digits. If this string changes, the encoder changed: decode
// the new output with a real scanner before accepting it.
const GOLDEN_CODE = '900858221056224774570370';
const GOLDEN =
  '#######....##.#######/#.....#..#....#.....#/#.###.#.##.##.#.###.#/#.###.#.#.#.#.#.###.#/' +
  '#.###.#.#...#.#.###.#/#.....#.#.##..#.....#/#######.#.#.#.#######/........#.#........../' +
  '#.#####...##..#####../##..##.#.####.#..#.../.#..#.##....#.##.###./#..##.....###..#.##../' +
  '..#..###....###.#...#/........#...#.##...##/#######....#..##..#../#.....#.#.#..#.###..#/' +
  '#.###.#.#..#.#..####./#.###.#.#...####.#.../#.###.#.###.#..#.##../#.....#...#.#.###.##./' +
  '#######.#.#.#...#.#..';

describe('numericQrMatrix', () => {
  it('produces the symbol a real decoder read back', () => {
    expect(draw(numericQrMatrix(GOLDEN_CODE))).toBe(GOLDEN);
  });

  it('is a 21×21 version-1 symbol with three finder patterns and timing', () => {
    const m = numericQrMatrix('910000000000000000000001');
    expect(m).toHaveLength(QR_SIZE);
    expect(m.every((row) => row.length === QR_SIZE)).toBe(true);
    const finder = (x0: number, y0: number) =>
      [0, 1, 2, 3, 4, 5, 6].map((dy) => [0, 1, 2, 3, 4, 5, 6].map((dx) => (m[y0 + dy][x0 + dx] ? '#' : '.')).join(''));
    const expected = ['#######', '#.....#', '#.###.#', '#.###.#', '#.###.#', '#.....#', '#######'];
    expect(finder(0, 0)).toEqual(expected);
    expect(finder(QR_SIZE - 7, 0)).toEqual(expected);
    expect(finder(0, QR_SIZE - 7)).toEqual(expected);
    // Timing row between the top finders alternates, starting dark.
    expect([8, 9, 10, 11, 12].map((x) => m[6][x])).toEqual([true, false, true, false, true]);
    // The module that is dark in every QR symbol.
    expect(m[QR_SIZE - 8][8]).toBe(true);
  });

  it('gives different symbols for different codes and the same for the same', () => {
    const a = draw(numericQrMatrix('900000000000000000000001'));
    expect(draw(numericQrMatrix('900000000000000000000001'))).toBe(a);
    expect(draw(numericQrMatrix('900000000000000000000002'))).not.toBe(a);
  });

  it('refuses what it cannot encode correctly', () => {
    expect(() => numericQrMatrix('')).toThrow();
    expect(() => numericQrMatrix('12a')).toThrow();
    expect(() => numericQrMatrix('1'.repeat(QR_MAX_DIGITS + 1))).toThrow();
    expect(() => numericQrMatrix('1'.repeat(QR_MAX_DIGITS))).not.toThrow();
  });
});
