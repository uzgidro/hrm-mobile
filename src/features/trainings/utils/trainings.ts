// Malaka oshirish (TZ K4 / 4.2.7) — web v2 `useTrainings` + `TrainingsPage` sof mantig'i.
// Kurs, attestatsiya, razryad/unvon berish bitta reyestrda: ularni birlashtiradigan
// narsa — kimdir muddati o'tishidan oldin payqashi kerak bo'lgan amal qilish sanasi.
import dayjs from 'dayjs';
import type { Tone } from '@/ui';

export const TRAINING_TYPES = [
  'course',
  'training',
  'seminar',
  'qualification',
  'internship',
  'attestation',
  'grade',
  'rank',
] as const;
export const TRAINING_STATUSES = ['planned', 'completed', 'cancelled'] as const;
export const TRAINING_RESULTS = ['passed', 'failed'] as const;

export interface TrainingForm {
  employeeId: number | null;
  type: string;
  program: string;
  provider: string;
  start: string; // YYYY-MM-DD yoki ''
  end: string;
  hours: string;
  status: string;
  result: string;
  cost: string;
  certNumber: string;
  certExpires: string;
  note: string;
}

export type TrainingError = 'employeeRequired' | 'programRequired' | 'invalidRange' | 'numberInvalid';

const isNonNegNumber = (v: string) => v.trim() === '' || (Number.isFinite(Number(v.trim())) && Number(v.trim()) >= 0);

export function validateTraining(f: TrainingForm, isEdit: boolean): TrainingError | null {
  if (!isEdit && !f.employeeId) return 'employeeRequired';
  if (!f.program.trim()) return 'programRequired';
  if (f.start && f.end && f.end < f.start) return 'invalidRange';
  if (!isNonNegNumber(f.hours) || !isNonNegNumber(f.cost)) return 'numberInvalid';
  return null;
}

/** Xodim (`employee_id`) tanaga kirmaydi — yaratishda ekran alohida qo'shadi, tahrirda o'zgarmaydi. */
export function buildTrainingBody(f: TrainingForm): Record<string, unknown> {
  const text = (v: string) => v.trim() || null;
  const num = (v: string) => (v.trim() === '' ? null : Number(v.trim()));
  return {
    training_type: f.type,
    program_name: f.program.trim(),
    provider: text(f.provider),
    start_date: f.start || null,
    end_date: f.end || null,
    hours: num(f.hours),
    status: f.status,
    result: f.result || null,
    cost: num(f.cost),
    certificate_number: text(f.certNumber),
    certificate_expires_at: f.certExpires || null,
    note: text(f.note),
  };
}

/** Amal qilish muddatigacha kunlar (kun bo'yicha, soatsiz); sana yo'q — null. Manfiy — o'tib ketgan. */
export function daysLeft(expires: string | null | undefined, today: string): number | null {
  if (!expires) return null;
  return dayjs(expires.slice(0, 10)).diff(dayjs(today), 'day');
}

/** Muddati o'tgan — xato, ≤30 kun — ogohlantirish (v2). */
export function expiryTone(left: number): Tone {
  return left < 0 ? 'danger' : left <= 30 ? 'warning' : 'neutral';
}

/** Plitkaga sig'adigan ixcham son: 12 500 000 → «12.5M» (K / M / B, tilga bog'liq emas). */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const trim = (v: number) => String(Number(v.toFixed(1)));
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `${trim(n / 1e3)}K`;
  return String(n);
}
