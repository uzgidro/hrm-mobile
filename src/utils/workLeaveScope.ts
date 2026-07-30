import type { User } from '@/types';
import { isHR, isDeputy } from './roles';

// Role-based scoping params for the work-leaves "all"/team list, mirroring the
// web RequestPermissionPage `queryParams` (all tab). The backend `GET /work-leaves`
// does NOT auto-scope by the caller — it returns whatever the params ask for, so
// an unscoped fetch leaks every branch's / every employee's requests (PII). Every
// non-HR caller MUST pass a narrowing param:
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
