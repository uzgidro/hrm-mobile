import { leaveStatusGroup, leaveStatusKind } from '../leaveStatus';

describe('leaveStatusGroup', () => {
  it('groups the English and legacy Uzbek pending codes', () => {
    expect(leaveStatusGroup('pending')).toBe('pending');
    expect(leaveStatusGroup('yuborildi')).toBe('pending');
  });

  it('groups approved codes, including signed and the legacy Uzbek form', () => {
    expect(leaveStatusGroup('approved')).toBe('approved');
    expect(leaveStatusGroup('signed')).toBe('approved');
    expect(leaveStatusGroup('tasdiqlangan')).toBe('approved');
  });

  it('groups rejected codes, including the legacy Uzbek form', () => {
    expect(leaveStatusGroup('rejected')).toBe('rejected');
    expect(leaveStatusGroup('rad_etilgan')).toBe('rejected');
  });

  it('treats a missing status as pending (matches current screens)', () => {
    expect(leaveStatusGroup(undefined)).toBe('pending');
  });

  it('treats an unknown status as pending (matches current screens, which fall through to the pending branch)', () => {
    expect(leaveStatusGroup('something_new')).toBe('pending');
  });
});

describe('leaveStatusKind', () => {
  it('maps pending to the "pending" StatusKind', () => {
    expect(leaveStatusKind('pending')).toBe('pending');
    expect(leaveStatusKind('yuborildi')).toBe('pending');
    expect(leaveStatusKind(undefined)).toBe('pending');
  });

  it('maps approved (and its aliases) to the "success" StatusKind', () => {
    expect(leaveStatusKind('approved')).toBe('success');
    expect(leaveStatusKind('signed')).toBe('success');
    expect(leaveStatusKind('tasdiqlangan')).toBe('success');
  });

  it('maps rejected (and its alias) to the "error" StatusKind', () => {
    expect(leaveStatusKind('rejected')).toBe('error');
    expect(leaveStatusKind('rad_etilgan')).toBe('error');
  });
});
