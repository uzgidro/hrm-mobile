// Shtat va vakansiya — web v2 `features/staff` sof mantig'i. Band birliklar
// jonli xodimlardan HISOBLANADI va qo'lda kiritilmaydi; faqat reja (tasdiqlangan
// shtat) tahrirlanadi va har o'zgarish sabab so'raydi (o'zgarishlar tarixi).

export const STAFF_CATEGORIES = ['rahbar', 'mutaxassis', 'xizmatchi', 'ishchi'] as const;

/**
 * Ro'yxat kaliti. Virtual qator (xodimlar bor, tasdiqlangan shtat yo'q) `id` siz
 * keladi — kalit (bo'lim, lavozim) juftligidan: u qatorni yagona belgilaydi.
 * (v2 dagi `-(dept*10000 + pos + i)` formulasi to'qnashardi: (4,7,0) = (4,6,1).)
 */
export function rowKey(r: { id?: number | null; department_id: number; job_position_id: number }): string {
  return r.id != null ? String(r.id) : `v-${r.department_id}-${r.job_position_id}`;
}

export interface StaffForm {
  departmentId: number | null;
  positionId: number | null;
  units: string;
  note: string;
  reason: string;
}

export type StaffError = 'departmentRequired' | 'positionRequired' | 'unitsInvalid';

const parseUnits = (v: string) => (v.trim() === '' ? NaN : Number(v.trim().replace(',', '.')));

/** Juftlik (bo'lim + lavozim) yaratilgandan keyin o'zgarmaydi — boshqa juftlik boshqa qator. */
export function validateStaff(f: StaffForm, isEdit: boolean): StaffError | null {
  if (!isEdit && !f.departmentId) return 'departmentRequired';
  if (!isEdit && !f.positionId) return 'positionRequired';
  const n = parseUnits(f.units);
  if (!Number.isFinite(n) || n < 0) return 'unitsInvalid';
  return null;
}

/** Bo'sh matn API ga `null` bo'lib boradi (portal eksporti bo'sh satrni chop etmasin). */
export function buildStaffBody(f: StaffForm, isEdit: boolean): Record<string, unknown> {
  const text = (v: string) => v.trim() || null;
  const base = { planned_units: parseUnits(f.units), note: text(f.note), reason: text(f.reason) };
  return isEdit ? base : { department_id: f.departmentId, job_position_id: f.positionId, ...base };
}

/** Ariza muddati o'tganmi — `YYYY-MM-DD` satrlari solishtiriladi (TZ'dan mustaqil). */
export function isPastDeadline(deadline: string | null | undefined, today: string): boolean {
  return !!deadline && deadline.slice(0, 10) < today;
}
