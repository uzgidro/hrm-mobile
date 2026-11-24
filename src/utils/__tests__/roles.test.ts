import type { User, Employee } from '../../types';
import {
  userDisplayName,
  canAdministerBranch,
  canSwitchBranchScope,
  hasSupervisor,
  getMultiOrgRoles,
  getMultiOrgRole,
  hasMultiOrgRole,
  isMasterAdmin,
  isSiteMasterAdmin,
  isEmployee,
  isEmployeeLike,
  isAccounting,
  isDashboardViewer,
  isHR,
  isKpiAdmin,
  canManageKpi,
  isNazoratchi,
  isMonitoringOperator,
  getRoleKey,
  setNavOverrides,
  isDeputy,
  isLeadership,
  isKPP,
  isChancellery,
  isAnyChancellery,
  isBranchDevonxona,
  canActAsChancellery,
  getChancelleryBranchIds,
  isMinister,
  isSecretariat,
  canAccessChairmanTasks,
  canAccessPage,
  employeeSubLabel,
  translateCategory,
  ORDER_CATEGORY_TRANSLATIONS,
  type PageKey,
} from '../roles';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal Employee, letting caller override role fields. */
function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    legal_name: 'Test Employee',
    ...overrides,
  } as Employee;
}

/** Regular (non multi-org) employee. */
const regularUser: User = {
  id: 1,
  type: 'employee',
  employee: makeEmployee({ is_multi_org_user: false }),
};

/** Multi-org user with a single string role. */
function multiOrgUser(role: string | string[], extra: Partial<User> = {}): User {
  return {
    id: 2,
    type: 'employee',
    employee: makeEmployee({ is_multi_org_user: true, multi_org_employee_role: role }),
    ...extra,
  };
}

const hrSingleUser = multiOrgUser('hr');
const hrMultiUser = multiOrgUser(['hr', 'deputy']);
const kppUser = multiOrgUser('kpp');
const chancelleryUser = multiOrgUser('chancellery');
const kanselariyaUser = multiOrgUser('kanselariya');
const ministrUser = multiOrgUser('ministr');
const deputyUser = multiOrgUser('deputy');
const accountingUser = multiOrgUser('accounting');
const dashboardUser = multiOrgUser('dashboard');
const secretariatUser: User = {
  id: 9,
  type: 'employee',
  employee: makeEmployee({ is_multi_org_user: false }),
  is_secretariat: true,
};
const masterAdminUser: User = { id: 10, type: 'master-admin' };

const ALL_PAGES: PageKey[] = [
  'home', 'orders', 'letters', 'guests', 'projects',
  'employees', 'attendance', 'requests', 'documents', 'kpi',
  'timesheet', 'assistant', 'salary', 'team', 'birthdays', 'news', 'notifications', 'profile',
  'support', 'chairman', 'directory', 'terminals', 'duty', 'holidays',
];

