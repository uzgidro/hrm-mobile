// The employee's medical code drawn as a QR symbol (see utils/qrMatrix.ts).
import React, { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { numericQrMatrix, QR_SIZE } from '../utils/qrMatrix';

// A scanner needs four light modules around the symbol; without them a QR on
// a dark screen does not read.
const QUIET = 4;

// Black on white whatever the app theme — a themed QR is an unreadable QR.
/* eslint-disable no-restricted-syntax */
const PAPER = '#FFFFFF';
const INK = '#000000';
/* eslint-enable no-restricted-syntax */

/** One SVG path with a 1×1 square per dark module. */
export function qrPath(digits: string): string {
  const matrix = numericQrMatrix(digits);
  let d = '';
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      if (matrix[y][x]) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
    }
  }
  return d;
}

export function QrSymbol({ digits, size, testID }: { digits: string; size: number; testID?: string }) {
  const d = useMemo(() => qrPath(digits), [digits]);
  const side = QR_SIZE + QUIET * 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${side} ${side}`}
      testID={testID}
      accessibilityRole="image"
    >
      <Rect x={0} y={0} width={side} height={side} fill={PAPER} />
      <Path d={d} fill={INK} />
    </Svg>
  );
}
