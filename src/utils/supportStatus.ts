import type { SupportTicket } from '@/types';

// Support-ticket status/priority are backend contract strings — never translated.
// These helpers map them to an i18n key + a semantic color kind, so screens don't
// scatter status conditionals (mirrors orderStatus / letterStatus).

export type StatusKind = 'open' | 'progress' | 'done' | 'rated';

export function ticketStatusKey(status: SupportTicket['status']): string {
  switch (status) {
    case 'in_progress':
      return 'support.statusInProgress';
    case 'done':
      return 'support.statusDone';
    case 'rated':
      return 'support.statusRated';
    case 'open':
    default:
      return 'support.statusOpen';
  }
}

export function ticketStatusKind(status: SupportTicket['status']): StatusKind {
  switch (status) {
    case 'in_progress':
      return 'progress';
    case 'done':
      return 'done';
    case 'rated':
      return 'rated';
    default:
      return 'open';
  }
}

export function ticketPriorityKey(priority: SupportTicket['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'support.priorityUrgent';
    case 'low':
      return 'support.priorityLow';
    case 'normal':
    default:
      return 'support.priorityNormal';
  }
}

// The creator can rate a done ticket and reopen it if not satisfied. Backend
// gates on creator || master-admin (`rate_ticket` / `reopen_ticket`); the
// master-admin half used to be missing here, so the site admin saw no button
// for an action the server allowed.
export function canRateTicket(ticket: SupportTicket, isCreator: boolean, isMasterAdmin = false): boolean {
  return (isCreator || isMasterAdmin) && ticket.status === 'done';
}

// ── AKT side (mirrors services/support_ticket.py take_ticket / mark_done) ──
/** Is this user an AKT specialist for the ticket's branch? `akt_branch_ids`
 *  comes from `/auth/me` (branch leaders with role `akt`). */
export function isAktForTicket(ticket: SupportTicket, aktBranchIds: number[] | undefined): boolean {
  const bid = ticket.organization_branch_id;
  return bid != null && (aktBranchIds ?? []).includes(bid);
}

/** "Qabul qilish": AKT for the branch, ticket still open. */
export function canTakeTicket(ticket: SupportTicket, aktBranchIds: number[] | undefined): boolean {
  return ticket.status === 'open' && isAktForTicket(ticket, aktBranchIds);
}

/** "Bajarildi": the assignee (or master-admin) while in progress. */
export function canDoneTicket(ticket: SupportTicket, employeeId: number | undefined, isMasterAdmin = false): boolean {
  if (ticket.status !== 'in_progress') return false;
  return isMasterAdmin || (employeeId != null && ticket.assignee_id === employeeId);
}
