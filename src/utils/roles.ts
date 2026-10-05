import i18n from '../i18n';
import type { User, Employee } from '../types';
import { resolveEmployeeBranchId } from './branch';

// ─────────────────────────────────────────────────────────────────────────────
// Role resolution — mirrors the web's shared/utils/roleHelpers.js 1:1 so the
// mobile app shows exactly the same pages per user type as the web dashboard.
// All special roles are type === 'employee' with is_multi_org_user === true and
// a multi_org_employee_role ('hr' | 'kpp' | 'ministr' | 'deputy' | 'chancellery' | ...).
// ─────────────────────────────────────────────────────────────────────────────

// multi_org_employee_role may arrive as a string or an array depending on endpoint.
function primaryMultiOrgRoles(employee?: Employee): string[] {
  if (!employee?.is_multi_org_user) return [];
  const raw: any = employee?.multi_org_employee_role;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw ? [raw] : [];
}

/**
 * Every role the person holds (web v2 roles.ts 1:1). `is_kpi_admin` is a
 * SEPARATE boolean column, not a value inside multi_org_employee_role — it
 * stacks on top of whatever the primary role is (a plain employee can still be
 * a KPI admin), so it is appended after the primary roles.
 */
export function getMultiOrgRoles(employee?: Employee): string[] {
  const extra = employee?.is_kpi_admin ? ['kpi_admin'] : [];
  return [...primaryMultiOrgRoles(employee), ...extra];
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

/** Verifix «Администратор КПЭ» — the stacked `is_kpi_admin` flag (web v2). */
export function isKpiAdmin(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'kpi_admin');
}

/** May manage KPI catalogues, results and evaluation sheets (web v2 canManageKpi). */
export function canManageKpi(user?: User | null): boolean {
  return isMasterAdmin(user) || isHR(user) || isKpiAdmin(user);
}

/** Branches where the user is an HR branch-leader (leadership_role='hr'), from /me. */
function getHrBranchIds(user?: User | null): number[] {
  return user?.hr_branch_ids ?? [];
}

/**
 * Xodim TEGISHLI bo'lgan filiallar — backend `core/scoping.employee_branch_ids`
 * bilan 1:1: BO'LIM filiali + M2M biriktirmalari.
 *
 * ⚠️ Ilgari bu yerda FAQAT M2M (`organization_branches`) bor edi. Ko'p kadr
 * xodimining M2M ro'yxati BO'SH (ular filialga BO'LIM orqali tegishli), shu
 * sababli `isBranchHr` doim `false` qaytarardi va mobil o'sha kadrga
 * amallarni KO'RSATMASDI, backend esa ruxsat berardi. Jonli o'lchov
 * (TEST, 2026-08-26): `confirmed` buyruqda kadr uchun backend "qo'llash" ga
 * RUXSAT berdi, mobilда esa tugma umuman chiqmasdi.
 */
export function getAllowedBranchIds(user?: User | null): number[] {
  const emp = user?.employee;
  if (!emp) return [];
  const ids = new Set<number>();
  const deptBranch = emp.department?.organization_branch_id;
  if (deptBranch != null) ids.add(Number(deptBranch));
  if (emp.primary_organization_branch_id != null) {
    ids.add(Number(emp.primary_organization_branch_id));
  }
  for (const b of emp.organization_branches ?? []) {
    if (b?.id != null) ids.add(Number(b.id));
  }
  return [...ids];
}

/**
 * Every branch this person belongs to — HOME DEPARTMENT plus the multi-org list.
 *
 * ⚠️ The M2M list alone is not membership. The server resolves it as department
 * branch ∪ M2M (`core/scoping.employee_branch_ids`, and `letter.py._emp_in_branch`
 * checks the department first), and roughly half the directory has no M2M row at
 * all — their branch comes only from their department. Judging membership by the
 * M2M list hid the trip buttons from those KADR accounts while the API would have
 * accepted the write. The web had the same bug and fixed it the same way.
 */
function employeeBranchIds(user?: User | null): number[] {
  const home = user?.employee?.department?.organization_branch_id;
  const ids = getAllowedBranchIds(user).map(Number);
  return home != null ? Array.from(new Set([Number(home), ...ids])) : ids;
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
  return isHR(user) && employeeBranchIds(user).includes(Number(branchId));
}

export function isDeputy(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'deputy');
}

/** decree leadership signers: ministr OR deputy */
export function isLeadership(user?: User | null): boolean {
  return hasMultiOrgRole(user, 'ministr') || hasMultiOrgRole(user, 'deputy');
}

