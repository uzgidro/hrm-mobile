// Canonical work-leave status classification. Leave-status codes were
// re-implemented independently in six display sites (WorkLeavesScreen,
// TeamLeavesScreen, LeaveDetailScreen, HomeScreen, TeamScreen, NavRail) plus a
// seventh inline copy inside leaves/utils.ts's canDeleteLeave — this is the one
// shared classifier they all read from.
//
// The three status groups and their aliases (confirmed by grep across the
// codebase, English + legacy Uzbek codes the backend still returns):
//   pending:  'pending', 'yuborildi'
//   approved: 'approved', 'tasdiqlangan', 'signed'  (the server returns
//             'signed' after a leave is signed — see
//             src/features/leaves/api/__tests__/mutations.test.ts)
//   rejected: 'rejected', 'rad_etilgan'
//
// i18n note: unlike order-act statuses (single `status.ts` namespace), leave
// status labels are duplicated verbatim across three namespaces
// (`leaves.status*`, `dashboard.status.*`, `attendance.status.*`) with a small
// ru wording difference between them ("Ожидает" vs "В ожидании"). To avoid
// silently changing any screen's displayed text, this module does NOT own the
// label string — only the group and the StatusKind used for color. Each
// screen keeps resolving its own label via its own existing t() key.
import type { StatusKind } from './orderStatus';

export type LeaveStatusGroup = 'pending' | 'approved' | 'rejected';

/**
 * Exact-match code sets, exported so callers that need allowlist semantics
 * (not a "defaults to pending" fallback) can check membership directly.
 * leaves/utils.ts's canActOnLeave/canDeleteLeave are exactly that case: they
 * must keep returning false for an undefined/unrecognized status, whereas
 * leaveStatusGroup() below deliberately defaults unknown codes to 'pending'
 * for display. Do NOT swap those permission checks to
 * `leaveStatusGroup(s) === 'pending'` — it would silently widen permissions
 * for an unrecognized status code from false to true. Use PENDING_CODES.has/
 * REJECTED_CODES.has (or the equivalent isPendingCode/isRejectedCode below)
 * there instead.
 */
export const PENDING_CODES = new Set(['pending', 'yuborildi']);
export const APPROVED_CODES = new Set(['approved', 'tasdiqlangan', 'signed']);
export const REJECTED_CODES = new Set(['rejected', 'rad_etilgan']);

/** Exact membership check — false for undefined/unknown, unlike leaveStatusGroup(). */
export function isPendingCode(status?: string): boolean {
  return status != null && PENDING_CODES.has(status);
}

/** Exact membership check — false for undefined/unknown, unlike leaveStatusGroup(). */
export function isApprovedCode(status?: string): boolean {
  return status != null && APPROVED_CODES.has(status);
}

/** Exact membership check — false for undefined/unknown, unlike leaveStatusGroup(). */
export function isRejectedCode(status?: string): boolean {
  return status != null && REJECTED_CODES.has(status);
}

/**
 * Classify a work-leave status code into one of three groups for DISPLAY.
 * Unknown or missing codes fall through to 'pending' — this matches every
 * existing display copy, which all defaulted to the pending branch. Do NOT
 * use this for permission checks (see the note above) — use the exact
 * isPendingCode/isApprovedCode/isRejectedCode instead.
 */
export function leaveStatusGroup(status?: string): LeaveStatusGroup {
  if (isApprovedCode(status)) return 'approved';
  if (isRejectedCode(status)) return 'rejected';
  return 'pending';
}

/** Group → StatusKind, for use with orderStatus.ts's shared statusColor(). */
export function leaveStatusKind(status?: string): StatusKind {
  const group = leaveStatusGroup(status);
  if (group === 'approved') return 'success';
  if (group === 'rejected') return 'error';
  return 'pending';
}
