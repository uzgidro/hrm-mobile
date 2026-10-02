// Auditlar — xodim, bo'lim yoki jarayon bo'yicha ichki tekshiruv (web v2
// `InspectionsPage` / `useInspections`). Hayot tsikli: rejalashtirilgan →
// boshlangan → yakunlangan (yoki bekor). Topilmalar tsikldan KEYIN ham qoladi:
// «audit tugadi» va «muammolar tuzatildi» ikki alohida savol.
import type { User } from '@/types';
import { isBranchAdmin, isDeputy, isHR, isKpiAdmin, isMinister, isSiteMasterAdmin } from '@/utils/roles';

export const INSPECTION_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export const INSPECTION_OBJECTS = ['employee', 'department', 'process'] as const;
export const FINDING_SEVERITIES = ['low', 'medium', 'high'] as const;

export interface InspectionForm {
  title: string;
  purpose: string;
  objectType: string;
  employeeId: number | null;
  departmentId: number | null;
  processName: string;
  periodStart: string;
  periodEnd: string;
}

export type InspectionError = 'titleRequired' | 'objectRequired' | 'invalidRange';

export function validateInspection(f: InspectionForm): InspectionError | null {
  if (!f.title.trim()) return 'titleRequired';
  if (f.objectType === 'employee' && !f.employeeId) return 'objectRequired';
  if (f.objectType === 'department' && !f.departmentId) return 'objectRequired';
  if (f.objectType === 'process' && !f.processName.trim()) return 'objectRequired';
  if (f.periodStart && f.periodEnd && f.periodEnd < f.periodStart) return 'invalidRange';
  return null;
}

/** Tekshiruv obyekti turga bog'liq: uchalasini yuborish yozuvni «odamni VA bo'limni tekshiradi» qilib qo'yardi. */
export function buildInspectionBody(f: InspectionForm, branchId: number | undefined): Record<string, unknown> {
  return {
    title: f.title.trim(),
    purpose: f.purpose.trim() || null,
    object_type: f.objectType,
    employee_id: f.objectType === 'employee' ? f.employeeId : null,
    department_id: f.objectType === 'department' ? f.departmentId : null,
    process_name: f.objectType === 'process' ? f.processName.trim() : null,
    period_start: f.periodStart || null,
    period_end: f.periodEnd || null,
    organization_branch_id: branchId ?? null,
    member_ids: null,
  };
}

/** Bekor qilishda sabab MAJBURIY (`InspectionCancel.reason` min_length 1) — bo'sh bo'lsa server 422 qaytaradi. */
export function validateCancel(reason: string): 'cancelReasonRequired' | null {
  return reason.trim() ? null : 'cancelReasonRequired';
}

export interface FindingForm {
  description: string;
  severity: string;
  recommendation: string;
  dueDate: string;
}

export function validateFinding(f: FindingForm): 'findingRequired' | null {
  return f.description.trim() ? null : 'findingRequired';
}

export function buildFindingBody(f: FindingForm): Record<string, unknown> {
  return {
    description: f.description.trim(),
    severity: f.severity,
    recommendation: f.recommendation.trim() || null,
    responsible_id: null,
    due_date: f.dueDate || null,
  };
}

export const canStart = (status: string) => status === 'planned';
export const canFinish = (status: string) => status === 'planned' || status === 'in_progress';

/**
 * Yaratish huquqi. Server har qatorga chaqiruvchining huquqini yozadi (`can_manage`);
 * qator yo'q bo'lsa — v2 `InspectionService.can_manage` ning rol ko'zgusi.
 */
export function canCreateInspection(user: User | null | undefined, rows: { can_manage?: boolean }[]): boolean {
  if (rows.length) return rows.some((r) => r.can_manage);
  return (
    isSiteMasterAdmin(user) ||
    isBranchAdmin(user) ||
    isHR(user) ||
    isMinister(user) ||
    isDeputy(user) ||
    isKpiAdmin(user)
  );
}
