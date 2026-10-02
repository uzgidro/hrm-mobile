// Ish rejasi — web v2 `WorkPlanPage` forma mantig'i. Davr turi va holatlar
// server `meta` dan kelardi; mobil'da KODLAR ro'yxati va i18n yorliqlari (kod
// tarjima qilinmaydi). KPI ko'rsatkichi mobil'da tahrirlanmaydi — tanaga kirmaydi,
// shuning uchun serverdagi bog'lanish tahrirda saqlanib qoladi.

export const PERIOD_TYPES = ['month', 'quarter', 'year'] as const;
export const PLAN_STATUSES = ['planned', 'in_progress', 'done', 'cancelled'] as const;
/** Filtr: «overdue» ham serverga `status` sifatida ketadi (v2). */
export const FILTER_STATUSES = ['overdue', ...PLAN_STATUSES] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export interface WorkPlanForm {
  title: string;
  description: string;
  employeeId: number | null;
  departmentId: number | null;
  period: string;
  start: string; // YYYY-MM-DD
  end: string;
  plannedResult: string;
  weight: string;
  status: string;
}

export type WorkPlanError = 'titleRequired' | 'datesRequired' | 'invalidRange' | 'targetRequired' | 'weightInvalid';

export function validateWorkPlan(f: WorkPlanForm): WorkPlanError | null {
  if (!f.title.trim()) return 'titleRequired';
  if (!f.start || !f.end) return 'datesRequired';
  if (f.end < f.start) return 'invalidRange';
  // Server ikkala nishonni qabul qiladi, lekin hech kimga qaratilmagan reja hech kimning ro'yxatida chiqmaydi.
  if (!f.employeeId && !f.departmentId) return 'targetRequired';
  const w = f.weight.trim();
  if (w !== '' && !(Number.isFinite(Number(w)) && Number(w) >= 0)) return 'weightInvalid';
  return null;
}

export function buildWorkPlanBody(f: WorkPlanForm, branchId: number | undefined): Record<string, unknown> {
  const w = f.weight.trim();
  return {
    title: f.title.trim(),
    description: f.description.trim() || null,
    employee_id: f.employeeId,
    department_id: f.departmentId,
    organization_branch_id: branchId ?? null,
    period_type: f.period,
    start_date: f.start,
    end_date: f.end,
    planned_result: f.plannedResult.trim() || null,
    weight: w === '' ? null : Number(w),
    status: f.status,
  };
}

/** Muddati o'tgan: tugash sanasi bugundan oldin va reja hali yakunlanmagan. `YYYY-MM-DD` solishtiriladi. */
export function isPlanOverdue(p: { end_date?: string | null; status?: string | null }, today: string): boolean {
  if (!p.end_date || p.status === 'done' || p.status === 'cancelled') return false;
  return p.end_date.slice(0, 10) < today;
}
