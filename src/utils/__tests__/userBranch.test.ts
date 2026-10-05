import type { User } from '../../types';
import {
  defaultGlobalBranchId,
  hasGlobalBranchScope,
  needsBranchPicker,
  primaryBranchId,
  userBranchIds,
} from '../userBranch';

// ⚠️ REAL `/auth/me` shakllari (TEST bazasi, 2026-10-05, `qa.*` hisoblari; ortiqcha bayroqlar qisqartirilgan).
// Avvalgi testlar to'qima `organization_branch_id: 3` bilan o'tardi — bunday maydon serverda YO'Q.
const flags = {
  admin: null,
  master_admin: null,
  multi_modal_user: null,
  headed_department_ids: [],
  hr_branch_ids: [],
  akt_branch_ids: [],
  nurse_branch_ids: [],
  kpi_enabled: false,
  is_line_manager: false,
};

const monitoringKiosk = {
  ...flags,
  id: 931117,
  username: 'qa.monitoring',
  type: 'monitoring',
  employee: null,
  multi_modal_user: {
    id: 552,
    role: 'monitoring',
    user_id: 931117,
    username: 'qa.monitoring',
    organization_branch_ids: [1],
    legal_name: 'QA MONITORING Post',
  },
} as unknown as User;

const kppKiosk = {
  ...flags,
  id: 931116,
  username: 'qa.kpp',
  type: 'kpp',
  employee: null,
  multi_modal_user: {
    id: 551,
    role: 'kpp',
    username: 'qa.kpp',
    organization_branch_ids: [1],
    legal_name: 'QA KPP Post',
  },
} as unknown as User;

const twoBranchKiosk = {
  ...monitoringKiosk,
  multi_modal_user: { ...monitoringKiosk.multi_modal_user, organization_branch_ids: [7, 3] },
} as unknown as User;

const guest = { ...flags, id: 931118, username: 'qa.guest', type: 'guest', employee: null } as unknown as User;

const nurse = {
  ...flags,
  id: 931112,
  username: 'qa.nurse',
  type: 'employee',
  nurse_branch_ids: [1],
  employee: {
    id: 898180,
    legal_name: 'QA Hamshira Testov',
    primary_organization_branch_id: 1,
    is_multi_org_user: false,
    multi_org_employee_role: null,
    department: { id: 10, name: "Tibbiy bo'lim", organization_branch_id: 1 },
    organization_branches: [],
  },
} as unknown as User;

// Rahbariyat: asosiy filial 1, M2M ro'yxati tartibsiz (22 birinchi) — `branch.ts` izohidagi holat.
const leader = {
  ...flags,
  id: 5,
  type: 'employee',
  employee: {
    id: 50,
    legal_name: 'Rais',
    primary_organization_branch_id: null,
    department: { id: 1, name: 'Rahbariyat', organization_branch_id: 1 },
    organization_branches: [
      { id: 22, name: "O'zsuvloyiha" },
      { id: 1, name: 'Ijro apparati' },
    ],
  },
} as unknown as User;

// `AdminRead` (schemas/admin.py) — filialga bog'langan va bog'lanmagan admin.
const branchAdmin = {
  ...flags,
  id: 2,
  username: 'admin.fil',
  type: 'admin',
  employee: null,
  admin: { id: 3, email: 'admin@x.uz', legal_name: 'Filial Admin', organization_branch_id: 4 },
} as unknown as User;
const globalAdmin = {
  ...branchAdmin,
  admin: { id: 4, email: 'g@x.uz', legal_name: 'Global Admin', organization_branch_id: null },
} as unknown as User;

// `MasterAdminRead` — xodim kartasi yo'q.
const master = {
  ...flags,
  id: 1,
  username: 'master',
  type: 'master-admin',
  employee: null,
  master_admin: { id: 1, email: 'master@x.uz' },
  kpi_enabled: true,
} as unknown as User;

