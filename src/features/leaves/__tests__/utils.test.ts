import dayjs from 'dayjs';
import type { WorkLeave, Employee, User } from '@/types';
import {
  canActOnLeave, canDeleteLeave, canReopenLeave, isLeaveDecider, leaveMinute, defaultLeaveRange,
} from '../utils';

jest.mock('@/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const ME = 100;
const DEPUTY_ID = 200;
const REQUESTER = 300;
const MY_DEPT = 7;

function emp(id: number, role?: string | string[]): Employee {
  return {
    id,
    legal_name: `Emp ${id}`,
    ...(role !== undefined
      ? { is_multi_org_user: true, multi_org_employee_role: role }
      : {}),
  } as Employee;
}

/** The requester as `EmployeeSafeRead` returns it (flat supervisor_id / department_id). */
function requester(extra: { supervisor_id?: number; department_id?: number } = {}): Employee {
  return { ...emp(REQUESTER), ...extra } as Employee;
}

function user(extra: Partial<User> = {}, role?: string): User {
  return { id: 1, type: 'employee', employee: emp(ME, role), ...extra } as User;
}
const plain = user();
const hr = user({}, 'hr');
const deptHead = user({ headed_department_ids: [MY_DEPT] });
const siteMaster = { id: 9, type: 'master-admin', employee: emp(ME) } as User;

function leave(overrides: Partial<WorkLeave> = {}): WorkLeave {
  return {
    id: 1,
    type: "Xizmat topshirig'i",
    start_date: '2026-07-15T09:00:00Z',
    end_date: '2026-07-15T18:00:00Z',
    status: 'pending',
    employee_id: REQUESTER,
    ...overrides,
  };
}

const NONE = { canSign: false, canReject: false };
const BOTH = { canSign: true, canReject: true };

describe('canActOnLeave (web v2 RequestPermissionPage.canActOn)', () => {
  it('nothing without a leave or an employee card', () => {
    expect(canActOnLeave(undefined, plain)).toEqual(NONE);
    expect(canActOnLeave(leave(), { id: 2, type: 'admin' } as User)).toEqual(NONE);
    expect(canActOnLeave(leave(), null)).toEqual(NONE);
  });

  // QA 2026-10-05 (CRITICAL): the server routes a request filed without signers
  // to the requester's supervisor and returns `assigned_signers: []` — the
  // supervisor had no Tasdiqlash / Rad etish.
  it('no signer named → the requester\'s direct supervisor acts', () => {
    const l = leave({ assigned_signers: [], employee: requester({ supervisor_id: ME }) });
    expect(canActOnLeave(l, plain)).toEqual(BOTH);
  });

  it('no signer named, someone else supervises → not mine even as a department head', () => {
    const l = leave({ assigned_signers: [], employee: requester({ supervisor_id: 555, department_id: MY_DEPT }) });
    expect(canActOnLeave(l, plain)).toEqual(NONE);
    expect(canActOnLeave(l, deptHead)).toEqual(NONE);
  });

  it('no signer and no supervisor → a head of the requester\'s department acts', () => {
    const l = leave({ assigned_signers: [], employee: requester({ department_id: MY_DEPT }) });
    expect(canActOnLeave(l, deptHead)).toEqual(BOTH);
    expect(canActOnLeave(l, plain)).toEqual(NONE);
    // department read from the nested object as well
    const nested = leave({ assigned_signers: [], employee: { ...emp(REQUESTER), department: { id: MY_DEPT, name: 'IT' } } });
    expect(canActOnLeave(nested, deptHead)).toEqual(BOTH);
  });

  it('no signer named → HR / master-admin (privileged managers) may settle it', () => {
    const l = leave({ assigned_signers: [], employee: requester({ supervisor_id: 555 }) });
    expect(canActOnLeave(l, hr)).toEqual(BOTH);
    expect(canActOnLeave(l, siteMaster)).toEqual(BOTH);
  });

  it('signers named → only an assigned signer who has not signed yet (HR included)', () => {
    expect(canActOnLeave(leave({ assigned_signers: [emp(ME)] }), plain)).toEqual(BOTH);
    expect(canActOnLeave(leave({ assigned_signers: [emp(ME)], signers: [emp(ME)] }), plain)).toEqual(NONE);
    expect(canActOnLeave(leave({ assigned_signers: [emp(999)] }), plain)).toEqual(NONE);
    // a privileged manager does NOT jump a named signer list (v2 canActOn)
    expect(canActOnLeave(leave({ assigned_signers: [emp(999)] }), hr)).toEqual(NONE);
    expect(canActOnLeave(leave({ assigned_signers: [emp(ME, 'hr')] }), hr)).toEqual(BOTH);
  });

  it('never one\'s own request', () => {
    const own = leave({ employee_id: ME, assigned_signers: [], employee: { ...emp(ME), supervisor_id: ME } as Employee });
    expect(canActOnLeave(own, hr)).toEqual(NONE);
    expect(canActOnLeave(leave({ employee_id: ME, assigned_signers: [emp(ME)] }), plain)).toEqual(NONE);
  });

  it('only while pending (yuborildi alias too; unknown status stays inert)', () => {
    const base = { assigned_signers: [emp(ME)] };
    expect(canActOnLeave(leave({ ...base, status: 'yuborildi' }), plain)).toEqual(BOTH);
    for (const status of ['approved', 'signed', 'tasdiqlangan', 'rejected', 'rad_etilgan', 'weird']) {
      expect(canActOnLeave(leave({ ...base, status }), plain)).toEqual(NONE);
    }
  });

  it('a deputy assigned signer can act on a pending request', () => {
    const deputy = { id: 3, type: 'employee', employee: emp(DEPUTY_ID, 'deputy') } as User;
    expect(canActOnLeave(leave({ assigned_signers: [emp(DEPUTY_ID, 'deputy')] }), deputy)).toEqual(BOTH);
  });
});

describe('isLeaveDecider / canReopenLeave (web v2 isDecider / canReopen)', () => {
  const routedToMe = { assigned_signers: [], employee: requester({ supervisor_id: ME }) };

  it('the supervisor of a decided, signer-less request may reopen it', () => {
    expect(canReopenLeave(leave({ ...routedToMe, status: 'signed' }), plain)).toBe(true);
    expect(canReopenLeave(leave({ ...routedToMe, status: 'rejected' }), plain)).toBe(true);
    expect(canReopenLeave(leave({ ...routedToMe, status: 'tasdiqlangan' }), plain)).toBe(true);
  });

  it('not while pending, not a KADR order, not one\'s own, not a stranger', () => {
    expect(canReopenLeave(leave({ ...routedToMe, status: 'pending' }), plain)).toBe(false);
    expect(canReopenLeave(leave({ ...routedToMe, status: 'signed', is_hr_order: true }), plain)).toBe(false);
    expect(canReopenLeave(leave({ employee_id: ME, assigned_signers: [emp(ME)], status: 'signed' }), plain)).toBe(false);
    expect(canReopenLeave(leave({ assigned_signers: [emp(999)], status: 'signed' }), plain)).toBe(false);
    expect(canReopenLeave(undefined, plain)).toBe(false);
  });

  it('named signers: an assigned signer — or a privileged manager — is a decider', () => {
    const named = leave({ assigned_signers: [emp(999)], status: 'rejected' });
    expect(isLeaveDecider(named, plain)).toBe(false);
    expect(isLeaveDecider(named, hr)).toBe(true);
    expect(canReopenLeave(named, hr)).toBe(true);
    expect(canReopenLeave(leave({ assigned_signers: [emp(ME)], status: 'signed' }), plain)).toBe(true);
  });
});

describe('leave timestamps on the whole minute (QA: 20:00:00.073)', () => {
  it('leaveMinute zeroes seconds AND milliseconds', () => {
    const d = leaveMinute(dayjs('2026-10-05T20:00:41.073'));
    expect(d.second()).toBe(0);
    expect(d.millisecond()).toBe(0);
    expect(d.format('HH:mm')).toBe('20:00');
  });

  it('defaultLeaveRange: top of the current hour → +1 hour, no stray milliseconds', () => {
    const { start, end } = defaultLeaveRange(dayjs('2026-10-05T19:37:12.073'));
    expect(start.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-10-05 19:00:00.000');
    expect(end.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-10-05 20:00:00.000');
    expect(start.toISOString()).toMatch(/:00\.000Z$/);
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
