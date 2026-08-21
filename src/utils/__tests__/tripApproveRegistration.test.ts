import type { Letter, User } from '../../types';
import { canApproveTripRegistration } from '../tripStatus';
import { canApproveTripForBranch, isTripApprover, isBranchTripApprover } from '../roles';

// DEVONXONA ro'yxatga olgach RAHBAR tasdig'i (registered_pending_rahbar →
// management_approved). Backend bu amal uchun `available_actions` bayrog'i
// BERMAYDI, shu bois qoida web (roleHelpers.canApproveTripForBranch +
// isAssignedTripManagementSigner) bilan 1:1 mijozda takrorlanadi. Mobilda bu
// tugma umuman yo'q edi — rahbar safarni telefondan tasdiqlay olmasdi.

const deputy = (position: string, branches: Partial<User> = {}): User => ({
  id: 1,
  type: 'employee',
  employee: {
    id: 10,
    legal_name: "O'rinbosar",
    is_multi_org_user: true,
    multi_org_employee_role: 'deputy',
    job_position: { id: 1, name: position },
  },
  ...branches,
} as User);

const trip = (over: Partial<Letter> = {}): Letter => ({
  id: 7,
  letter_type: 'business_trip',
  status: 'registered_pending_rahbar',
  organization_branch_id: 1,
  ...over,
} as Letter);

describe('isTripApprover (asosiy filial qoidasi)', () => {
  it("FAQAT \"Boshqaruv raisi o'rinbosari\" — \"Birinchi o'rinbosari\" kirmaydi", () => {
    expect(isTripApprover(deputy("Boshqaruv raisi o'rinbosari"))).toBe(true);
    expect(isTripApprover(deputy("Boshqaruv raisi birinchi o'rinbosari"))).toBe(false);
    expect(isTripApprover(deputy('Bosh mutaxassis'))).toBe(false);
  });
});

describe('canApproveTripForBranch', () => {
  it('asosiy filial (1) — lavozim bo\'yicha; boshqa filial — biriktirilgan rahbar', () => {
    const main = deputy("Boshqaruv raisi o'rinbosari");
    expect(canApproveTripForBranch(main, 1)).toBe(true);
    expect(canApproveTripForBranch(main, 9)).toBe(false);

    const branchLeader = deputy('Direktor', { director_branch_ids: [9] } as Partial<User>);
    expect(isBranchTripApprover(branchLeader, 9)).toBe(true);
    expect(canApproveTripForBranch(branchLeader, 9)).toBe(true);
    expect(canApproveTripForBranch(branchLeader, 12)).toBe(false);
  });

  it('master-admin har qanday filialda tasdiqlay oladi', () => {
    expect(canApproveTripForBranch({ id: 2, type: 'master-admin' } as User, 12)).toBe(true);
  });
});

describe('canApproveTripRegistration', () => {
  const approver = deputy("Boshqaruv raisi o'rinbosari");

  it('faqat registered_pending_rahbar statusida', () => {
    expect(canApproveTripRegistration(trip(), approver, 10)).toBe(true);
    expect(canApproveTripRegistration(trip({ status: 'management_approved' }), approver, 10)).toBe(false);
    expect(canApproveTripRegistration(trip({ status: 'pending_registration' }), approver, 10)).toBe(false);
  });

  it('xodim TANLAGAN rahbariyat imzolovchisiga ham ko\'rinadi (rol bo\'lmasa ham)', () => {
    const plain = { id: 3, type: 'employee', employee: { id: 55, legal_name: 'X' } } as User;
    const l = trip({
      organization_branch_id: 9,
      assigned_signers: [{ employee_id: 55, signer_type: 'management' }],
    });
    expect(canApproveTripRegistration(l, plain, 55)).toBe(true);
    // Begona xodim — yo'q.
    expect(canApproveTripRegistration(l, plain, 56)).toBe(false);
  });

  it('bildirgi/arizada hech qachon', () => {
    expect(canApproveTripRegistration(
      trip({ letter_type: 'application' }), approver, 10)).toBe(false);
  });
});
