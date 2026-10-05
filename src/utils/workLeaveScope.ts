import type { User } from '@/types';
import { isHR, isMasterAdmin, isSiteMasterAdmin } from './roles';

// WHOSE leave requests a list shows — a 1:1 port of web v2
// (`features/leave/useLeave.ts` LEAVE_SCOPES + leaveScopeParams, and the
// scope filter in `pages/RequestPermissionPage.tsx`).
//
//   mine   → no scope param. The server's default for a non-trusted caller is
//            already "what I filed AND what is mine to decide" (own request ∨
//            assigned signer ∨ a direct report's request ∨ headed department ∨
//            line-manager team — `WorkLeaveService.list_work_leaves`). Sending
//            `employee_id=me` would drop the second half and with it the
//            approve/reject buttons. v2 labels it «Menga tegishli».
//   team   → `supervised=true`: requests of my direct reports. Offered only to
//            someone who has subordinates (v2 `useHasSubordinates`).
//   branch → the whole branch — HR and the administrators only.
//
// ⚠️ QA 2026-10-05: the old mobile rule queried `assigned_signer=true`, but a
// request filed without signers (the default v2/mobile path) is routed to the
// requester's supervisor with `assigned_signers: []` — so a line manager's
// incoming list was EMPTY while the menu badge said 3.
//
// `organization_branch_id`: v2 injects the selected branch into every request
// (`api/branchParam.ts`; an employee's branch is selected for them at login),
// so the same narrowing is applied here whenever the caller knows its branch.
export type LeaveScope = 'mine' | 'team' | 'branch';
export const LEAVE_SCOPES: readonly LeaveScope[] = ['mine', 'team', 'branch'];

/** Mirror of the server's `_is_privileged_manager` (v2 `canManageLeave`). */
export function canManageLeave(user?: User | null): boolean {
  return isHR(user) || isMasterAdmin(user) || isSiteMasterAdmin(user);
}

/** The scopes this person is offered, in v2 order. */
export function availableLeaveScopes(user: User | null | undefined, hasTeam: boolean): LeaveScope[] {
  const canSeeBranch = canManageLeave(user);
  return LEAVE_SCOPES.filter((sc) => (sc === 'team' ? hasTeam : sc === 'branch' ? canSeeBranch : true));
}

/** Query params for the chosen scope (shared by every leave list). */
export function leaveScopeParams(scope: LeaveScope, branchId?: number | null): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (scope === 'team') p.supervised = true;
  if (branchId != null) p.organization_branch_id = branchId;
  return p;
}
