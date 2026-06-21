import type { User, Employee } from '../types';

// multi_org_employee_role may arrive as a string or an array depending on endpoint.
export function getMultiOrgRoles(employee?: Employee): string[] {
  if (!employee?.is_multi_org_user) return [];
  const raw: any = employee?.multi_org_employee_role;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw ? [raw] : [];
}

export function hasMultiOrgRole(user: User | null | undefined, role: string): boolean {
  return getMultiOrgRoles(user?.employee).includes(role);
}

export function isHR(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'hr');
}

export function isChancellery(user?: User | null): boolean {
  const roles = getMultiOrgRoles(user?.employee);
  return roles.includes('chancellery') || roles.includes('kanselariya');
}

// Subtitle for employee pickers: job position (+ head-of-department prefix).
export function employeeSubLabel(emp?: Employee): string {
  const jobPos =
    (typeof emp?.job_position === 'object' ? emp?.job_position?.name : (emp?.job_position as any)) || '';
  return jobPos || 'Lavozim kiritilmagan';
}

export const ORDER_CATEGORY_TRANSLATIONS: Record<string, string> = {
  vacation: "Mehnat ta'tili",
  business_trip: 'Xizmat safari',
  sick_leave: 'Kasallik varaqasi',
};

export function translateCategory(name?: string): string {
  if (!name) return 'Buyruq';
  return ORDER_CATEGORY_TRANSLATIONS[name] || name;
}
