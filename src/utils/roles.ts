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

/**
 * Xodimga BEVOSITA rahbar biriktirilganmi (web roleHelpers.hasSupervisor 1:1).
 *
 * Ilgari ekranlar `!employee?.supervisor` deb faqat ICHMA-ICH kelgan obyektga
 * qarardi. `EmployeeRead` payloadi yengillashtirilib (N+1 auditi) rekursiv
 * `supervisor` obyekti olib tashlansa, `supervisor_id` qolgan bo'lsa ham HAR
 * BIR xodim "rahbar" bo'lib qolardi: Bosh sahifa "Mening so'rovlarim" o'rniga
 * "Kiruvchi so'rovlar"ni ko'rsatardi. Ikkala manbani ham tekshiramiz.
 */
export function hasSupervisor(user?: User | null): boolean {
  const emp = user?.employee;
  return !!(emp?.supervisor_id || emp?.supervisor?.id);
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

/** Branches where the user is an HR branch-leader (leadership_role='hr'), from /me. */
export function getHrBranchIds(user?: User | null): number[] {
  return user?.hr_branch_ids ?? [];
}

/** Branches the user's employee belongs to (multi-org membership). */
export function getAllowedBranchIds(user?: User | null): number[] {
  return user?.employee?.organization_branches?.map((b) => b.id) ?? [];
}

/**
 * Branch-scoped HR check — mirrors the web roleHelpers.isBranchHr. True if the
 * user is an HR branch-leader of `branchId`, or a multi-org HR who belongs to it.
 * Use for rights the backend scopes to a specific branch (e.g. trip-movement
 * management) — a plain isHR would let an HR of one branch act on another's data.
 */
export function isBranchHr(user: User | null | undefined, branchId?: number | null): boolean {
  if (branchId == null) return false;
  if (getHrBranchIds(user).map(Number).includes(Number(branchId))) return true;
  return isHR(user) && getAllowedBranchIds(user).map(Number).includes(Number(branchId));
}

export function isDeputy(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'deputy');
}

/** decree leadership signers: ministr OR deputy */
export function isLeadership(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'ministr') || hasMultiOrgRole(user, 'deputy');
}

/** Tabel sozlamalarida shu filialga DIREKTOR qilib biriktirilgan filiallar. */
export function getDirectorBranchIds(user?: User | null): number[] {
  return user?.director_branch_ids ?? [];
}

/** Tabel sozlamalarida shu filialga O'RINBOSAR qilib biriktirilgan filiallar. */
export function getDeputyBranchIds(user?: User | null): number[] {
  return user?.deputy_branch_ids ?? [];
}

/**
 * ASOSIY filial (id=1) safarini tasdiqlaydigan rahbar — FAQAT "Boshqaruv raisi
 * o'rinbosari" lavozimidagi deputy ("Birinchi o'rinbosari" KIRMAYDI).
 * Web roleHelpers.isTripApprover bilan 1:1.
 */
