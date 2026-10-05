// Pure work-leave approval logic — a port of web v2 RequestPermissionPage
// (`canActOn` / `isDecider` / `canReopen`) so the mobile app gates
// approve / reject / reopen exactly like the web dashboard (web parity is a
// hard constraint). Kept as pure functions (no React) so they are
// unit-testable — screens call them, never re-derive the rules inline.
import dayjs, { type Dayjs } from 'dayjs';
import type { Employee, User, WorkLeave } from '@/types';
import { isPendingCode, isApprovedCode, isRejectedCode } from '@/utils/leaveStatus';
import { canManageLeave } from '@/utils/workLeaveScope';
import { unwrapList } from '@/api/response';

// Permission gating uses the exact-membership checks from leaveStatus.ts, NOT
// leaveStatusGroup() — leaveStatusGroup() deliberately defaults an
// undefined/unrecognized status to 'pending' for display purposes, which
// would widen permissions here (an unknown status must stay non-actionable,
// non-deletable).

interface LeaveActionAbility {
  canSign: boolean;
  canReject: boolean;
}

function leaveOwnerId(leave: WorkLeave): number | undefined {
  return leave.employee_id ?? leave.employee?.id;
}

/**
 * The default approver of a request that names NO signer — the server's
 * `WorkLeaveService.default_approvers`: the requester's direct supervisor,
 * else the heads of the requester's department. A privileged manager (HR /
 * admin) may settle it too. v2 `canActOn` / `isDecider`, assigned-list-empty arm.
 */
function isDefaultApprover(leave: WorkLeave, user: User | null | undefined, me: number): boolean {
  if (canManageLeave(user)) return true;
  const supId = leave.employee?.supervisor_id;
  if (supId) return supId === me;
  // EmployeeSafeRead carries the flat `department_id` (not on the shared Employee type).
  const requester = leave.employee as (Employee & { department_id?: number | null }) | undefined;
  const deptId = requester?.department_id ?? requester?.department?.id;
  return !!deptId && (user?.headed_department_ids ?? []).includes(deptId);
}

/**
 * Is this person one of the request's deciders (status aside)? v2 `isDecider`
 * — the same gate the server's `_assert_assigned_signer` applies to
 * sign / reject / reopen. Never the requester themselves.
 */
export function isLeaveDecider(leave: WorkLeave | undefined, user: User | null | undefined): boolean {
  const me = user?.employee?.id;
  if (!leave || me == null || leaveOwnerId(leave) === me) return false;
  const assigned = leave.assigned_signers ?? [];
  if (assigned.length === 0) return isDefaultApprover(leave, user, me);
  return canManageLeave(user) || assigned.some((s) => s.id === me);
}

/**
 * Can the current user approve / reject this request? v2 `canActOn`:
 *   - only a PENDING request, never one's own;
 *   - no signer named (the default path — the server routes it to the
 *     requester's supervisor and returns `assigned_signers: []`): the default
 *     approver (supervisor, else a head of the requester's department) or a
 *     privileged manager (HR / admin);
 *   - signers named: an assigned signer who has not signed yet.
 */
export function canActOnLeave(leave: WorkLeave | undefined, user: User | null | undefined): LeaveActionAbility {
  const none: LeaveActionAbility = { canSign: false, canReject: false };
  const me = user?.employee?.id;
  if (!leave || me == null) return none;
  if (!isPendingCode(leave.status)) return none;
  if (leaveOwnerId(leave) === me) return none;

  const assigned = leave.assigned_signers ?? [];
  let can: boolean;
  if (assigned.length === 0) {
    can = isDefaultApprover(leave, user, me);
  } else {
    const alreadySigned = (leave.signers ?? []).some((s) => s.id === me);
    can = assigned.some((s) => s.id === me) && !alreadySigned;
  }
  return can ? { canSign: true, canReject: true } : none;
}

/**
 * Reopen (Verifix «reset», `POST work-leaves/{id}/reopen`): a DECIDED
 * (signed / rejected) request that is not a KADR order, by one of its
 * deciders. v2 `canReopen`; the server checks the same gate.
 */
export function canReopenLeave(leave: WorkLeave | undefined, user: User | null | undefined): boolean {
  if (!leave || leave.is_hr_order) return false;
  if (!isApprovedCode(leave.status) && !isRejectedCode(leave.status)) return false;
  return isLeaveDecider(leave, user);
}

