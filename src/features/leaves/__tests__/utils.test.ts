import type { WorkLeave, Employee } from '@/types';
import { canActOnLeave } from '../utils';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const ME = 100;
const DEPUTY_ID = 200;

function emp(id: number, role?: string | string[]): Employee {
  return {
    id,
    legal_name: `Emp ${id}`,
    ...(role !== undefined
      ? { is_multi_org_user: true, multi_org_employee_role: role }
      : {}),
  } as Employee;
}

function leave(overrides: Partial<WorkLeave> = {}): WorkLeave {
  return {
    id: 1,
    type: "Xizmat topshirig'i",
    start_date: '2026-07-15T09:00:00Z',
    end_date: '2026-07-15T18:00:00Z',
    status: 'pending',
    ...overrides,
  };
}

describe('canActOnLeave', () => {
  it('returns all-false for undefined leave or missing employeeId', () => {
    expect(canActOnLeave(undefined, ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
    expect(canActOnLeave(leave(), undefined, { isHR: false })).toEqual({ canSign: false, canReject: false });
  });

  it('HR is view-only — never signs or rejects, even when assigned & pending', () => {
    // The gap this fix closes: mobile previously let any assigned signer act.
    const l = leave({ assigned_signers: [emp(ME, 'hr')], status: 'pending' });
    expect(canActOnLeave(l, ME, { isHR: true })).toEqual({ canSign: false, canReject: false });
  });

  it('assigned signer on a pending request can sign AND reject', () => {
    const l = leave({ assigned_signers: [emp(ME)], status: 'pending' });
    expect(canActOnLeave(l, ME, { isHR: false })).toEqual({ canSign: true, canReject: true });
  });

  it('recognizes the yuborildi pending alias', () => {
    const l = leave({ assigned_signers: [emp(ME)], status: 'yuborildi' });
    expect(canActOnLeave(l, ME, { isHR: false })).toEqual({ canSign: true, canReject: true });
  });

  it('cannot act once the current user has already signed', () => {
    const l = leave({ assigned_signers: [emp(ME)], signers: [emp(ME)], status: 'pending' });
    expect(canActOnLeave(l, ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
  });

  it('no actions on a rejected request', () => {
    const l = leave({ assigned_signers: [emp(ME)], status: 'rejected' });
    expect(canActOnLeave(l, ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
    const l2 = leave({ assigned_signers: [emp(ME)], status: 'rad_etilgan' });
    expect(canActOnLeave(l2, ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
  });

  it('no actions on an approved request (not pending)', () => {
    const l = leave({ assigned_signers: [emp(ME)], status: 'approved' });
    expect(canActOnLeave(l, ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
  });

  it('a non-assigned employee cannot act', () => {
    const l = leave({ assigned_signers: [emp(999)], status: 'pending' });
    expect(canActOnLeave(l, ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
  });

  it('handles missing assigned_signers / signers arrays', () => {
    expect(canActOnLeave(leave({ status: 'pending' }), ME, { isHR: false })).toEqual({ canSign: false, canReject: false });
  });

  it('a deputy assigned signer can act on a pending request', () => {
    const l = leave({ assigned_signers: [emp(DEPUTY_ID, 'deputy')], status: 'pending' });
    expect(canActOnLeave(l, DEPUTY_ID, { isHR: false })).toEqual({ canSign: true, canReject: true });
  });
});
