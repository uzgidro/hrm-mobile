import type { User, Employee } from '../../types';
import {
  getMultiOrgRoles,
  getMultiOrgRole,
  hasMultiOrgRole,
  isMasterAdmin,
  isEmployee,
  isEmployeeLike,
  isAccounting,
  isDashboardViewer,
  isHR,
  isSingleRoleHR,
  isDeputy,
  isLeadership,
  isKPP,
  isChancellery,
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
  'employees', 'attendance', 'requests', 'documents',
  'salary', 'team', 'birthdays', 'news', 'notifications', 'profile',
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
// isSingleRoleHR
// ─────────────────────────────────────────────────────────────────────────────
describe('isSingleRoleHR', () => {
  it('true only when the sole role is hr', () => {
    expect(isSingleRoleHR(hrSingleUser)).toBe(true);
  });

  it('false when hr is combined with other roles', () => {
    expect(isSingleRoleHR(hrMultiUser)).toBe(false);
  });

  it('false for non-hr and empty', () => {
    expect(isSingleRoleHR(kppUser)).toBe(false);
    expect(isSingleRoleHR(regularUser)).toBe(false);
    expect(isSingleRoleHR(null)).toBe(false);
  });

  it('true when hr passed as a single-element array', () => {
    expect(isSingleRoleHR(multiOrgUser(['hr']))).toBe(true);
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

  it('false otherwise', () => {
    expect(canAccessChairmanTasks(regularUser)).toBe(false);
    expect(canAccessChairmanTasks(hrSingleUser)).toBe(false);
    expect(canAccessChairmanTasks(masterAdminUser)).toBe(false);
    expect(canAccessChairmanTasks(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canAccessPage — the truth table
// ─────────────────────────────────────────────────────────────────────────────
describe('canAccessPage', () => {
  // Expected boolean per page, derived by reading the code logic.
  type Row = Record<PageKey, boolean>;

  const expected: Record<string, { user: User | null | undefined; row: Row }> = {
    regular: {
      user: regularUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    hrSingle: {
      user: hrSingleUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: false,
        employees: true, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    hrMulti: {
      user: hrMultiUser, // ['hr','deputy']
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: true, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    kpp: {
      user: kppUser,
      row: {
        home: true, orders: false, letters: false, guests: true, projects: false,
        employees: false, attendance: false, requests: false, documents: false,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    chancellery: {
      user: chancelleryUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: false, requests: false, documents: false,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    kanselariya: {
      user: kanselariyaUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: false, requests: false, documents: false,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    ministr: {
      user: ministrUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: true, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    deputy: {
      user: deputyUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: true, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    accounting: {
      // Buxgalter = employee-like: sees the full regular-employee surface,
      // NOT the employees directory. Same row as `regular` (web parity).
      user: accountingUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    dashboard: {
      // Kuzatuvchi (dashboard) = employee-like: same regular-employee surface,
      // NOT the employees directory. Same row as `regular` (web parity).
      user: dashboardUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    masterAdmin: {
      user: masterAdminUser,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: true, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    secretariat: {
      user: secretariatUser, // is_secretariat does NOT affect page access
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    nullUser: {
      user: null,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
    undefinedUser: {
      user: undefined,
      row: {
        home: true, orders: true, letters: true, guests: true, projects: true,
        employees: false, attendance: true, requests: true, documents: true,
        salary: true, team: true, birthdays: true, news: true, notifications: true, profile: true,
      },
    },
  };

  Object.entries(expected).forEach(([label, { user, row }]) => {
    describe(label, () => {
      ALL_PAGES.forEach((page) => {
        it(`${page} => ${row[page]}`, () => {
          expect(canAccessPage(user, page)).toBe(row[page]);
        });
      });
    });
  });

  it('unknown page keys fall through to the default (true)', () => {
    expect(canAccessPage(kppUser, 'nonexistent' as PageKey)).toBe(true);
  });

  it('kpp passed as array still blocks documents/attendance', () => {
    const u = multiOrgUser(['kpp']);
    expect(canAccessPage(u, 'orders')).toBe(false);
    expect(canAccessPage(u, 'letters')).toBe(false);
    expect(canAccessPage(u, 'attendance')).toBe(false);
    expect(canAccessPage(u, 'requests')).toBe(false);
    expect(canAccessPage(u, 'projects')).toBe(false);
    expect(canAccessPage(u, 'documents')).toBe(false);
  });

  it('kanselariya spelling blocks attendance/requests/documents like chancellery', () => {
    expect(canAccessPage(kanselariyaUser, 'attendance')).toBe(false);
    expect(canAccessPage(kanselariyaUser, 'requests')).toBe(false);
    expect(canAccessPage(kanselariyaUser, 'documents')).toBe(false);
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