describe('userBranchIds / primaryBranchId', () => {
  it('monitoring kiosk: filial `multi_modal_user.organization_branch_ids` dan (employee null)', () => {
    expect(userBranchIds(monitoringKiosk)).toEqual([1]);
    expect(primaryBranchId(monitoringKiosk)).toBe(1);
  });

  it('kpp kiosk: xuddi shunday', () => {
    expect(userBranchIds(kppKiosk)).toEqual([1]);
    expect(primaryBranchId(kppKiosk)).toBe(1);
  });

  it("ko'p filialli kiosk: hammasi, birinchisi asosiy", () => {
    expect(userBranchIds(twoBranchKiosk)).toEqual([7, 3]);
    expect(primaryBranchId(twoBranchKiosk)).toBe(7);
  });

  it("xodim: asosiy filial birinchi, keyin bo'lim filiali va M2M (takrorsiz)", () => {
    expect(userBranchIds(nurse)).toEqual([1]);
    expect(primaryBranchId(nurse)).toBe(1);
    // M2M birinchisi (22) emas — bo'lim filiali (1) asosiy.
    expect(primaryBranchId(leader)).toBe(1);
    expect(userBranchIds(leader)).toEqual([1, 22]);
  });

  it('admin: `admin.organization_branch_id`; filialsiz admin — hech qaysi', () => {
    expect(userBranchIds(branchAdmin)).toEqual([4]);
    expect(primaryBranchId(branchAdmin)).toBe(4);
    expect(userBranchIds(globalAdmin)).toEqual([]);
    expect(primaryBranchId(globalAdmin)).toBeUndefined();
  });

  it("master-admin: o'z filiali yo'q — tanlagich", () => {
    expect(userBranchIds(master)).toEqual([]);
    expect(primaryBranchId(master)).toBeUndefined();
  });

  it('mehmon va foydalanuvchisiz — hech qaysi', () => {
    expect(userBranchIds(guest)).toEqual([]);
    expect(primaryBranchId(null)).toBeUndefined();
    expect(userBranchIds(undefined)).toEqual([]);
  });
});

describe('hasGlobalBranchScope / needsBranchPicker (v2 visibleBranches + BranchSelector.isStatic)', () => {
  it('master-admin va ministr — global, tanlagich bor', () => {
    const ministr = {
      ...leader,
      employee: { ...leader.employee!, is_multi_org_user: true, multi_org_employee_role: 'ministr' },
    } as User;
    expect(hasGlobalBranchScope(master)).toBe(true);
    expect(hasGlobalBranchScope(ministr)).toBe(true);
    expect(needsBranchPicker(master)).toBe(true);
  });

  it("bitta filialli hisob — tanlagich yo'q; bir nechta — bor", () => {
    expect(needsBranchPicker(monitoringKiosk)).toBe(false);
    expect(needsBranchPicker(branchAdmin)).toBe(false);
    expect(needsBranchPicker(nurse)).toBe(false);
    expect(needsBranchPicker(twoBranchKiosk)).toBe(true);
    expect(hasGlobalBranchScope(branchAdmin)).toBe(false);
    expect(hasGlobalBranchScope(monitoringKiosk)).toBe(false);
  });
});

describe('defaultGlobalBranchId (v2 useBranchInit — bosh filial)', () => {
  it('`is_head_office` belgisi birinchi, keyin nom, oxiri — 1', () => {
    expect(
      defaultGlobalBranchId([
        { id: 5, name: 'A' },
        { id: 9, name: 'B', is_head_office: true },
      ]),
    ).toBe(9);
    expect(
      defaultGlobalBranchId([
        { id: 5, name: 'Filial' },
        { id: 12, name: '«O‘zbekgidroenergo» AJ' },
      ]),
    ).toBe(12);
    expect(defaultGlobalBranchId([])).toBe(1);
    expect(defaultGlobalBranchId(undefined)).toBe(1);
  });
});
