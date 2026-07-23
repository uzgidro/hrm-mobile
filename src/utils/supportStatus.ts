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
// gates on creator || master-admin; screens pass the resolved ownership in.
export function canRateTicket(ticket: SupportTicket, isCreator: boolean): boolean {
  return isCreator && ticket.status === 'done';
}
