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

const APPROVED_CODES = new Set(['approved', 'tasdiqlangan', 'signed']);
const REJECTED_CODES = new Set(['rejected', 'rad_etilgan']);

/**
 * Classify a work-leave status code into one of three groups. Unknown or
 * missing codes fall through to 'pending' — this matches every existing
 * display copy, which all defaulted to the pending branch.
 */
export function leaveStatusGroup(status?: string): LeaveStatusGroup {
  if (status && APPROVED_CODES.has(status)) return 'approved';
  if (status && REJECTED_CODES.has(status)) return 'rejected';
  return 'pending';
}

/** Group → StatusKind, for use with orderStatus.ts's shared statusColor(). */
export function leaveStatusKind(status?: string): StatusKind {
  const group = leaveStatusGroup(status);
  if (group === 'approved') return 'success';
  if (group === 'rejected') return 'error';
  return 'pending';
}
