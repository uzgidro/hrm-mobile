import type { User } from '@/types';
import { availableLeaveScopes, canManageLeave, leaveScopeParams } from '../workLeaveScope';

const emp = (role?: string): User =>
  ({
    id: 1,
    type: 'employee',
    employee: { id: 10, legal_name: 'X', ...(role ? { is_multi_org_user: true, multi_org_employee_role: role } : {}) },
  }) as User;

describe('workLeaveScope — web v2 RequestPermissionPage scopes', () => {
  it('canManageLeave mirrors the server _is_privileged_manager (HR / ministr / master-admin)', () => {
    expect(canManageLeave(emp('hr'))).toBe(true);
    expect(canManageLeave(emp('ministr'))).toBe(true);
    expect(canManageLeave({ id: 2, type: 'master-admin' } as User)).toBe(true);
    expect(canManageLeave(emp())).toBe(false);
    expect(canManageLeave(emp('deputy'))).toBe(false);
    expect(canManageLeave(null)).toBe(false);
  });

  it('team only with subordinates, branch only for privileged managers, mine always', () => {
    expect(availableLeaveScopes(emp(), false)).toEqual(['mine']);
    expect(availableLeaveScopes(emp(), true)).toEqual(['mine', 'team']);
    expect(availableLeaveScopes(emp('hr'), false)).toEqual(['mine', 'branch']);
    expect(availableLeaveScopes(emp('hr'), true)).toEqual(['mine', 'team', 'branch']);
  });

  it('params: mine sends no scope, team = supervised, branch id rides along', () => {
    expect(leaveScopeParams('mine')).toEqual({});
    expect(leaveScopeParams('team')).toEqual({ supervised: true });
    expect(leaveScopeParams('branch', 5)).toEqual({ organization_branch_id: 5 });
    expect(leaveScopeParams('team', 5)).toEqual({ supervised: true, organization_branch_id: 5 });
    // never the old `assigned_signer=true` (it hid signer-less requests routed to the supervisor)
    for (const sc of ['mine', 'team', 'branch'] as const)
      expect(leaveScopeParams(sc, 1)).not.toHaveProperty('assigned_signer');
  });
});
