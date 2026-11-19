// Classification of scanned / typed medical codes.
//
// Two code families, both 24 digits (digits only so a USB scanner works in any
// keyboard layout): an EMPLOYEE code starts with `90` (shown by the patient),
// a cabinet DOOR code starts with `91` (stuck on the doctor's door).
// Anything else must never reach the server.

export const MEDICAL_CODE_LENGTH = 24;
export const EMPLOYEE_CODE_PREFIX = '90';
export const DOOR_CODE_PREFIX = '91';

export type MedicalCodeKind = 'employee' | 'door' | 'invalid';

/**
 * Digits of a code. Only whitespace and dashes (grouped display such as
 * `9012 3456 ...`) are tolerated as separators; a URL or any other text that
 * merely contains digits yields `null`.
 */
export function normalizeMedicalCode(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value || !/^[\d\s-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === MEDICAL_CODE_LENGTH ? digits : null;
}

export function classifyMedicalCode(raw: string | null | undefined): MedicalCodeKind {
  const digits = normalizeMedicalCode(raw);
  if (!digits) return 'invalid';
  if (digits.startsWith(EMPLOYEE_CODE_PREFIX)) return 'employee';
  if (digits.startsWith(DOOR_CODE_PREFIX)) return 'door';
  return 'invalid';
}

/** `901234567890123456789012` → `9012 3456 7890 1234 5678 9012` (readability when typed by hand). */
export function groupCode(code: string, size = 4): string {
  const out: string[] = [];
  for (let i = 0; i < code.length; i += size) out.push(code.slice(i, i + size));
  return out.join(' ');
}

/** Machine-readable `code` of an API error body (top level or inside an object `detail`). */
export function apiErrorCode(e: unknown): string | null {
  const data = (e as { response?: { data?: unknown } } | undefined)?.response?.data;
  if (!data || typeof data !== 'object') return null;
  const d = data as { code?: unknown; detail?: unknown };
  if (typeof d.code === 'string') return d.code;
  if (d.detail && typeof d.detail === 'object' && !Array.isArray(d.detail)) {
    const c = (d.detail as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return null;
}
