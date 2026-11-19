// Diagnosis rows (server `MedicalDiagnosis`): the code is optional free text — usually ICD-10
// (K29.7), but any letters and digits are accepted and kept as typed (owner's decision
// 2026-11-11). The name is required (1..500). At most 30 rows per record.

export const MAX_DIAGNOSES = 30;
export const MAX_DIAGNOSIS_NAME = 500;
export const MAX_DIAGNOSIS_CODE = 50;

export type DiagnosisDraft = { code: string; name: string };
export type DiagnosisPayload = { code: string | null; name: string };
export type DiagnosisError = 'nameRequired' | 'nameTooLong';

export const normalizeIcdCode = (code: string): string => code.trim();

/** Error key of one draft row, or null. An entirely empty row is not an error (it is dropped). */
export function validateDiagnosis(d: DiagnosisDraft): DiagnosisError | null {
  const code = normalizeIcdCode(d.code);
  const name = d.name.trim();
  if (!code && !name) return null;
  if (!name) return 'nameRequired';
  if (name.length > MAX_DIAGNOSIS_NAME) return 'nameTooLong';
  return null;
}

/** Drops empty rows, trims; `null` code when blank. */
export function toDiagnosisPayload(drafts: DiagnosisDraft[]): DiagnosisPayload[] {
  return drafts
    .filter((d) => d.code.trim() || d.name.trim())
    .map((d) => ({ code: normalizeIcdCode(d.code) || null, name: d.name.trim() }));
}
