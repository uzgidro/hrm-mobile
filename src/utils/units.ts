// Shtat birliklari o'nlik keladi ("1.00", "0.50"): "1.00" → "1", "0.50" → "0.5"
// (web v2 `features/staff/useStaffPositions.ts` `fmtUnits`). Tuzilma sxemasi va
// shtat jadvali ikkalasi ham ishlatadi.
export function fmtUnits(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}
