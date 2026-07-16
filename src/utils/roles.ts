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

/**
 * STRICTLY the master-admin account type — excludes ministr. Mirrors the web's
 * roleHelpers.js isSiteMasterAdmin: use it for rights the backend grants only
 * to type === 'master-admin' (e.g. KPI management/review override) — gating
 * those on isMasterAdmin would show ministr actions the backend then rejects.
 */
export function isSiteMasterAdmin(user?: User | null): boolean {
  return user?.type === 'master-admin';
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
 * true for "Kuzatuvchi" (dashboard) multi-org employees. On the web they are a
 * regular employee whose HOME page is an HR-style attendance dashboard (other
 * people's keldi-ketdi); no extra pages/export. That home dashboard is a web-
 * only surface not yet built on mobile — we mirror only the ROLE so page/tab
 * visibility (canAccessPage) treats them as employee-like. Mirrors the web's
 * roleHelpers.js isDashboardViewer (added web-side in b86dc9d).
 */
export function isDashboardViewer(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'dashboard';
}

/**
 * Accounting (buxgalter) AND Kuzatuvchi (dashboard) get the WHOLE regular-
 * employee experience — the employee menu, personal pages, employee-scoped
 * rights. When gating a personal page or an employee-scope right, use this
 * instead of `isEmployee`: otherwise the multi-org flag would strip them of
 * employee features. Mirrors the web's roleHelpers.js `isEmployeeLike`
 * (accounting e83f0bb, dashboard b86dc9d). Branch-level accounting and the
 * web-only home surfaces (accountant's Davomat list, Kuzatuvchi's HR dashboard)
 * are intentionally NOT mirrored yet — those don't exist on mobile.
 */
export function isEmployeeLike(user?: User | null): boolean {
  return isEmployee(user) || isAccounting(user) || isDashboardViewer(user);
}

export function isMinister(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'ministr';
}

export function isSecretariat(user?: User | null): boolean {
  return !!user?.is_secretariat;
}

export function canAccessChairmanTasks(user?: User | null): boolean {
  // Web parity (roleHelpers.js): secretariat (full CRUD), minister (view), and
  // the site master-admin.
  return isSecretariat(user) || isMinister(user) || isSiteMasterAdmin(user);
}

// ── Page visibility — derived from the web navConfig role tables ──────────────
export type PageKey =
  | 'home' | 'orders' | 'letters' | 'guests' | 'projects'
  | 'employees' | 'attendance' | 'requests' | 'documents' | 'kpi'
  | 'timesheet' | 'salary' | 'team' | 'birthdays' | 'news' | 'notifications' | 'profile';

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
    // Documents (Hujjatlar): web guards /hujjatlar with the same rule — KPP and
    // chancellery are redirected away (App.jsx route guard + nav omission).
    // KPI: same nav rule — the KPI item is in the master-admin/HR/deputy/
    // employee navs but absent from KPP_NAV and CHANCELLERY_NAV; a plain
    // employee sees ONLY their own scorecard (backend-scoped).
    // Timesheet (Учёт времени: мой табель / дежурства / праздники) follows the
    // same nav rule as attendance — the web /tabel, /navbatchilik and /holidays
    // pages are all hidden from KPP and chancellery.
    case 'attendance':
    case 'requests':
    case 'documents':
    case 'kpi':
    case 'timesheet':
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