// ─────────────────────────────────────────────────────────────────────────────
// getMultiOrgRoles
// ─────────────────────────────────────────────────────────────────────────────
describe('getMultiOrgRoles', () => {
  it('returns [] when employee is undefined', () => {
    expect(getMultiOrgRoles(undefined)).toEqual([]);
  });

  it('returns [] when is_multi_org_user is falsy', () => {
    expect(getMultiOrgRoles(makeEmployee({ is_multi_org_user: false }))).toEqual([]);
    expect(getMultiOrgRoles(makeEmployee({}))).toEqual([]);
  });

  it('wraps a string role into a single-element array', () => {
    expect(
      getMultiOrgRoles(makeEmployee({ is_multi_org_user: true, multi_org_employee_role: 'hr' })),
    ).toEqual(['hr']);
  });

  it('returns the array as-is (filtering falsy entries) when role is an array', () => {
    expect(
      getMultiOrgRoles(
        makeEmployee({ is_multi_org_user: true, multi_org_employee_role: ['hr', 'deputy'] }),
      ),
    ).toEqual(['hr', 'deputy']);
  });

  it('filters falsy entries out of the array', () => {
    expect(
      getMultiOrgRoles(
        makeEmployee({
          is_multi_org_user: true,
          multi_org_employee_role: ['hr', '', null as any, 'kpp'],
        }),
      ),
    ).toEqual(['hr', 'kpp']);
  });

  it('returns [] when is_multi_org_user true but role is missing/empty string', () => {
    expect(
      getMultiOrgRoles(makeEmployee({ is_multi_org_user: true })),
    ).toEqual([]);
    expect(
      getMultiOrgRoles(makeEmployee({ is_multi_org_user: true, multi_org_employee_role: '' })),
    ).toEqual([]);
  });

  it('returns empty array (not [undefined]) when role is an empty array', () => {
    expect(
      getMultiOrgRoles(makeEmployee({ is_multi_org_user: true, multi_org_employee_role: [] })),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMultiOrgRole
// ─────────────────────────────────────────────────────────────────────────────
describe('getMultiOrgRole', () => {
  it('returns null for null/undefined user', () => {
    expect(getMultiOrgRole(null)).toBeNull();
    expect(getMultiOrgRole(undefined)).toBeNull();
  });

  it('returns null for a regular (non multi-org) user', () => {
    expect(getMultiOrgRole(regularUser)).toBeNull();
  });

  it('returns the first role from an array', () => {
    expect(getMultiOrgRole(hrMultiUser)).toBe('hr');
  });

  it('returns the string role', () => {
    expect(getMultiOrgRole(kppUser)).toBe('kpp');
  });

  it('returns null when multi-org but no role present', () => {
    expect(getMultiOrgRole(multiOrgUser(''))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasMultiOrgRole
// ─────────────────────────────────────────────────────────────────────────────
describe('hasMultiOrgRole', () => {
  it('returns false for null/undefined user', () => {
    expect(hasMultiOrgRole(null, 'hr')).toBe(false);
    expect(hasMultiOrgRole(undefined, 'hr')).toBe(false);
  });

  it('detects a string role', () => {
    expect(hasMultiOrgRole(kppUser, 'kpp')).toBe(true);
    expect(hasMultiOrgRole(kppUser, 'hr')).toBe(false);
  });

  it('detects any role within an array, including non-first entries', () => {
    expect(hasMultiOrgRole(hrMultiUser, 'hr')).toBe(true);
    expect(hasMultiOrgRole(hrMultiUser, 'deputy')).toBe(true);
    expect(hasMultiOrgRole(hrMultiUser, 'kpp')).toBe(false);
  });

  it('returns false for a regular user', () => {
    expect(hasMultiOrgRole(regularUser, 'hr')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isMasterAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('isMasterAdmin', () => {
  it('true for type master-admin', () => {
    expect(isMasterAdmin(masterAdminUser)).toBe(true);
  });

  it('true for employee whose first multi-org role is ministr', () => {
    expect(isMasterAdmin(ministrUser)).toBe(true);
  });

  it('false for regular / hr / kpp / deputy users', () => {
    expect(isMasterAdmin(regularUser)).toBe(false);
    expect(isMasterAdmin(hrSingleUser)).toBe(false);
    expect(isMasterAdmin(kppUser)).toBe(false);
    expect(isMasterAdmin(deputyUser)).toBe(false);
  });

  it('false for null/undefined', () => {
    expect(isMasterAdmin(null)).toBe(false);
    expect(isMasterAdmin(undefined)).toBe(false);
  });

  it('is driven by the FIRST role only: ministr not first => false', () => {
    // getMultiOrgRole returns first element; if ministr is not first, isMasterAdmin is false.
    expect(isMasterAdmin(multiOrgUser(['hr', 'ministr']))).toBe(false);
    expect(isMasterAdmin(multiOrgUser(['ministr', 'hr']))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isSiteMasterAdmin — STRICTLY the master-admin account type (excludes ministr)
// ─────────────────────────────────────────────────────────────────────────────
describe('isSiteMasterAdmin', () => {
  it('true only for type master-admin', () => {
    expect(isSiteMasterAdmin(masterAdminUser)).toBe(true);
  });

  it('false for ministr — unlike isMasterAdmin (backend grants the override only to the account type)', () => {
    expect(isSiteMasterAdmin(ministrUser)).toBe(false);
    expect(isMasterAdmin(ministrUser)).toBe(true); // the contrast that motivates this helper
  });

  it('false for everyone else and null/undefined', () => {
    expect(isSiteMasterAdmin(regularUser)).toBe(false);
    expect(isSiteMasterAdmin(hrSingleUser)).toBe(false);
    expect(isSiteMasterAdmin(null)).toBe(false);
    expect(isSiteMasterAdmin(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isEmployee
// ─────────────────────────────────────────────────────────────────────────────
describe('isEmployee', () => {
  it('true only for type employee that is NOT multi-org', () => {
    expect(isEmployee(regularUser)).toBe(true);
    expect(isEmployee(secretariatUser)).toBe(true);
  });

  it('false for multi-org employees', () => {
    expect(isEmployee(hrSingleUser)).toBe(false);
    expect(isEmployee(kppUser)).toBe(false);
    expect(isEmployee(ministrUser)).toBe(false);
  });

  it('false for master-admin', () => {
    expect(isEmployee(masterAdminUser)).toBe(false);
  });

  it('false for null/undefined', () => {
    expect(isEmployee(null)).toBe(false);
    expect(isEmployee(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isAccounting
// ─────────────────────────────────────────────────────────────────────────────
describe('isAccounting', () => {
  it('true when the (first) multi-org role is accounting', () => {
    expect(isAccounting(accountingUser)).toBe(true);
    expect(isAccounting(multiOrgUser(['accounting']))).toBe(true);
  });

  it('false when accounting is not first (getMultiOrgRole returns first only)', () => {
    expect(isAccounting(multiOrgUser(['hr', 'accounting']))).toBe(false);
  });

  it('false for non-accounting / regular / master-admin / null', () => {
    expect(isAccounting(regularUser)).toBe(false);
    expect(isAccounting(hrSingleUser)).toBe(false);
    expect(isAccounting(masterAdminUser)).toBe(false);
    expect(isAccounting(null)).toBe(false);
    expect(isAccounting(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isDashboardViewer (Kuzatuvchi)
// ─────────────────────────────────────────────────────────────────────────────
describe('isDashboardViewer', () => {
  it('true when the (first) multi-org role is dashboard', () => {
    expect(isDashboardViewer(dashboardUser)).toBe(true);
    expect(isDashboardViewer(multiOrgUser(['dashboard']))).toBe(true);
  });

  it('false when dashboard is not first (getMultiOrgRole returns first only)', () => {
    expect(isDashboardViewer(multiOrgUser(['hr', 'dashboard']))).toBe(false);
  });

  it('false for non-dashboard / regular / accounting / master-admin / null', () => {
    expect(isDashboardViewer(regularUser)).toBe(false);
    expect(isDashboardViewer(accountingUser)).toBe(false);
    expect(isDashboardViewer(masterAdminUser)).toBe(false);
    expect(isDashboardViewer(null)).toBe(false);
    expect(isDashboardViewer(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isEmployeeLike — regular OR accounting (mirrors web roleHelpers.js)
// ─────────────────────────────────────────────────────────────────────────────
describe('isEmployeeLike', () => {
  it('true for a regular (non multi-org) employee', () => {
    expect(isEmployeeLike(regularUser)).toBe(true);
    expect(isEmployeeLike(secretariatUser)).toBe(true);
  });

  it('true for an accounting multi-org employee', () => {
    expect(isEmployeeLike(accountingUser)).toBe(true);
  });

  it('true for a dashboard (Kuzatuvchi) multi-org employee', () => {
    expect(isEmployeeLike(dashboardUser)).toBe(true);
  });

  it('false for other multi-org roles and master-admin', () => {
    expect(isEmployeeLike(hrSingleUser)).toBe(false);
    expect(isEmployeeLike(kppUser)).toBe(false);
    expect(isEmployeeLike(deputyUser)).toBe(false);
    expect(isEmployeeLike(ministrUser)).toBe(false);
    expect(isEmployeeLike(masterAdminUser)).toBe(false);
  });

  it('false for null/undefined', () => {
    expect(isEmployeeLike(null)).toBe(false);
    expect(isEmployeeLike(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isHR
// ─────────────────────────────────────────────────────────────────────────────
describe('isHR', () => {
  it('true for single-role and multi-role HR', () => {
    expect(isHR(hrSingleUser)).toBe(true);
    expect(isHR(hrMultiUser)).toBe(true);
  });

  it('false for non-HR users', () => {
    expect(isHR(regularUser)).toBe(false);
    expect(isHR(kppUser)).toBe(false);
    expect(isHR(deputyUser)).toBe(false);
    expect(isHR(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Web v2 role additions: kpi_admin (stacked flag), nazoratchi, monitoring
// ─────────────────────────────────────────────────────────────────────────────
describe('web v2 role helpers', () => {
  it('is_kpi_admin stacks on top of the primary role (even on a plain employee)', () => {
    const plainKpiAdmin: User = { id: 3, type: 'employee', employee: makeEmployee({ is_kpi_admin: true }) };
    expect(getMultiOrgRoles(plainKpiAdmin.employee)).toEqual(['kpi_admin']);
    expect(isKpiAdmin(plainKpiAdmin)).toBe(true);
    expect(canManageKpi(plainKpiAdmin)).toBe(true);
    // The primary role stays first — getMultiOrgRole keeps answering 'hr'.
    const hrKpi = multiOrgUser('hr');
    hrKpi.employee!.is_kpi_admin = true;
    expect(getMultiOrgRoles(hrKpi.employee)).toEqual(['hr', 'kpi_admin']);
    expect(getMultiOrgRole(hrKpi)).toBe('hr');
    expect(canManageKpi(regularUser)).toBe(false);
  });

  it('nazoratchi is employee-like (keeps the personal pages)', () => {
    const n = multiOrgUser('nazoratchi');
    expect(isNazoratchi(n)).toBe(true);
    expect(isEmployeeLike(n)).toBe(true);
    expect(getRoleKey(n)).toBe('nazoratchi');
  });

  it('monitoring_operator is the same role as monitoring', () => {
    expect(isMonitoringOperator(multiOrgUser('monitoring'))).toBe(true);
    expect(isMonitoringOperator(multiOrgUser('monitoring_operator'))).toBe(true);
    expect(getRoleKey(multiOrgUser('monitoring_operator'))).toBe('monitoring');
    expect(isMonitoringOperator(regularUser)).toBe(false);
  });

  it('getRoleKey classifies accounts that have no multi-org role', () => {
    expect(getRoleKey(regularUser)).toBe('employee');
    expect(getRoleKey(masterAdminUser)).toBe('masterAdmin');
    expect(getRoleKey({ id: 4, type: 'admin' as User['type'] })).toBe('admin');
    expect(getRoleKey({ id: 5, type: 'guest' })).toBe('guest');
    expect(getRoleKey({ id: 6, type: 'kpp' })).toBe('kpp');
    expect(getRoleKey({ id: 7, type: 'monitoring-operator' })).toBe('monitoring');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isDeputy
// ─────────────────────────────────────────────────────────────────────────────
describe('isDeputy', () => {
  it('true for deputy (string or within array)', () => {
    expect(isDeputy(deputyUser)).toBe(true);
    expect(isDeputy(hrMultiUser)).toBe(true); // ['hr','deputy']
  });

  it('false otherwise', () => {
    expect(isDeputy(regularUser)).toBe(false);
    expect(isDeputy(kppUser)).toBe(false);
    expect(isDeputy(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isLeadership
// ─────────────────────────────────────────────────────────────────────────────
describe('isLeadership', () => {
  it('true for ministr', () => {
    expect(isLeadership(ministrUser)).toBe(true);
  });

  it('true for deputy', () => {
    expect(isLeadership(deputyUser)).toBe(true);
  });

  it('true when ministr present as non-first array element (uses hasMultiOrgRole)', () => {
    expect(isLeadership(multiOrgUser(['hr', 'ministr']))).toBe(true);
  });

  it('false for hr-only / kpp / regular / null', () => {
    expect(isLeadership(hrSingleUser)).toBe(false);
    expect(isLeadership(kppUser)).toBe(false);
    expect(isLeadership(regularUser)).toBe(false);
    expect(isLeadership(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isKPP
// ─────────────────────────────────────────────────────────────────────────────
describe('isKPP', () => {
  it('true only when the FIRST role is kpp', () => {
    expect(isKPP(kppUser)).toBe(true);
    expect(isKPP(multiOrgUser(['kpp']))).toBe(true);
  });

  it('false when kpp is not first (getMultiOrgRole returns first only)', () => {
    expect(isKPP(multiOrgUser(['hr', 'kpp']))).toBe(false);
  });

  it('false otherwise', () => {
    expect(isKPP(regularUser)).toBe(false);
    expect(isKPP(hrSingleUser)).toBe(false);
    expect(isKPP(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isChancellery
// ─────────────────────────────────────────────────────────────────────────────
describe('isChancellery', () => {
  it('true for both chancellery and kanselariya spellings', () => {
    expect(isChancellery(chancelleryUser)).toBe(true);
    expect(isChancellery(kanselariyaUser)).toBe(true);
  });

  it('only considers the first role', () => {
    expect(isChancellery(multiOrgUser(['hr', 'chancellery']))).toBe(false);
    expect(isChancellery(multiOrgUser(['chancellery', 'hr']))).toBe(true);
  });

  it('false otherwise', () => {
    expect(isChancellery(regularUser)).toBe(false);
    expect(isChancellery(kppUser)).toBe(false);
    expect(isChancellery(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch-leader devonxona (chancellery_branch_ids) — isAnyChancellery /
// isBranchDevonxona / canActAsChancellery
// ─────────────────────────────────────────────────────────────────────────────
describe('branch-leader devonxona helpers', () => {
  const branchDevonxona: User = { ...regularUser, chancellery_branch_ids: [5, 9] };

  it('getChancelleryBranchIds reads /me field (empty when absent)', () => {
    expect(getChancelleryBranchIds(branchDevonxona)).toEqual([5, 9]);
    expect(getChancelleryBranchIds(regularUser)).toEqual([]);
  });

  it('isAnyChancellery is true for the multi-org role OR a branch-leader devonxona', () => {
    expect(isAnyChancellery(chancelleryUser)).toBe(true);
    expect(isAnyChancellery(branchDevonxona)).toBe(true);
    expect(isAnyChancellery(regularUser)).toBe(false);
  });

  it('isBranchDevonxona matches only the assigned branches', () => {
    expect(isBranchDevonxona(branchDevonxona, 5)).toBe(true);
    expect(isBranchDevonxona(branchDevonxona, 7)).toBe(false);
    expect(isBranchDevonxona(branchDevonxona, null)).toBe(false);
    expect(isBranchDevonxona(regularUser, 5)).toBe(false);
  });

  it('canActAsChancellery: global role only on its own branches (web v2); branch devonxona only on its branches', () => {
    // No branch known for the global devonxona -> not restricted.
    expect(canActAsChancellery(chancelleryUser, 123)).toBe(true);
    const branchBound = multiOrgUser('chancellery');
    branchBound.employee!.department = { id: 1, name: 'Devonxona', organization_branch_id: 5 } as never;
    expect(canActAsChancellery(branchBound, 5)).toBe(true);
    expect(canActAsChancellery(branchBound, 8)).toBe(false);
    expect(canActAsChancellery(branchDevonxona, 5)).toBe(true);
    expect(canActAsChancellery(branchDevonxona, 8)).toBe(false);
    expect(canActAsChancellery(regularUser, 5)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isMinister
// ─────────────────────────────────────────────────────────────────────────────
describe('isMinister', () => {
  it('true only when the first role is ministr', () => {
    expect(isMinister(ministrUser)).toBe(true);
    expect(isMinister(multiOrgUser(['ministr', 'hr']))).toBe(true);
  });

  it('false when ministr is not first', () => {
    expect(isMinister(multiOrgUser(['hr', 'ministr']))).toBe(false);
  });

  it('false otherwise', () => {
    expect(isMinister(regularUser)).toBe(false);
    expect(isMinister(masterAdminUser)).toBe(false);
    expect(isMinister(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isSecretariat
// ─────────────────────────────────────────────────────────────────────────────
describe('isSecretariat', () => {
  it('true when is_secretariat flag is set', () => {
    expect(isSecretariat(secretariatUser)).toBe(true);
  });

  it('false when flag absent/false', () => {
    expect(isSecretariat(regularUser)).toBe(false);
    expect(isSecretariat(masterAdminUser)).toBe(false);
    expect(isSecretariat(null)).toBe(false);
    expect(isSecretariat(undefined)).toBe(false);
  });

  it('returns a real boolean (not the raw truthy value)', () => {
    expect(isSecretariat({ id: 1, type: 'employee', is_secretariat: true })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canAccessChairmanTasks
// ─────────────────────────────────────────────────────────────────────────────
describe('canAccessChairmanTasks', () => {
  it('true for secretariat', () => {
    expect(canAccessChairmanTasks(secretariatUser)).toBe(true);
  });

  it('true for minister', () => {
    expect(canAccessChairmanTasks(ministrUser)).toBe(true);
  });

  it('true for the site master-admin (web parity)', () => {
    expect(canAccessChairmanTasks(masterAdminUser)).toBe(true);
  });

  it('false otherwise', () => {
    expect(canAccessChairmanTasks(regularUser)).toBe(false);
    expect(canAccessChairmanTasks(hrSingleUser)).toBe(false);
    expect(canAccessChairmanTasks(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canAccessPage — web v2 module catalogue (navConfig.ts MODULES, defaultRoles)
// ─────────────────────────────────────────────────────────────────────────────
describe('canAccessPage (web v2 defaults)', () => {
  type Row = Record<PageKey, boolean>;
  // Pages every signed-in employee-type account gets (audience ALL, no gate).
  const base = {
    home: true, orders: true, letters: true, guests: true, projects: true, requests: true,
    documents: true, news: true, directory: true, salary: false, birthdays: true,
    notifications: true, profile: true,
  };
  const row = (r: Partial<Row>): Row => ({
    ...base,
    employees: false, attendance: false, timesheet: false, kpi: true, assistant: false,
    team: false, support: true, chairman: false, terminals: false, duty: false, holidays: false,
    ...r,
  }) as Row;

  const expected: Record<string, { user: User | null | undefined; row: Row }> = {
    regular: { user: regularUser, row: row({ timesheet: true }) },
    // HR: org attendance + staff + holidays + duty; v2 gives HR no «my attendance».
    hr: { user: hrSingleUser, row: row({ employees: true, attendance: true, assistant: true, duty: true, holidays: true }) },
    // KPP as a multi-org EMPLOYEE role (not a post account) is in ALL.
    kpp: { user: kppUser, row: row({ timesheet: true }) },
    chancellery: { user: chancelleryUser, row: row({ timesheet: true }) },
    kanselariya: { user: kanselariyaUser, row: row({ timesheet: true }) },
    ministr: {
      user: ministrUser,
      row: row({ employees: true, attendance: true, timesheet: true, assistant: true, chairman: true, duty: true }),
    },
    deputy: { user: deputyUser, row: row({ employees: true, attendance: true, timesheet: true, assistant: true }) },
    accounting: { user: accountingUser, row: row({ attendance: true, timesheet: true }) },
    dashboard: { user: dashboardUser, row: row({ timesheet: true }) },
    nazoratchi: { user: multiOrgUser('nazoratchi'), row: row({ attendance: true }) },
    masterAdmin: {
      user: masterAdminUser,
      row: row({
        employees: true, attendance: true, assistant: true, chairman: true, terminals: true, duty: true, holidays: true,
      }),
    },
    secretariat: { user: secretariatUser, row: row({ timesheet: true, chairman: true }) },
    lineManager: { user: { ...regularUser, is_line_manager: true }, row: row({ timesheet: true, team: true }) },
  };

  Object.entries(expected).forEach(([label, { user, row: r }]) => {
    describe(label, () => {
      ALL_PAGES.forEach((page) => {
        it(`${page} => ${r[page]}`, () => {
          expect(canAccessPage(user, page)).toBe(r[page]);
        });
      });
    });
  });

  it('kpi hides only where the branch has it OFF (kpi_enabled === false)', () => {
    expect(canAccessPage({ ...regularUser, kpi_enabled: false }, 'kpi')).toBe(false);
    expect(canAccessPage({ ...regularUser, kpi_enabled: true }, 'kpi')).toBe(true);
    expect(canAccessPage(regularUser, 'kpi')).toBe(true);
  });

  it('a post/kiosk account gets the post screens only', () => {
    const post: User = { id: 20, type: 'kpp' };
    expect(ALL_PAGES.filter((p) => canAccessPage(post, p))).toEqual(['home', 'guests', 'notifications', 'profile', 'directory']);
  });

  it('a branch admin account gets the system screens only', () => {
    const admin: User = { id: 21, type: 'admin' as User['type'] };
    expect(ALL_PAGES.filter((p) => canAccessPage(admin, p))).toEqual(['assistant', 'notifications', 'profile', 'terminals']);
  });

  // v2: mehmonning bosh sahifasi — ariza holati; menyusi `home`, `services`,
  // `registrationStatus`; sarlavhada profil + bildirishnomalar. Xodimlar ro'yxatiga
  // (tug'ilgan kunlar) va mavjud bo'lmagan oylik sahifasiga yo'l yo'q.
  // ⚠️ Bildirishnomalar — YO'Q: server mehmonga faqat `auth/me`, `registrations/me` va o'z xizmat
  // so'rovlarini ochadi (`core/security._GUEST_ALLOWED_EXACT`); `/notifications` → 403 `guest_forbidden`.
  it('a guest gets home and profile only (no notifications / birthdays / salary)', () => {
    const guest: User = { id: 22, type: 'guest' };
    expect(ALL_PAGES.filter((p) => canAccessPage(guest, p))).toEqual(['home', 'profile']);
    expect(canAccessPage(guest, 'services')).toBe(true);
    expect(canAccessPage(guest, 'registrationStatus')).toBe(true);
  });

  it('birthdays: v2 shows them only on the employee / HR home boards', () => {
    expect(canAccessPage(regularUser, 'birthdays')).toBe(true);
    expect(canAccessPage(masterAdminUser, 'birthdays')).toBe(true);
    expect(canAccessPage({ id: 22, type: 'guest' }, 'birthdays')).toBe(false);
    expect(canAccessPage({ id: 21, type: 'admin' as User['type'] }, 'birthdays')).toBe(false);
    expect(canAccessPage({ id: 20, type: 'kpp' }, 'birthdays')).toBe(false);
    expect(canAccessPage({ id: 23, type: 'monitoring' as User['type'] }, 'birthdays')).toBe(false);
  });

  it('salary: v2 has no salary page — hidden for every role', () => {
    for (const user of [regularUser, hrSingleUser, ministrUser, masterAdminUser, { id: 22, type: 'guest' } as User]) {
      expect(canAccessPage(user, 'salary')).toBe(false);
    }
  });

  it('profile stays open to every account; notifications to every account but the guest (server 403)', () => {
    for (const type of ['guest', 'admin', 'kpp', 'monitoring', 'employee', 'master-admin']) {
      const user = { id: 30, type } as unknown as User;
      expect(canAccessPage(user, 'profile')).toBe(true);
      expect(canAccessPage(user, 'notifications')).toBe(type !== 'guest');
    }
  });

  it('an AKT employee reaches terminals as a system admin', () => {
    expect(canAccessPage({ ...regularUser, akt_branch_ids: [3] }, 'terminals')).toBe(true);
  });

  it('duty follows membership / department roster', () => {
    expect(canAccessPage({ ...regularUser, is_navbatchi: true }, 'duty')).toBe(true);
    expect(canAccessPage({ ...regularUser, is_navbatchi_viewer: true }, 'duty')).toBe(true);
  });
});

describe('canAccessPage — master-admin overrides (nav.modules)', () => {
  afterEach(() => setNavOverrides(undefined));

  it('a switched-off module is hidden for everyone', () => {
    expect(canAccessPage(regularUser, 'projects', { projects: { enabled: false } })).toBe(false);
  });

  it('a saved role list replaces the default audience', () => {
    expect(canAccessPage(regularUser, 'employees', { employees: { roles: ['employee'] } })).toBe(true);
    expect(canAccessPage(hrSingleUser, 'orders', { orders: { roles: ['masterAdmin'] } })).toBe(false);
  });

  it('a branch list limits the module to those branches (user branch outside -> hidden)', () => {
    const inBranch3: User = {
      ...regularUser,
      employee: makeEmployee({ primary_organization_branch_id: 3 }),
    };
    expect(canAccessPage(inBranch3, 'news', { news: { branches: [3] } })).toBe(true);
    expect(canAccessPage(inBranch3, 'news', { news: { branches: [7] } })).toBe(false);
  });

  it('the stored overrides are the default argument once loaded', () => {
    setNavOverrides({ news: { enabled: false } });
    expect(canAccessPage(regularUser, 'news')).toBe(false);
    setNavOverrides(undefined);
    expect(canAccessPage(regularUser, 'news')).toBe(true);
  });

  it('gates no setting may override still apply (KPI off in the branch)', () => {
    expect(canAccessPage({ ...regularUser, kpi_enabled: false }, 'kpi', { kpi: { roles: ['employee'] } })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// employeeSubLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('employeeSubLabel', () => {
  it('returns placeholder when emp is undefined', () => {
    expect(employeeSubLabel(undefined)).toBe('Lavozim kiritilmagan');
  });

  it('returns job position name when job_position is an object', () => {
    expect(
      employeeSubLabel(makeEmployee({ job_position: { id: 1, name: 'Muhandis' } })),
    ).toBe('Muhandis');
  });

  it('returns job_position directly when it is a plain string', () => {
    expect(
      employeeSubLabel(makeEmployee({ job_position: 'Direktor' as any })),
    ).toBe('Direktor');
  });

  it('returns placeholder when job_position is missing', () => {
    expect(employeeSubLabel(makeEmployee({}))).toBe('Lavozim kiritilmagan');
  });

  it('returns placeholder when job_position object has empty name', () => {
    expect(
      employeeSubLabel(makeEmployee({ job_position: { id: 1, name: '' } })),
    ).toBe('Lavozim kiritilmagan');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// translateCategory + ORDER_CATEGORY_TRANSLATIONS
// ─────────────────────────────────────────────────────────────────────────────
describe('ORDER_CATEGORY_TRANSLATIONS', () => {
  // Post-i18n: the map holds translation-key paths (labels are resolved via
  // i18n.t() at call time in translateCategory). The category CODES (Record
  // keys) stay as backend contract identifiers; only labels are localized.
  it('has the expected fixed code → labelKey mapping', () => {
    expect(ORDER_CATEGORY_TRANSLATIONS).toEqual({
      vacation: 'status.categoryLeave',
      business_trip: 'status.categoryBusinessTrip',
      sick_leave: 'status.categorySickLeave',
    });
  });
});

describe('translateCategory', () => {
  it('returns default "Buyruq" for empty/undefined name', () => {
    expect(translateCategory()).toBe('Buyruq');
    expect(translateCategory('')).toBe('Buyruq');
    expect(translateCategory(undefined)).toBe('Buyruq');
  });

  it('translates known categories', () => {
    expect(translateCategory('vacation')).toBe("Mehnat ta'tili");
    expect(translateCategory('business_trip')).toBe('Xizmat safari');
    expect(translateCategory('sick_leave')).toBe('Kasallik varaqasi');
  });

  it('returns the raw name for unknown categories', () => {
    expect(translateCategory('promotion')).toBe('promotion');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The backend returns multi_org_employee_role as a string on some endpoints and
// as an array on others (types/index.ts: `string | string[]`). Both shapes must
// resolve identically — this is what the deleted authStore copies got wrong.
// ─────────────────────────────────────────────────────────────────────────────
describe('role helpers accept both the string and array role shapes', () => {
  it('resolves HR from a bare string role', () => {
    expect(isHR(multiOrgUser('hr'))).toBe(true);
  });

  it('resolves HR when the role arrives inside an array', () => {
    expect(isHR(multiOrgUser(['hr']))).toBe(true);
  });

  it('resolves HR when the array carries several roles', () => {
    expect(isHR(multiOrgUser(['chancellery', 'hr']))).toBe(true);
  });

  it('resolves ministr as master-admin from an array', () => {
    expect(isMasterAdmin(multiOrgUser(['ministr']))).toBe(true);
  });

  it('does not grant HR to an unrelated role', () => {
    expect(isHR(multiOrgUser(['kpp']))).toBe(false);
  });
});


// Web roleHelpers.hasSupervisor bilan 1:1. Bosh sahifa va "Ruxsat" ekrani
// shunga qarab "mening so'rovlarim" yoki "kiruvchi so'rovlar"ni ko'rsatadi.
describe('hasSupervisor', () => {
  it("ichma-ich obyekt YOKI faqat supervisor_id kelganda ham TRUE", () => {
    expect(hasSupervisor({ id: 1, type: 'employee', employee: { id: 5, legal_name: 'A', supervisor: { id: 9, legal_name: 'B' } } } as User)).toBe(true);
    // Payload yengillashtirilib nested obyekt olib tashlansa ham ishlashi shart.
    expect(hasSupervisor({ id: 1, type: 'employee', employee: { id: 5, legal_name: 'A', supervisor_id: 9 } } as User)).toBe(true);
  });

  it("rahbari yo'q xodimda va foydalanuvchisiz FALSE", () => {
    expect(hasSupervisor({ id: 1, type: 'employee', employee: { id: 5, legal_name: 'A' } } as User)).toBe(false);
    expect(hasSupervisor(null)).toBe(false);
    expect(hasSupervisor(undefined)).toBe(false);
  });
});

describe('canSeeLateness (v2 auth/roles.ts)', () => {
  const { canSeeLateness } = jest.requireActual('../roles');
  const emp = (role?: string, extra: Record<string, unknown> = {}) => ({
    type: 'employee',
    employee: role ? { id: 1, is_multi_org_user: true, multi_org_employee_role: role } : { id: 1 },
    ...extra,
  });
  it.each([
    ['master-admin', { type: 'master-admin' }, true],
    ['admin akkaunt', { type: 'admin' }, true],
    ['hr', emp('hr'), true],
    ['ministr', emp('ministr'), true],
    ['deputy', emp('deputy'), true],
    ['monitoring', emp('monitoring'), true],
    ['kuzatuvchi', emp('dashboard'), true],
    ['line manager', emp(undefined, { is_line_manager: true }), true],
    ['devonxona', emp('chancellery'), false],
    ['oddiy xodim', emp(), false],
  ])('%s', (_n, user, expected) => expect(canSeeLateness(user)).toBe(expected));
});

describe('canManageOrderTypes (v2 auth/canManage.ts)', () => {
  const { canManageOrderTypes } = jest.requireActual('../roles');
  const emp = (role?: string) => ({ type: 'employee', employee: role ? { id: 1, is_multi_org_user: true, multi_org_employee_role: role } : { id: 1 } });
  it.each([
    ['master-admin', { type: 'master-admin' }, true],
    ['admin akkaunt', { type: 'admin' }, true],
    ['hr', emp('hr'), true],
    ['ministr', emp('ministr'), true],
    ['deputy', emp('deputy'), false],
    ['oddiy xodim', emp(), false],
  ])('%s', (_n, user, expected) => expect(canManageOrderTypes(user)).toBe(expected));
});

describe('canManageStructure / canManageStaff (v2 auth/canManage + staff)', () => {
  const { canManageStructure, canManageStaff } = jest.requireActual('../roles');
  const emp = (role?: string) => ({ type: 'employee', employee: role ? { id: 1, is_multi_org_user: true, multi_org_employee_role: role } : { id: 1 } });
  it.each([
    ['master-admin', { type: 'master-admin' }, true, true],
    ['admin akkaunt', { type: 'admin' }, true, false],
    ['hr', emp('hr'), true, true],
    ['ministr', emp('ministr'), false, false],
    ['deputy', emp('deputy'), false, false],
    ['oddiy xodim', emp(), false, false],
  ])('%s', (_n, user, structure, staff) => {
    expect(canManageStructure(user)).toBe(structure);
    expect(canManageStaff(user)).toBe(staff);
  });
});

// Tabel sozlamalari — v2 `canAdministerBranch` / `canSwitchBranchScope` (server `assert_branch_admin`).

describe('canAdministerBranch / canSwitchBranchScope (v2 TabelSettingsPage)', () => {
  const asUser = (x: Record<string, unknown>) => x as unknown as User;
  const hrEmp = (extra: Record<string, unknown> = {}, branchId = 5) =>
    asUser({
      id: 1,
      type: 'employee',
      employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: ['hr'], department: { organization_branch_id: branchId } },
      ...extra,
    });
  const plainEmp = (extra: Record<string, unknown> = {}) => asUser({ id: 2, type: 'employee', employee: { id: 2 }, ...extra });

  it('master-admin, admin hisobi va ijro apparati kadri — har filialni', () => {
    expect(canAdministerBranch(asUser({ id: 9, type: 'master-admin' }), 7)).toBe(true);
    expect(canAdministerBranch(asUser({ id: 9, type: 'admin' }), 7)).toBe(true);
    expect(canAdministerBranch(hrEmp({ is_executive_hr: true }), 7)).toBe(true);
    // /me bayrog'i bo'lmasa — bosh filial a'zoligidan (v2 isExecutiveHR).
    expect(canAdministerBranch(hrEmp({}, 1), 7, { execBranchId: 1 })).toBe(true);
    expect(canAdministerBranch(hrEmp({}, 5), 7, { execBranchId: 1 })).toBe(false);
    // Server hukmi `false` — filiallardan qayta hisoblanmaydi.
    expect(canAdministerBranch(hrEmp({ is_executive_hr: false }, 1), 7, { execBranchId: 1 })).toBe(false);
  });

  it("ministr — yo'q (server 403); filial kadri — faqat o'z filiali", () => {
    const ministr = asUser({ id: 3, type: 'employee', employee: { id: 3, is_multi_org_user: true, multi_org_employee_role: 'ministr' } });
    expect(canAdministerBranch(ministr, 5)).toBe(false);
    expect(canAdministerBranch(hrEmp(), 5)).toBe(true);
    expect(canAdministerBranch(hrEmp(), 6)).toBe(false);
    expect(canAdministerBranch(null, 5)).toBe(false);
    expect(canAdministerBranch(asUser({ id: 9, type: 'master-admin' }), null)).toBe(false);
  });

  it('filial rahbari — o‘z filiali; rahbarlar ro‘yxati faqat direktor / AKT', () => {
    for (const k of [
      'director_branch_ids',
      'akt_branch_ids',
      'hr_branch_ids',
      'deputy_branch_ids',
      'accounting_branch_ids',
      'legal_branch_ids',
      'chancellery_branch_ids',
      'nurse_branch_ids',
      'transport_branch_ids',
      'transport_approver_branch_ids',
    ]) {
      expect({ k, ok: canAdministerBranch(plainEmp({ [k]: [5] }), 5) }).toEqual({ k, ok: true });
      expect({ k, ok: canAdministerBranch(plainEmp({ [k]: [5] }), 6) }).toEqual({ k, ok: false });
      const leaders = k === 'director_branch_ids' || k === 'akt_branch_ids';
      expect({ k, ok: canAdministerBranch(plainEmp({ [k]: [5] }), 5, { leadersOnly: true }) }).toEqual({ k, ok: leaders });
    }
    expect(canAdministerBranch(plainEmp(), 5)).toBe(false);
  });

  it('«Barcha filiallar» doirasi: bosh admin (ministr ham), o‘rinbosar, ijro apparati kadri', () => {
    const ministr = asUser({ id: 3, type: 'employee', employee: { id: 3, is_multi_org_user: true, multi_org_employee_role: 'ministr' } });
    const deputy = asUser({ id: 4, type: 'employee', employee: { id: 4, is_multi_org_user: true, multi_org_employee_role: 'deputy' } });
    expect(canSwitchBranchScope(asUser({ id: 9, type: 'master-admin' }), null)).toBe(true);
    expect(canSwitchBranchScope(ministr, null)).toBe(true);
    expect(canSwitchBranchScope(deputy, null)).toBe(true);
    expect(canSwitchBranchScope(hrEmp({}, 1), 1)).toBe(true);
    expect(canSwitchBranchScope(hrEmp({}, 5), 1)).toBe(false);
    expect(canSwitchBranchScope(plainEmp(), 1)).toBe(false);
  });
});

// v2 `getDisplayName` (employee.legal_name || username) — mobil admin / kiosk yozuvidagi ismni ham
// o'qiydi: real QA'da master profili «Foydalanuvchi», admin profili `admin.legal_name` ni e'tiborsiz qoldirardi.
describe('userDisplayName', () => {
  it('xodim — legal_name', () => {
    expect(userDisplayName({ id: 1, type: 'employee', username: 'ali', employee: { id: 2, legal_name: 'Aliyev Vali' } })).toBe('Aliyev Vali');
  });

  it("admin — admin.legal_name, bo'lmasa login", () => {
    const admin = { id: 2, type: 'admin', username: 'admin.fil', employee: null, admin: { legal_name: 'Filial Admin', email: 'a@x.uz' } } as User;
    expect(userDisplayName(admin)).toBe('Filial Admin');
    expect(userDisplayName({ ...admin, admin: { legal_name: null, email: 'a@x.uz' } })).toBe('admin.fil');
  });

  it("kiosk — multi_modal_user.legal_name; master — login, bo'lmasa e-pochta", () => {
    expect(
      userDisplayName({ id: 3, type: 'kpp', username: 'qa.kpp', employee: null, multi_modal_user: { legal_name: 'QA KPP Post' } } as User),
    ).toBe('QA KPP Post');
    expect(userDisplayName({ id: 4, type: 'master-admin', username: 'master', employee: null } as User)).toBe('master');
    expect(userDisplayName({ id: 4, type: 'master-admin', employee: null, master_admin: { email: 'm@x.uz' } } as User)).toBe('m@x.uz');
  });

  it("hech narsa yo'q — null (chaqiruvchi t('...userFallback') ni ko'rsatadi)", () => {
    expect(userDisplayName({ id: 5, type: 'guest' })).toBeNull();
    expect(userDisplayName(null)).toBeNull();
  });
});
