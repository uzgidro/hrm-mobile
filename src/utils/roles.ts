import i18n from '../i18n';
import type { User, Employee } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Role resolution — mirrors the web's shared/utils/roleHelpers.js 1:1 so the
// mobile app shows exactly the same pages per user type as the web dashboard.
// All special roles are type === 'employee' with is_multi_org_user === true and
// a multi_org_employee_role ('hr' | 'kpp' | 'ministr' | 'deputy' | 'chancellery' | ...).
// ─────────────────────────────────────────────────────────────────────────────

// multi_org_employee_role may arrive as a string or an array depending on endpoint.
export function getMultiOrgRoles(employee?: Employee): string[] {
  if (!employee?.is_multi_org_user) return [];
  const raw: any = employee?.multi_org_employee_role;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw ? [raw] : [];
}

export function getMultiOrgRole(user?: User | null): string | null {
  return getMultiOrgRoles(user?.employee)[0] || null;
}

export function hasMultiOrgRole(user: User | null | undefined, role: string): boolean {
  return getMultiOrgRoles(user?.employee).includes(role);
}

/** master-admin type OR employee with 'ministr' role */
export function isMasterAdmin(user?: User | null): boolean {
  return user?.type === 'master-admin' || getMultiOrgRole(user) === 'ministr';
}

/** regular employee (not multi-org) */
export function isEmployee(user?: User | null): boolean {
  return user?.type === 'employee' && !user?.employee?.is_multi_org_user;
}

export function isHR(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'hr');
}

/** only when the employee's *single* multi-org role is HR */
export function isSingleRoleHR(user?: User | null): boolean {
  const roles = getMultiOrgRoles(user?.employee);
  return roles.length === 1 && roles[0] === 'hr';
}

export function isDeputy(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'deputy');
}

/** decree leadership signers: ministr OR deputy */
export function isLeadership(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'ministr') || hasMultiOrgRole(user, 'deputy');
}

export function isKPP(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'kpp';
}

export function isChancellery(user?: User | null): boolean {
  const role = getMultiOrgRole(user);
  return role === 'chancellery' || role === 'kanselariya';
}

/** true for Buxgalteriya (accounting) multi-org employees */
export function isAccounting(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'accounting';
}

/**
 * Accounting (buxgalter) gets the WHOLE regular-employee experience — the
 * employee menu, personal pages, employee-scoped rights — plus an extra
 * Davomat page. When gating a personal page or an employee-scope right, use
 * this instead of `isEmployee`: otherwise the multi-org flag would strip an
 * accountant of employee features. Mirrors the web's roleHelpers.js
 * `isEmployeeLike` (added web-side in e83f0bb). Branch-level accounting
 * (accounting_branch_ids / canActAsAccounting) is intentionally NOT mirrored
 * yet — those fields and the accounting letters tab don't exist on mobile.
 */
export function isEmployeeLike(user?: User | null): boolean {
  return isEmployee(user) || isAccounting(user);
}

export function isMinister(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'ministr';
}

export function isSecretariat(user?: User | null): boolean {
  return !!user?.is_secretariat;
}

export function canAccessChairmanTasks(user?: User | null): boolean {
  return isSecretariat(user) || isMinister(user);
}

// ── Page visibility — derived from the web navConfig role tables ──────────────
export type PageKey =
  | 'home' | 'orders' | 'letters' | 'guests' | 'projects'
  | 'employees' | 'attendance' | 'requests'
  | 'salary' | 'team' | 'birthdays' | 'news' | 'notifications' | 'profile';

/** Whether the given user may see a page. Mirrors which web NAV the role gets. */
export function canAccessPage(user: User | null | undefined, key: PageKey): boolean {
  const kpp = isKPP(user);
  const chancellery = isChancellery(user);
  switch (key) {
    // KPP nav has no documents.
    case 'orders':
    case 'letters':
      return !kpp;
    // Guests appear in every role's nav.
    case 'guests':
      return true;
    // Projects: everyone except single-role HR and KPP.
    case 'projects':
      return !isSingleRoleHR(user) && !kpp;
    // Employees directory: only HR / deputy / master-admin (+ministr).
    case 'employees':
      return isMasterAdmin(user) || isHR(user) || isDeputy(user);
    // Attendance & leave requests: not for KPP or chancellery.
    case 'attendance':
    case 'requests':
      return !kpp && !chancellery;
    // Personal / convenience pages — always available.
    case 'home':
    case 'salary':
    case 'team':
    case 'birthdays':
    case 'news':
    case 'notifications':
    case 'profile':
      return true;
    default:
      return true;
  }
}

// Subtitle for employee pickers: job position (+ head-of-department prefix).
export function employeeSubLabel(emp?: Employee): string {
  const jobPos =
    (typeof emp?.job_position === 'object' ? emp?.job_position?.name : (emp?.job_position as any)) || '';
  return jobPos || i18n.t('status.noPosition');
}

// i18n note (same trade-off as orderStatus.ts): the category CODES (the Record
// keys 'vacation', 'business_trip', 'sick_leave') are backend contract
// identifiers and are NOT translated. The map holds `labelKey`s and the label
// is resolved via i18n.t() at call time in translateCategory() so it follows
// the current language.
export const ORDER_CATEGORY_TRANSLATIONS: Record<string, string> = {
  vacation: 'status.categoryLeave',
  business_trip: 'status.categoryBusinessTrip',
  sick_leave: 'status.categorySickLeave',
};

export function translateCategory(name?: string): string {
  if (!name) return i18n.t('status.categoryDefault');
  const key = ORDER_CATEGORY_TRANSLATIONS[name];
  return key ? i18n.t(key) : name;
}
