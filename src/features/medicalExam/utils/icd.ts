// ICD-10 diagnosis rows (server `MedicalDiagnosis`): the code is optional; when given it is
// a letter, two digits, optionally a dot and 1-4 letters/digits (K29.7, S52.50), uppercased.
// The name is required (1..500). At most 30 rows per record.

export const ICD10_RE = /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/;
export const MAX_DIAGNOSES = 30;
export const MAX_DIAGNOSIS_NAME = 500;

export type DiagnosisDraft = { code: string; name: string };
export type DiagnosisPayload = { code: string | null; name: string };
export type DiagnosisError = 'codeInvalid' | 'nameRequired' | 'nameTooLong';

export const normalizeIcdCode = (code: string): string => code.trim().toUpperCase();

export function isValidIcd10(code: string): boolean {
  return ICD10_RE.test(normalizeIcdCode(code));
}

/** Error key of one draft row, or null. An entirely empty row is not an error (it is dropped). */
export function validateDiagnosis(d: DiagnosisDraft): DiagnosisError | null {
  const code = normalizeIcdCode(d.code);
  const name = d.name.trim();
  if (!code && !name) return null;
  if (code && !ICD10_RE.test(code)) return 'codeInvalid';
  if (!name) return 'nameRequired';
  if (name.length > MAX_DIAGNOSIS_NAME) return 'nameTooLong';
  return null;
}

/** Drops empty rows, trims, uppercases the code; `null` code when blank. */
export function toDiagnosisPayload(drafts: DiagnosisDraft[]): DiagnosisPayload[] {
  return drafts
    .filter((d) => d.code.trim() || d.name.trim())
    .map((d) => ({ code: normalizeIcdCode(d.code) || null, name: d.name.trim() }));
}
