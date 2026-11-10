// The doctor's record form: draft state, validation and the exact request bodies.
// Request bodies are STRICT on the server (an undeclared key → 422): build them only here.
import { FITNESS_VALUES, type ExamCheckup, type Fitness } from './medicalExam';
import { toDiagnosisPayload, validateDiagnosis, MAX_DIAGNOSES, type DiagnosisDraft, type DiagnosisPayload } from './icd';

export interface CheckupDraft {
  date: string;
  conclusion: string;
  recommendation: string;
  diagnoses: DiagnosisDraft[];
  fitness: Fitness | null;
  specialtyId: number | null;
}

export type CheckupError =
  | 'dateRequired'
  | 'specialtyRequired'
  | 'emptyRecord'
  | 'tooManyDiagnoses'
  | { diagnosis: number; error: 'codeInvalid' | 'nameRequired' | 'nameTooLong' };

export function initialDraft(c: ExamCheckup | null, today: string): CheckupDraft {
  return {
    date: c?.checkup_date?.slice(0, 10) ?? today,
    conclusion: c?.conclusion ?? '',
    recommendation: c?.recommendation ?? '',
    diagnoses: (c?.diagnoses ?? []).map((d) => ({ code: d.code ?? '', name: d.name })),
    fitness: c?.fitness && (FITNESS_VALUES as readonly string[]).includes(c.fitness) ? c.fitness : null,
    specialtyId: c?.specialty_id ?? null,
  };
}

/** `needsSpecialty` — the doctor has several specialties: the choice is required. */
export function validateDraft(d: CheckupDraft, needsSpecialty: boolean): CheckupError | null {
  if (!d.date) return 'dateRequired';
  if (needsSpecialty && d.specialtyId == null) return 'specialtyRequired';
  if (d.diagnoses.length > MAX_DIAGNOSES) return 'tooManyDiagnoses';
  for (let i = 0; i < d.diagnoses.length; i++) {
    const e = validateDiagnosis(d.diagnoses[i]!);
    if (e) return { diagnosis: i, error: e };
  }
  const hasContent =
    !!d.conclusion.trim() || !!d.recommendation.trim() || toDiagnosisPayload(d.diagnoses).length > 0 || !!d.fitness;
  return hasContent ? null : 'emptyRecord';
}

export interface UpdateCheckupBody {
  checkup_date: string;
  conclusion: string | null;
  recommendation: string | null;
  diagnoses: DiagnosisPayload[];
  fitness: Fitness | null;
  specialty_id?: number;
}

export type CreateCheckupBody = UpdateCheckupBody & { employee_id: number };

/** PATCH carries the whole edited state (an emptied list / fitness clears the stored value). */
export function buildUpdateBody(d: CheckupDraft, needsSpecialty: boolean): UpdateCheckupBody {
  return {
    checkup_date: d.date,
    conclusion: d.conclusion.trim() || null,
    recommendation: d.recommendation.trim() || null,
    diagnoses: toDiagnosisPayload(d.diagnoses),
    fitness: d.fitness,
    // With one specialty the server fills it in itself.
    ...(needsSpecialty && d.specialtyId != null ? { specialty_id: d.specialtyId } : {}),
  };
}

export function buildCreateBody(employeeId: number, d: CheckupDraft, needsSpecialty: boolean): CreateCheckupBody {
  return { employee_id: employeeId, ...buildUpdateBody(d, needsSpecialty) };
}
