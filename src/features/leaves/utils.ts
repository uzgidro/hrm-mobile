// Pure work-leave approval logic — mirrors the web's canActOnWorkLeave
// (RequestPermissionPage.jsx:63-101) so the mobile app gates sign/reject exactly
// like the web dashboard (web parity is a hard constraint). Kept as a pure
// function (no React) so it is unit-testable — screens call it, never re-derive
// the rules inline.
import type { WorkLeave, Employee } from '@/types';
import { getMultiOrgRoles } from '@/utils/roles';

function isPending(status?: string): boolean {
  return status === 'pending' || status === 'yuborildi';
}

function isRejected(status?: string): boolean {
  return status === 'rejected' || status === 'rad_etilgan';
}

/** Whether a signer (assigned_signers / signers entry) carries a given role. */
function signerHasRole(signer: Employee, role: string): boolean {
  return getMultiOrgRoles(signer).includes(role);
}

export interface LeaveActionAbility {
  canSign: boolean;
  canReject: boolean;
}

/**
 * Can the current employee sign/reject this leave request? Mirrors the web:
 *   - HR is VIEW-ONLY — never signs or rejects (web returns all-false for HR).
 *   - Rejected requests → no actions.
 *   - If the current user already signed → no actions.
 *   - Otherwise: an assigned signer may act while the request is pending.
 *     canSign is additionally blocked for HR before the Deputy (Zam) has signed,
 *     but since HR is already view-only that guard never fires here — it is kept
 *     for parity/clarity, matching the web's isSignDisabled.
 *
 * @param isHR  whether the CURRENT user is HR (resolve via roles.isHR at the call site)
 */
export function canActOnLeave(
  leave: WorkLeave | undefined,
  employeeId: number | undefined,
  opts: { isHR: boolean },
): LeaveActionAbility {
  const none: LeaveActionAbility = { canSign: false, canReject: false };
  if (!leave || employeeId == null) return none;

  // HR only views status — never signs or rejects (web parity).
  if (opts.isHR) return none;

  if (isRejected(leave.status)) return none;

  const signers = leave.signers ?? [];
  const assignedSigners = leave.assigned_signers ?? [];

  // Already signed → cannot act again.
  if (signers.some((s) => s.id === employeeId)) return none;

  // Must be an assigned signer AND the request still pending.
  const isAssignedSigner = assignedSigners.some((s) => s.id === employeeId);
  const canAct = isAssignedSigner && isPending(leave.status);
  if (!canAct) return none;

  // HR-can't-sign-before-Zam guard (dead for non-HR, kept for web parity).
  const hasZamSigned = signers.some((s) => signerHasRole(s, 'deputy'));
  const isZamAssigned = assignedSigners.some((s) => signerHasRole(s, 'deputy'));
  const isSignDisabled = opts.isHR && isZamAssigned && !hasZamSigned;

  return { canSign: !isSignDisabled, canReject: true };
}

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
  if (
    status === 'approved' || status === 'tasdiqlangan' || status === 'signed' ||
    status === 'rejected' || status === 'rad_etilgan'
  ) {
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
