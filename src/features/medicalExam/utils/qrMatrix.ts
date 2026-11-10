// A QR encoder for exactly what this feature needs: a short string of DIGITS.
//
// WHY IT IS WRITTEN HERE: the app has no QR encoder, and a library with native
// code would force a store release. The employee's medical code is 24 digits,
// which fits the smallest symbol there is — version 1 (21×21 modules), numeric
// mode, error-correction level M (up to 34 digits). That case is small enough
// to implement in full: one data block, no alignment patterns, no version
// information. Anything else is refused rather than encoded wrongly.
//
// The result is checked against a real decoder (see the golden test): a symbol
// that merely looks like a QR code is worse than none.

/** Side of a version-1 symbol, in modules. */
export const QR_SIZE = 21;
/** Longest digit string a version-1, level-M numeric symbol holds. */
export const QR_MAX_DIGITS = 34;

const DATA_CODEWORDS = 16;
const EC_CODEWORDS = 10;

/** Multiply in GF(2^8) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1. */
function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/** Reed-Solomon error-correction codewords for one block. */
function errorCorrection(data: number[], degree: number): number[] {
  const divisor = new Array<number>(degree).fill(0);
  divisor[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      divisor[j] = gfMul(divisor[j], root);
      if (j + 1 < degree) divisor[j] ^= divisor[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  const rem = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ (rem.shift() as number);
    rem.push(0);
    for (let i = 0; i < degree; i++) rem[i] ^= gfMul(divisor[i], factor);
  }
  return rem;
}

/** Digits → the 16 data codewords (mode, count, digit groups, terminator, padding). */
function dataCodewords(digits: string): number[] {
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0001, 4); // numeric mode
  push(digits.length, 10); // character count (10 bits for versions 1-9)
  for (let i = 0; i < digits.length; i += 3) {
    const group = digits.slice(i, i + 3);
    push(parseInt(group, 10), group.length * 3 + 1); // 3 digits → 10 bits, 2 → 7, 1 → 4
  }
  const capacity = DATA_CODEWORDS * 8;
  push(0, Math.min(4, capacity - bits.length)); // terminator
  push(0, (8 - (bits.length % 8)) % 8); // to a byte boundary
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);

  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    out.push(byte);
  }
  return out;
}

type Grid = boolean[][];

const blank = (): Grid => Array.from({ length: QR_SIZE }, () => new Array<boolean>(QR_SIZE).fill(false));

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** How hard a symbol is to read; the mask with the lowest score is used. */
function penalty(m: Grid): number {
  let score = 0;
  const lines: boolean[][] = [];
  for (let i = 0; i < QR_SIZE; i++) {
    lines.push(m[i]);
    lines.push(m.map((row) => row[i]));
  }
  for (const line of lines) {
    // Runs of five or more of one colour.
    let run = 1;
    for (let i = 1; i <= QR_SIZE; i++) {
      if (i < QR_SIZE && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    // Anything that looks like a finder pattern (1:1:3:1:1 with a light side).
    const s = line.map((v) => (v ? '1' : '0')).join('');
    for (const pattern of ['10111010000', '00001011101']) {
      for (let at = s.indexOf(pattern); at !== -1; at = s.indexOf(pattern, at + 1)) score += 40;
    }
  }
  // 2×2 blocks of one colour.
  for (let y = 0; y < QR_SIZE - 1; y++) {
    for (let x = 0; x < QR_SIZE - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
  }
  // Balance of dark and light.
  let dark = 0;
  for (const row of m) for (const c of row) if (c) dark++;
  score += Math.floor(Math.abs((dark * 20) / (QR_SIZE * QR_SIZE) - 10)) * 10;
  return score;
}

/**
 * The QR symbol for a string of digits, as rows of modules (`true` = dark),
 * without the quiet zone. Throws on anything but 1..34 digits.
 */
export function numericQrMatrix(digits: string): boolean[][] {
  if (!/^\d+$/.test(digits) || digits.length > QR_MAX_DIGITS) {
    throw new Error('numericQrMatrix: 1 to 34 digits only');
  }
  const data = dataCodewords(digits);
  const codewords = [...data, ...errorCorrection(data, EC_CODEWORDS)];

  const base = blank();
  const reserved = blank(); // function modules: never masked, never data
  const fn = (x: number, y: number, dark: boolean) => {
    base[y][x] = dark;
    reserved[y][x] = true;
  };

  // Timing patterns.
  for (let i = 0; i < QR_SIZE; i++) {
    fn(6, i, i % 2 === 0);
    fn(i, 6, i % 2 === 0);
  }
  // Finder patterns with their separators, in three corners.
  for (const [cx, cy] of [[3, 3], [QR_SIZE - 4, 3], [3, QR_SIZE - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= QR_SIZE || y < 0 || y >= QR_SIZE) continue;
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        fn(x, y, ring !== 2 && ring !== 4);
      }
    }
  }
  // Format information: reserved now, written per mask below.
  const formatCells = (bits: number, write: (x: number, y: number, dark: boolean) => void) => {
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) write(8, i, bit(i));
    write(8, 7, bit(6));
    write(8, 8, bit(7));
    write(7, 8, bit(8));
    for (let i = 9; i < 15; i++) write(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) write(QR_SIZE - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) write(8, QR_SIZE - 15 + i, bit(i));
    write(8, QR_SIZE - 8, true); // the always-dark module
  };
  formatCells(0, fn);

  // Data and error-correction bits, zig-zagging up and down in column pairs
  // from the bottom-right corner, skipping the vertical timing column.
  let i = 0;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < QR_SIZE; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? QR_SIZE - 1 - vert : vert;
        if (!reserved[y][x] && i < codewords.length * 8) {
          base[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  let best: Grid | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = base.map((row) => row.slice());
    for (let y = 0; y < QR_SIZE; y++) {
      for (let x = 0; x < QR_SIZE; x++) {
        if (!reserved[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
      }
    }
    // Level M is 0b00; then the 3-bit mask; then a BCH(15,5) remainder, XOR-masked.
    let rem = mask;
    for (let k = 0; k < 10; k++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    formatCells(((mask << 10) | rem) ^ 0x5412, (x, y, dark) => {
      m[y][x] = dark;
    });
    const score = penalty(m);
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best as Grid;
}
