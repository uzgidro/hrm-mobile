import type { WorkLeave, Employee } from '@/types';
import { canActOnLeave, canDeleteLeave, supervisorOptions } from '../utils';

jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

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

describe('canDeleteLeave', () => {
  it('false for undefined leave or missing employeeId', () => {
    expect(canDeleteLeave(undefined, ME)).toBe(false);
    expect(canDeleteLeave(leave({ employee_id: ME }), undefined)).toBe(false);
  });

  it('own pending request with no signers is deletable', () => {
    expect(canDeleteLeave(leave({ employee_id: ME, status: 'pending' }), ME)).toBe(true);
    // ownership can also come from the nested employee object
    expect(canDeleteLeave(leave({ employee: emp(ME), status: 'pending' }), ME)).toBe(true);
  });

  it('NOT deletable when the request belongs to someone else', () => {
    // The mobile parity guard: web only shows delete on the "my" tab.
    expect(canDeleteLeave(leave({ employee_id: 999, status: 'pending' }), ME)).toBe(false);
    expect(canDeleteLeave(leave({ employee: emp(999), status: 'pending' }), ME)).toBe(false);
  });

  it('NOT deletable once finalized (approved/signed/rejected)', () => {
    for (const status of ['approved', 'tasdiqlangan', 'signed', 'rejected', 'rad_etilgan']) {
      expect(canDeleteLeave(leave({ employee_id: ME, status }), ME)).toBe(false);
    }
  });

  it('with assigned signers: deletable only while none has signed', () => {
    const notSigned = leave({ employee_id: ME, status: 'pending', assigned_signers: [emp(DEPUTY_ID)], signers: [] });
    expect(canDeleteLeave(notSigned, ME)).toBe(true);

    const oneSigned = leave({ employee_id: ME, status: 'pending', assigned_signers: [emp(DEPUTY_ID)], signers: [emp(DEPUTY_ID)] });
    expect(canDeleteLeave(oneSigned, ME)).toBe(false);
  });

  it('without assigned signers: deletable only while there are no signers', () => {
    const noSigners = leave({ employee_id: ME, status: 'pending', assigned_signers: [], signers: [] });
    expect(canDeleteLeave(noSigners, ME)).toBe(true);

    const someSigner = leave({ employee_id: ME, status: 'pending', assigned_signers: [], signers: [emp(500)] });
    expect(canDeleteLeave(someSigner, ME)).toBe(false);
  });
});

describe('supervisorOptions', () => {
  it('returns [] for undefined employees', () => {
    expect(supervisorOptions(undefined, ME)).toEqual([]);
  });

  it('maps employees to picker options and excludes self', () => {
    const roster = [emp(ME), emp(200), emp(300)];
    const opts = supervisorOptions(roster, ME);
    expect(opts.map((o) => o.value)).toEqual([200, 300]);
    expect(opts[0]).toMatchObject({ value: 200, label: 'Emp 200' });
  });

  it('keeps everyone when self id is undefined', () => {
    const roster = [emp(200), emp(300)];
    expect(supervisorOptions(roster, undefined).map((o) => o.value)).toEqual([200, 300]);
  });
});
