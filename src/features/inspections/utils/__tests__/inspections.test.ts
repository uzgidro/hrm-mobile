import type { User } from '@/types';
import {
  buildFindingBody,
  buildInspectionBody,
  canCreateInspection,
  canStart,
  canFinish,
  validateCancel,
  validateFinding,
  validateInspection,
  type InspectionForm,
} from '../inspections';

const form = (p: Partial<InspectionForm> = {}): InspectionForm => ({
  title: 'Davomat auditi',
  purpose: '',
  objectType: 'department',
  employeeId: null,
  departmentId: 3,
  processName: '',
  periodStart: '',
  periodEnd: '',
  ...p,
});
const emp = (role?: string, extra: Record<string, unknown> = {}) =>
  ({
    id: 1,
    type: 'employee' as const,
    employee: role ? { id: 5, is_multi_org_user: true, multi_org_employee_role: role, ...extra } : { id: 5, ...extra },
  }) as unknown as User;

describe('inspections utils (v2 InspectionsPage / useInspections)', () => {
  it('validatsiya: sarlavha → obyekt (turga mos) → davr', () => {
    expect(validateInspection(form({ title: ' ' }))).toBe('titleRequired');
    expect(validateInspection(form({ objectType: 'employee', employeeId: null }))).toBe('objectRequired');
    expect(validateInspection(form({ objectType: 'employee', employeeId: 7 }))).toBeNull();
    expect(validateInspection(form({ departmentId: null }))).toBe('objectRequired');
    expect(validateInspection(form({ objectType: 'process', processName: ' ' }))).toBe('objectRequired');
    expect(validateInspection(form({ objectType: 'process', processName: "Yig'ish" }))).toBeNull();
    expect(validateInspection(form({ periodStart: '2026-10-10', periodEnd: '2026-10-01' }))).toBe('invalidRange');
  });

  it("tana: faqat tanlangan tur obyekti yuboriladi (rekord ham odamni, ham bo'limni tekshirmasin)", () => {
    expect(buildInspectionBody(form({ employeeId: 7, processName: 'x' }), 2)).toEqual({
      title: 'Davomat auditi',
      purpose: null,
      object_type: 'department',
      employee_id: null,
      department_id: 3,
      process_name: null,
      period_start: null,
      period_end: null,
      organization_branch_id: 2,
      member_ids: null,
    });
    expect(
      buildInspectionBody(form({ objectType: 'employee', employeeId: 7, departmentId: 3 }), undefined),
    ).toMatchObject({
      employee_id: 7,
      department_id: null,
      organization_branch_id: null,
    });
    expect(buildInspectionBody(form({ objectType: 'process', processName: " Yig'ish " }), 1)).toMatchObject({
      process_name: "Yig'ish",
      employee_id: null,
      department_id: null,
    });
  });

  it('bekor qilishda sabab MAJBURIY (server 422 qaytaradi)', () => {
    expect(validateCancel('  ')).toBe('cancelReasonRequired');
    expect(validateCancel("Reja o'zgardi")).toBeNull();
  });

  it("topilma: tavsif majburiy; tavsiya/muddat bo'sh — null", () => {
    expect(validateFinding({ description: ' ', severity: 'low', recommendation: '', dueDate: '' })).toBe(
      'findingRequired',
    );
    expect(buildFindingBody({ description: ' Xato ', severity: 'high', recommendation: ' ', dueDate: '' })).toEqual({
      description: 'Xato',
      severity: 'high',
      recommendation: null,
      responsible_id: null,
      due_date: null,
    });
  });

  it('holat amallari: boshlash — faqat «planned»; yakunlash — planned/in_progress', () => {
    expect(canStart('planned')).toBe(true);
    expect(canStart('in_progress')).toBe(false);
    expect(canFinish('planned')).toBe(true);
    expect(canFinish('in_progress')).toBe(true);
    expect(canFinish('completed')).toBe(false);
    expect(canFinish('cancelled')).toBe(false);
  });

  it("yaratish huquqi: qatorlar bor — birortasi can_manage; bo'sh — rol predikati (v2)", () => {
    expect(canCreateInspection(emp(), [{ can_manage: true }])).toBe(true);
    expect(canCreateInspection(emp('hr'), [{ can_manage: false }])).toBe(false); // server qatorlari ustun
    expect(canCreateInspection(emp('hr'), [])).toBe(true);
    expect(canCreateInspection(emp('ministr'), [])).toBe(true);
    expect(canCreateInspection(emp('deputy'), [])).toBe(true);
    expect(canCreateInspection(emp(undefined, { is_kpi_admin: true }), [])).toBe(true);
    expect(canCreateInspection(emp(), [])).toBe(false);
    expect(canCreateInspection({ id: 1, type: 'master-admin' } as never, [])).toBe(true);
  });
});