/** Minimum length of a reopen reason (server `WorkLeaveReopen.reason`, v2 minLength). */
export const REOPEN_REASON_MIN = 3;


/** True when `leave` belongs to the given employee (author of the request). */
function isOwnLeave(leave: WorkLeave, employeeId: number): boolean {
  return leave.employee_id === employeeId || leave.employee?.id === employeeId;
}

/**
 * Can the current employee DELETE (withdraw) this leave request? Mirrors the
 * web's canDeleteWorkLeave (RequestPermissionPage.jsx:104-119), which only
 * surfaces on the "my" tab — so on mobile, where the detail screen is shared
 * between own and others' requests, we additionally require ownership.
 *
 * Rules (web parity):
 *   - only the author may delete;
 *   - never once the request is finalized (approved/signed/rejected);
 *   - if there are assigned signers, only while NONE of them has signed yet;
 *   - if there are no assigned signers, only while there are no signers at all.
 */
export function canDeleteLeave(
  leave: WorkLeave | undefined,
  employeeId: number | undefined,
): boolean {
  if (!leave || employeeId == null) return false;
  if (!isOwnLeave(leave, employeeId)) return false;

  const status = leave.status;
  if (isApprovedCode(status) || isRejectedCode(status)) {
    return false;
  }

  const signers = leave.signers ?? [];
  const assignedSigners = leave.assigned_signers ?? [];

  if (assignedSigners.length > 0) {
    // Deletable only while no assigned signer has signed yet.
    return !assignedSigners.some((a) => signers.some((s) => s.id === a.id));
  }
  // No assigned signers: deletable only while nobody has signed.
  return signers.length === 0;
}

// ── Create form (web v2 RequestPermissionPage parity) ─────────────────────────

/**
 * Earliest allowed start for a request, or null when unrestricted (rules not
 * loaded yet, or the user is exempt — HR/admins record facts after the event).
 * Same rule as the server: start-of-today minus `max_days_back` days.
 */
export function earliestLeaveStart(
  rules: { max_days_back: number; exempt: boolean } | undefined,
  now: Dayjs = dayjs(),
): Dayjs | null {
  if (!rules || rules.exempt) return null;
  return now.startOf('day').subtract(Math.max(0, rules.max_days_back), 'day');
}

/**
 * Reason choices: HR's dictionary names (trimmed, de-duplicated, in order), or
 * the built-in fallback when the dictionary is empty or unreachable — the field
 * must never be left without a choice.
 */
export function leaveReasonOptions(rows: unknown, fallback: readonly string[]): string[] {
  const seen = new Set<string>();
  // unwrapList — a non-array payload (`{ items }`, `{}`) must not crash the form.
  for (const r of unwrapList<{ name?: string | null } | null>(rows)) {
    const n = typeof r?.name === 'string' ? r.name.trim() : '';
    if (n) seen.add(n);
  }
  return seen.size ? [...seen] : [...fallback];
}

/** What the routing notice says: who gets the request, or that HR will. */
export function approverNotice(
  approvers: unknown,
): { kind: 'supervisor' | 'department_head' | 'nobody'; names: string } {
  const list = unwrapList<{ legal_name?: string | null; via?: string } | null>(approvers).filter(Boolean);
  const names = list.map((a) => (typeof a?.legal_name === 'string' ? a.legal_name.trim() : '')).filter(Boolean).join(', ');
  if (!names) return { kind: 'nobody', names: '' };
  return { kind: list[0]?.via === 'department_head' ? 'department_head' : 'supervisor', names };
}

/**
 * A leave timestamp on the whole minute — seconds AND milliseconds zeroed.
 * QA 2026-10-05: the defaults set `.minute(0).second(0)` but kept `now`'s
 * milliseconds, so requests reached the server as `20:00:00.073`.
 */
export function leaveMinute(d: Dayjs): Dayjs {
  return d.second(0).millisecond(0);
}

/** Create-form defaults: from the top of the current hour, for one hour. */
export function defaultLeaveRange(now: Dayjs = dayjs()): { start: Dayjs; end: Dayjs } {
  const start = leaveMinute(now.minute(0));
  return { start, end: start.add(1, 'hour') };
}
