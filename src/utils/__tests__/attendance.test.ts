import { attendanceQueryKey } from '../attendance';

// NOTE: fetchAllAttendanceEvents (the paginated network fetch) is intentionally
// NOT tested here — it is owned by another agent. Only the pure helper is covered.

describe('attendanceQueryKey', () => {
  it('builds a react-query key with date and branch id', () => {
    expect(attendanceQueryKey('2026-07-06', 42)).toEqual(['team-attendance', '2026-07-06', 42]);
  });

  it('leaves the branch id undefined when omitted', () => {
    expect(attendanceQueryKey('2026-07-06')).toEqual(['team-attendance', '2026-07-06', undefined]);
  });

  it('preserves argument order for distinct dates/branches', () => {
    expect(attendanceQueryKey('2020-01-01', 1)).toEqual(['team-attendance', '2020-01-01', 1]);
    expect(attendanceQueryKey('', 0)).toEqual(['team-attendance', '', 0]);
  });
});