export function isTripApprover(user?: User | null): boolean {
  if (!isDeputy(user)) return false;
  const jp = user?.employee?.job_position;
  const name = (typeof jp === 'object' ? jp?.name : (jp as unknown as string)) || '';
  const norm = name.toLowerCase().replace(/[’`ʼ]/g, "'").trim();
  return norm.includes("boshqaruv raisi o'rinbosari") && !norm.includes('birinchi');
}

/** Filialning biriktirilgan rahbari (direktor yoki o'rinbosar)mi. */
export function isBranchTripApprover(user: User | null | undefined, branchId?: number | null): boolean {
  if (branchId == null) return false;
  const bid = Number(branchId);
  return (
    getDirectorBranchIds(user).map(Number).includes(bid) ||
    getDeputyBranchIds(user).map(Number).includes(bid)
  );
}

/**
 * Berilgan filial safarini tasdiqlash huquqi (web canApproveTripForBranch):
 * asosiy filial (id=1) → qat'iy lavozim, boshqa filial → biriktirilgan rahbar.
 * Backend `_is_trip_approver` shu qoidani takrorlaydi — tugma ko'rinsa-yu
 * server rad etsa, foydalanuvchi 403 olardi.
 */
export function canApproveTripForBranch(user: User | null | undefined, branchId?: number | null): boolean {
  if (isSiteMasterAdmin(user)) return true;
  if (branchId == null || Number(branchId) === 1) return isTripApprover(user);
  return isBranchTripApprover(user, branchId);
}

export function isKPP(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'kpp';
}

export function isChancellery(user?: User | null): boolean {
  const role = getMultiOrgRole(user);
  return role === 'chancellery' || role === 'kanselariya';
}

/** Branches where the user is a chancellery/devonxona branch-leader
 *  (leadership_role='chancellery'), from /me. */
export function getChancelleryBranchIds(user?: User | null): number[] {
  return user?.chancellery_branch_ids ?? [];
}

/** Is the user the assigned devonxona of `branchId` (a branch-leader devonxona)? */
export function isBranchDevonxona(user: User | null | undefined, branchId?: number | null): boolean {
  if (branchId == null) return false;
  return getChancelleryBranchIds(user).map(Number).includes(Number(branchId));
}

/** Devonxona in ANY sense — the multi-org 'chancellery'/'kanselariya' role OR a
 *  branch-leader devonxona (chancellery_branch_ids). Mirrors the web
 *  roleHelpers.isAnyChancellery: use this to switch the UI into the devonxona
 *  view; a plain isChancellery would hide devonxona actions from branch leaders. */
export function isAnyChancellery(user?: User | null): boolean {
  return isChancellery(user) || getChancelleryBranchIds(user).length > 0;
}

/** May the user act as devonxona ON a specific branch's record — the global
 *  'chancellery' role OR that branch's assigned devonxona. Mirrors the web
 *  roleHelpers.canActAsChancellery; every devonxona ACTION button checks this
 *  (OR'd with master-admin), so a devonxona of one branch cannot act on another. */
export function canActAsChancellery(user: User | null | undefined, branchId?: number | null): boolean {
  return isChancellery(user) || isBranchDevonxona(user, branchId);
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

// CRUD gate for chairman tasks — the minister only views (web ChairmanTasksPage).
export function canManageChairmanTasks(user?: User | null): boolean {
  return isSecretariat(user) || isSiteMasterAdmin(user);
}

// May create/edit news posts. `/me` carries the resolved `is_news_manager` flag
// (backend can_manage_news = master-admin | admin | HR | department news-manager);
// we OR in the coarse roles so the gate holds even if the flag is absent.
export function isNewsManager(user?: User | null): boolean {
  return (
    !!user?.is_news_manager ||
    isMasterAdmin(user) ||
    isHR(user) ||
    user?.type === 'admin'
  );
}

// ── Page visibility — derived from the web navConfig role tables ──────────────
export type PageKey =
  | 'home' | 'orders' | 'letters' | 'guests' | 'projects'
  | 'employees' | 'attendance' | 'requests' | 'documents' | 'kpi'
  | 'timesheet' | 'assistant' | 'salary' | 'team' | 'birthdays' | 'news'
  | 'notifications' | 'profile' | 'support' | 'chairman' | 'directory' | 'terminals';

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
    // Phone directory: a company phone book (no PII) the backend serves to any
    // authenticated role without scoping — visible to everyone, KPP included.
    case 'directory':
      return true;
    // Projects: everyone except single-role HR and KPP.
    case 'projects':
      return !isSingleRoleHR(user) && !kpp;
    // Employees directory: only HR / deputy / master-admin (+ministr).
    case 'employees':
      return isMasterAdmin(user) || isHR(user) || isDeputy(user);
    // KPI: same nav rule as attendance (absent from KPP_NAV / CHANCELLERY_NAV)
    // AND gated by the auth/me flag kpi_enabled. The backend closes /kpi/*
    // behind require_kpi_enabled (403 kpi_not_enabled, including /my-scorecard)
    // for anyone outside the head branch, so we hide the tile rather than let
    // them 403 on every tap. Mirrors the web navConfig `needsKpi` pruning.
    case 'kpi':
      return !kpp && !chancellery && !!user?.kpi_enabled;
    // Attendance & leave requests: not for KPP or chancellery.
    // Documents (Hujjatlar): web guards /hujjatlar with the same rule — KPP and
    // chancellery are redirected away (App.jsx route guard + nav omission).
    // Timesheet (Учёт времени: мой табель / дежурства / праздники) follows the
    // same nav rule as attendance — the web /tabel, /navbatchilik and /holidays
    // pages are all hidden from KPP and chancellery.
    case 'attendance':
    case 'requests':
    case 'documents':
    case 'timesheet':
      return !kpp && !chancellery;
    // LLM assistant. The backend now GATES /llm/* server-side
    // (AuthenticationService.require_llm_access, pentest 2026-07-30) to
    // admin / master-admin / HR / deputy / ministr only. The old
    // `!isEmployeeLike && !kpp` was broader — it still showed the FAB to
    // chancellery (devonxona) and any other non-employee-like special role,
    // who then hit a 403 on tap. Mirror the backend + web (canUseAiAssistant)
    // EXACTLY: isMasterAdmin covers master-admin + ministr; add admin (akt),
    // HR and deputy. Everyone else (plain employee, accounting, Kuzatuvchi,
    // KPP, chancellery, monitoring) is excluded.
    case 'assistant':
      return isMasterAdmin(user) || user?.type === 'admin' || isHR(user) || isDeputy(user);
    // TERMINALLAR (turniket / HikCentral monitoringi). Backend darvozasi
    // `require_system_admin`: admin hisobi, master-admin YOKI tabel
    // sozlamalarida "Texnik yordam (AKT)" roli berilgan xodim (o'z filiali
    // doirasida). Shu uchtasini aynan takrorlaymiz — boshqasi 403 oladi.
    case 'terminals':
      return canMonitorTerminals(user);
    // Chairman agenda (kun tartibi): secretariat / minister / site master-admin.
    case 'chairman':
      return canAccessChairmanTasks(user);
    // Personal / convenience pages — always available.
    // Support (Texnik yordam): any employee may file a ticket; the backend 400s
    // (support_not_available) if the branch has no AKT specialist, surfaced as a
    // toast rather than hiding the tile.
    case 'home':
    case 'salary':
    case 'team':
    case 'birthdays':
    case 'news':
    case 'notifications':
    case 'profile':
    case 'support':
      return true;
    default:
      return true;
  }
}

/**
 * Turniket/HikCentral monitoringiga kira oladimi (backend `require_system_admin`
 * bilan 1:1): `admin` hisobi, master-admin yoki AKT roli berilgan xodim.
 * Ministr bu yerga KIRMAYDI — `isMasterAdmin` uni ham qamrab olgani uchun
 * `isSiteMasterAdmin` ishlatiladi.
 */
export function canMonitorTerminals(user?: User | null): boolean {
  return (
    user?.type === 'admin' ||
    isSiteMasterAdmin(user) ||
    (user?.akt_branch_ids?.length ?? 0) > 0
  );
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
