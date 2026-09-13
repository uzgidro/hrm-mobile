// Buyruqni QO'LLASH huquqi (backend `decree_apply` bilan 1:1).
//
// Mobilda bu qadam umuman yo'q edi: buyruq `confirmed` da tiqilib qolar,
// ta'til/ko'chirish yozuvi yaratilmasdi. TEST serverda o'lchandi (2026-08-26):
// confirmed -> apply -> applied.
import { decreePermissions } from '../orderStatus';
import type { OrderAct } from '@/types';

const BRANCH = 1;

function order(status: string): OrderAct {
  return {
    id: 1,
    status,
    organization_branch_id: BRANCH,
    category_rel: { id: 5, name: 'Ta\'til', creator_role: 'employee' },
    assigned_signers: [],
    familiarizers: [],
  } as unknown as OrderAct;
}

const hr = {
  type: 'employee',
  employee: {
    id: 10,
    is_multi_org_user: true,
    multi_org_employee_role: 'hr',
    department: { id: 2, name: 'Kadrlar', organization_branch_id: BRANCH },
    organization_branches: [{ id: BRANCH, name: 'Bosh' }],
  },
} as never;

const plain = {
  type: 'employee',
  employee: { id: 11, department: { id: 3, name: 'Bo\'lim', organization_branch_id: BRANCH } },
} as never;

describe('decreePermissions.canApply', () => {
  it('KADR `confirmed` holatda qo‘llay oladi', () => {
    expect(decreePermissions(order('confirmed'), 10, hr).canApply).toBe(true);
  });

  it('oddiy xodim qo‘llay OLMAYDI (backend 403 beradi)', () => {
    expect(decreePermissions(order('confirmed'), 11, plain).canApply).toBe(false);
  });

  it.each(['draft', 'pending_approval', 'pending_leadership', 'pending_chancellery', 'applied'])(
    '`%s` holatida tugma chiqmaydi',
    (status) => {
      expect(decreePermissions(order(status), 10, hr).canApply).toBe(false);
    },
  );

  it('boshqa filial KADRi qo‘llay OLMAYDI (cross-branch)', () => {
    const otherBranchHr = {
      type: 'employee',
      employee: {
        id: 12,
        is_multi_org_user: true,
        multi_org_employee_role: 'hr',
        department: { id: 9, name: 'Kadrlar', organization_branch_id: 99 },
        organization_branches: [{ id: 99, name: 'Boshqa filial' }],
      },
    } as never;
    expect(decreePermissions(order('confirmed'), 12, otherBranchHr).canApply).toBe(false);
  });
});