/** Tabel sozlamalarida shu filialga DIREKTOR qilib biriktirilgan filiallar. */
function getDirectorBranchIds(user?: User | null): number[] {
  return user?.director_branch_ids ?? [];
}

/** Tabel sozlamalarida shu filialga O'RINBOSAR qilib biriktirilgan filiallar. */
function getDeputyBranchIds(user?: User | null): number[] {
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
  if (isBranchDevonxona(user, branchId)) return true;
  // Web v2: the GLOBAL role is branch-bound as well — the server accepts it only
  // when the document's branch is one of the person's own (department branch ∪
  // multi-org list). A wider client check just draws a button that answers 403.
  if (!isChancellery(user)) return false;
  if (branchId == null) return true;
  const own = new Set(employeeBranchIds(user));
  return own.size === 0 || own.has(Number(branchId));
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
  return isEmployee(user) || isAccounting(user) || isDashboardViewer(user) || isNazoratchi(user);
}

/**
 * NAZORATCHI — the supervisory role (web v2 roles.ts). Without it the account
 * could not be classified: not employee-like, so stripped of its personal pages.
 */
export function isNazoratchi(user?: User | null): boolean {
  return getMultiOrgRole(user) === 'nazoratchi';
}

/** A monitoring post operator — the role arrives under either name (web v2). */
export function isMonitoringOperator(user?: User | null): boolean {
  const role = getMultiOrgRole(user);
  return role === 'monitoring' || role === 'monitoring_operator';
}

/** An `admin` account — a branch's system administrator, with no employee card. */
export function isBranchAdmin(user?: User | null): boolean {
  return String(user?.type) === 'admin';
}

/** Buyruq turlarini yozishi mumkinmi — web v2 `auth/canManage.ts` `canManageOrderTypes` 1:1. */
export function canManageOrderTypes(user?: User | null): boolean {
  return isSiteMasterAdmin(user) || isBranchAdmin(user) || isHR(user) || isMinister(user);
}

/**
 * Tashkiliy tuzilmani boshqarish (bo'limlar, lavozimlar, sxema) — web v2
 * `auth/canManage.ts` `canManageStructure` 1:1 (backend `org_structure_scope`).
 */
export function canManageStructure(user?: User | null): boolean {
  return isSiteMasterAdmin(user) || isBranchAdmin(user) || isHR(user);
}

/** Ish rejasini yozish — v2 WorkPlanPage: canManageStructure || ministr || deputy. */
export function canWriteWorkPlan(user?: User | null): boolean {
  return canManageStructure(user) || isMinister(user) || isDeputy(user);
}

/** Malaka oshirish yozuvlarini yozish — v2 TrainingsPage: canManageEmployees (kadr/bosh admin) || ministr. */
export function canWriteTrainings(user?: User | null): boolean {
  return isHR(user) || isSiteMasterAdmin(user) || isMinister(user);
}

/** Interaktiv xizmat so'rovlarini ko'rib chiqish — v2 `canReviewServices` (server `can_manage`; ministr EMAS). */
export function canReviewServices(user?: User | null): boolean {
  return isHR(user) || isSiteMasterAdmin(user);
}

/** Shtat jadvalini yozish va «Muammolar» — v2 `canManageStaff` (ministr EMAS: backend 403). */
export function canManageStaff(user?: User | null): boolean {
  return isSiteMasterAdmin(user) || isHR(user);
}

/** Kechikish ma'lumotini ko'rishi mumkinmi — web v2 `canSeeLateness` 1:1 (asosiy rol bo'yicha). */
export function canSeeLateness(user?: User | null): boolean {
  if (user?.type === 'master-admin' || String(user?.type) === 'admin') return true;
  const primary = getMultiOrgRole(user);
  if (primary && ['hr', 'ministr', 'deputy', 'monitoring', 'dashboard'].includes(primary)) return true;
  return !!user?.is_line_manager;
}

/** «Mening jamoam»: whoever manages people (server `scoping.is_line_manager`, on /me). */
export function canSeeTeam(user?: User | null): boolean {
  return !!user?.is_line_manager;
}

