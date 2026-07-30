import type { User } from '@/types';
import { isHR, isDeputy } from './roles';

// Role-based scoping params for the work-leaves "all"/team list, mirroring the
// web RequestPermissionPage `queryParams` (all tab).
//
// The backend used to be fail-OPEN here (params-only filtering, so an unscoped
// fetch returned every branch's requests). Since backend `6cd1fe3` it applies a
// MANDATORY predicate for every caller that is not master-admin / HR / ministr:
// own request ∨ assigned signer ∨ headed department. These params therefore no
// longer carry the whole security boundary — but they stay, because they decide
// what the screen SHOWS (a deputy wants the sign queue, not their own leave) and
// they keep the server's result set small. Rule per role:
//   HR        → no role filter (sees all — caller still adds the branch filter)
//   Deputy    → assigned_signer=true (only requests routed to them to sign)
//   Dept head → department_ids = headed departments
//   else      → assigned_signer=true (regular employees only see what they must sign)
// Pass branchId to also constrain to a single organization branch.
export function workLeaveAllScopeParams(
  user?: User | null,
  branchId?: number | null,
): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (branchId != null) p.organization_branch_id = branchId;

  const headed = user?.headed_department_ids ?? [];
  if (isHR(user)) {
    // HR: no additional row-level filter (branch filter above is the boundary).
  } else if (isDeputy(user)) {
    p.assigned_signer = true;
  } else if (headed.length > 0) {
    p.department_ids = headed;
  } else {
    p.assigned_signer = true;
  }
  return p;
}