/** Whoever the duty roster concerns: member, viewer, or a department that runs one; HR/master manage it. */
export function canSeeDuty(user?: User | null): boolean {
  if (isHR(user) || isMasterAdmin(user)) return true;
  return Boolean(user?.is_navbatchi || user?.is_navbatchi_viewer || user?.employee?.department?.has_navbatchilik);
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

// ── Page visibility — web v2 module catalogue (navConfig.ts MODULES) ─────────
export type PageKey =
  | 'home' | 'orders' | 'letters' | 'guests' | 'projects'
  | 'employees' | 'attendance' | 'requests' | 'documents' | 'kpi'
  | 'timesheet' | 'assistant' | 'salary' | 'team' | 'birthdays' | 'news'
  | 'notifications' | 'profile' | 'support' | 'chairman' | 'directory' | 'terminals'
  | 'duty' | 'holidays'
  // v3: web v2 katalogining qolgan modullari (ekranlari to'lqinlarda — `ready`).
  | 'services' | 'zoom' | 'vehicles' | 'ijro' | 'workPlan' | 'medical' | 'health'
  | 'registrationStatus' | 'orderTypes' | 'tempOrders' | 'staffPositions' | 'structure'
  | 'responsibles' | 'hrQuality' | 'trainings' | 'learning' | 'inspections' | 'reports'
  | 'dictionaries' | 'tabelSettings' | 'monitoring' | 'kpp' | 'videoGuide' | 'users'
  | 'registrations' | 'auditLog' | 'branches' | 'turnstiles' | 'customFields' | 'sysHealth' | 'lms';

/** Web v2 `RoleKey` — the key a module's audience is written in. */
export type RoleKey =
  | 'masterAdmin' | 'employee' | 'hr' | 'kpp' | 'chancellery' | 'ministr' | 'deputy'
  | 'accounting' | 'dashboard' | 'monitoring' | 'nazoratchi' | 'guest' | 'admin';

const MULTI_ORG_ROLE_KEYS: Record<string, RoleKey> = {
  ministr: 'ministr',
  deputy: 'deputy',
  hr: 'hr',
  chancellery: 'chancellery',
  kanselariya: 'chancellery',
  accounting: 'accounting',
  dashboard: 'dashboard',
  kpp: 'kpp',
  monitoring_operator: 'monitoring',
  monitoring: 'monitoring',
  nazoratchi: 'nazoratchi',
};

/**
 * A post/kiosk account: KPP or monitoring. NOT an employee — no department and
 * no position — but it does have a branch (and may have several), which is the
 * only thing that scopes it. The web makes the same distinction.
 */
export function isSeparateAccount(user?: User | null): boolean {
  const t = user?.type;
  if (!t) return false;
  return t !== 'employee' && t !== 'admin' && t !== 'master-admin' && t !== 'guest';
}

/** Web v2 getRoleKey 1:1 — the user's primary role as an audience key. */
export function getRoleKey(user?: User | null): RoleKey {
  if (user?.type === 'guest') return 'guest';
  const role = getMultiOrgRole(user);
  if (role && MULTI_ORG_ROLE_KEYS[role]) return MULTI_ORG_ROLE_KEYS[role];
  if (isSiteMasterAdmin(user)) return 'masterAdmin';
  if (isBranchAdmin(user)) return 'admin';
  if (isSeparateAccount(user)) return user?.type === 'kpp' ? 'kpp' : 'monitoring';
  return 'employee';
}

const ALL: RoleKey[] = [
  'masterAdmin', 'ministr', 'deputy', 'hr', 'chancellery',
  'accounting', 'dashboard', 'monitoring', 'kpp', 'nazoratchi', 'employee',
];
const ADMIN_ONLY: RoleKey[] = ['masterAdmin'];
const ADMIN_HR: RoleKey[] = ['masterAdmin', 'hr'];
const ADMIN_HR_LEAD: RoleKey[] = ['masterAdmin', 'hr', 'ministr', 'deputy'];

type ModuleGate = (user: User | null | undefined) => boolean;
type ModuleDef = {
  /** web v2 module key — the id stored in the `nav.modules` setting. NEVER rename. */
  key: string;
  defaultRoles: RoleKey[];
  /** Gates no setting may override (data- or licence-bound). */
  gates?: ModuleGate[];
  /** Also open to a system admin (admin account / AKT employee), web SYSTEM_ADMIN_KEYS. */
  systemAdmin?: boolean;
  /**
   * v3: mobil ekrani bormi. `false` — modul HECH KIMGA ko'rinmaydi (singan havola
   * bo'lmasin); tegishli to'lqin ekranni qurgach `true` bo'ladi. Default `true`.
   */
  ready?: boolean;
};

const needsEmployee: ModuleGate = (u) => !!u?.employee?.id || isSiteMasterAdmin(u);
// v2 navConfig darvozalari (needsMedical / needsHealth / needsReports / needsFleet).
const needsMedical: ModuleGate = (u) => u?.medical_enabled === true;
const needsHealth: ModuleGate = (u) => !!u?.nurse_branch_ids?.length || isSiteMasterAdmin(u);
const needsFleet: ModuleGate = (u) =>
  isSiteMasterAdmin(u) || !!u?.transport_branch_ids?.length || !!u?.transport_approver_branch_ids?.length;

/** v2 `canSeeReports` — modul darvozasi (server `services/reports/access.py` bilan bir xil). */
export function reportsGate(user?: User | null): boolean {
  return (
    isMasterAdmin(user) ||
    user?.type === 'admin' ||
    isHR(user) ||
    isDeputy(user) ||
    isAccounting(user) ||
    isKpiAdmin(user) ||
    !!user?.is_line_manager
  );
}

/**
 * ⚠️ THE MODULE CATALOGUE — copied from web v2 `navConfig.ts` MODULES, keyed by
 * the mobile page. `defaultRoles` is the FALLBACK: the master admin's
 * `nav.modules` setting (system-settings) wins, exactly as on the web.
 */
const MODULE_FOR_PAGE: Partial<Record<PageKey, ModuleDef>> = {
  home: { key: 'home', defaultRoles: [...ALL, 'guest'] },
  chairman: { key: 'chairmanTasks', defaultRoles: ALL, gates: [(u) => canAccessChairmanTasks(u)] },
  kpi: { key: 'kpi', defaultRoles: ALL, gates: [(u) => u?.kpi_enabled !== false] },
  team: { key: 'team', defaultRoles: ALL, gates: [canSeeTeam] },
  support: { key: 'support', defaultRoles: ALL, gates: [needsEmployee] },
  projects: { key: 'projects', defaultRoles: ALL },
  news: { key: 'news', defaultRoles: ALL },
  orders: { key: 'orders', defaultRoles: ALL },
  letters: { key: 'letters', defaultRoles: ALL },
  documents: { key: 'documents', defaultRoles: ALL },
  employees: { key: 'employees', defaultRoles: ADMIN_HR_LEAD },
  // Org-wide attendance (the donut + roster). A person's OWN day is 'timesheet'.
  attendance: {
    key: 'attendance',
    defaultRoles: ['masterAdmin', 'hr', 'accounting', 'monitoring', 'nazoratchi', 'deputy', 'ministr'],
  },
  timesheet: {
    key: 'myAttendance',
    defaultRoles: ['employee', 'accounting', 'dashboard', 'chancellery', 'kpp', 'deputy', 'ministr'],
  },
  guests: { key: 'guests', defaultRoles: ALL },
  directory: { key: 'phone', defaultRoles: ALL },
  duty: { key: 'duty', defaultRoles: ALL, gates: [canSeeDuty] },
  requests: { key: 'requestPermission', defaultRoles: ALL },
  holidays: { key: 'holidays', defaultRoles: ADMIN_HR },
  terminals: { key: 'hik', defaultRoles: ADMIN_ONLY, systemAdmin: true },

  // ── v3: qolgan v2 modullari. `ready: false` — ekran hali yo'q (W2–W6). ──
  services: { key: 'services', defaultRoles: [...ALL, 'guest'] },
  zoom: { key: 'zoom', defaultRoles: ALL },
  vehicles: { key: 'vehicles', defaultRoles: ALL, gates: [needsFleet] },
  ijro: { key: 'ijro', defaultRoles: ALL },
  workPlan: { key: 'workPlan', defaultRoles: ADMIN_HR_LEAD },
  medical: { key: 'medical', defaultRoles: ALL, gates: [needsMedical] },
  health: { key: 'health', defaultRoles: ALL, gates: [needsHealth] },
  registrationStatus: { key: 'registrationStatus', defaultRoles: ['guest'] },
  orderTypes: { key: 'orderTypes', defaultRoles: ADMIN_HR },
  tempOrders: { key: 'tempOrders', defaultRoles: ADMIN_HR },
  staffPositions: { key: 'staffPositions', defaultRoles: ADMIN_HR_LEAD },
  structure: { key: 'structure', defaultRoles: ALL },
  responsibles: { key: 'responsibles', defaultRoles: ADMIN_HR },
  hrQuality: { key: 'hrQuality', defaultRoles: ADMIN_HR },
  trainings: { key: 'trainings', defaultRoles: ALL },
  learning: { key: 'learning', defaultRoles: ALL },
  inspections: { key: 'inspections', defaultRoles: ADMIN_HR_LEAD },
  reports: {
    key: 'reports',
    defaultRoles: ['masterAdmin', 'ministr', 'deputy', 'hr', 'accounting', 'employee'],
    gates: [reportsGate],
  },
  dictionaries: { key: 'dictionaries', defaultRoles: ALL, ready: false },
  tabelSettings: { key: 'tabelSettings', defaultRoles: ADMIN_HR, ready: false },
  monitoring: { key: 'monitoring', defaultRoles: ['masterAdmin', 'monitoring'] },
  kpp: { key: 'kpp', defaultRoles: ['kpp', 'masterAdmin'] },
  videoGuide: { key: 'videoGuide', defaultRoles: ALL },
  users: { key: 'users', defaultRoles: ADMIN_ONLY },
  registrations: { key: 'registrations', defaultRoles: ADMIN_ONLY, systemAdmin: true },
  auditLog: { key: 'auditLog', defaultRoles: ADMIN_ONLY },
  branches: { key: 'branches', defaultRoles: ADMIN_ONLY, systemAdmin: true, ready: false },
  turnstiles: { key: 'turnstiles', defaultRoles: ADMIN_ONLY, systemAdmin: true, ready: false },
  customFields: { key: 'customFields', defaultRoles: ADMIN_ONLY, systemAdmin: true, ready: false },
  sysHealth: { key: 'sysHealth', defaultRoles: ADMIN_ONLY },
  lms: { key: 'lms', defaultRoles: ADMIN_ONLY },
};

/** v3: modulning mobil ekrani bormi (katalogda `ready !== false`). Katalogda yo'q sahifa — tayyor. */
export function isModuleReady(key: PageKey): boolean {
  return MODULE_FOR_PAGE[key]?.ready !== false;
}

/** Saved shape of the `nav.modules` system setting. Absent module or field = default. */
export type NavModuleOverrides = Record<
  string,
  { enabled?: boolean; roles?: string[]; branches?: number[] } | undefined
>;

// Latest `nav.modules` value (system-settings). Set by useNavSettings(); until
// it arrives — or if the request fails — the defaults apply, so the menu never
// goes blank because a settings call was slow (web AppShell does the same).
let navOverrides: NavModuleOverrides | undefined;

export function setNavOverrides(next: NavModuleOverrides | undefined): void {
  navOverrides = next;
}

/** Post/kiosk accounts get the post screens only (web POST_ACCOUNT_KEYS): the shared
 *  ones plus the ONE watch screen this post works on (kpp → kpp, else monitoring). */
function postAccountPages(user: User | null | undefined): PageKey[] {
  return ['home', 'directory', 'guests', user?.type === 'kpp' ? 'kpp' : 'monitoring'];
}

/** Whether the given user may see a page. Mirrors web v2 getNavForUser. */
export function canAccessPage(
  user: User | null | undefined,
  key: PageKey,
  overrides: NavModuleOverrides | undefined = navOverrides,
): boolean {
  // LLM assistant is not a web v2 menu module. The backend gates /llm/*
  // (require_llm_access) to admin / master-admin / HR / deputy / ministr.
  if (key === 'assistant') {
    return isMasterAdmin(user) || user?.type === 'admin' || isHR(user) || isDeputy(user);
  }
  const mod = MODULE_FOR_PAGE[key];
  if (mod?.ready === false) return false;
  // Mobile-only personal pages (salary, birthdays, notifications, profile).
  if (!mod) return !isSeparateAccount(user) || key === 'notifications' || key === 'profile';

  const cfg = overrides?.[mod.key];
  if (cfg?.enabled === false) return false;
  const systemAdmin = !!mod.systemAdmin && canMonitorTerminals(user);
  // A pure `admin` account has no employee card: system screens only.
  if (isBranchAdmin(user)) return systemAdmin;
  if (isSeparateAccount(user)) return postAccountPages(user).includes(key);
  const audience = (cfg?.roles ?? mod.defaultRoles) as string[];
  if (!audience.includes(getRoleKey(user)) && !systemAdmin) return false;
  // Branch-scoped module: an empty list means everywhere.
  const onlyIn = cfg?.branches ?? [];
  const branchId = resolveEmployeeBranchId(user?.employee);
  if (onlyIn.length > 0 && branchId != null && !onlyIn.map(Number).includes(Number(branchId))) return false;
  return (mod.gates ?? []).every((g) => g(user));
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
