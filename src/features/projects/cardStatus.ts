import type { WorkspaceCardFull } from '@/types';

// Card status is derived, not a stored enum: rejected_at wins over is_completed,
// else completed, else active. (Backend CardReadFull: is_completed +
// completed_at/rejected_at + completed_by_id/rejected_by_id.)
export type CardStatus = 'rejected' | 'completed' | 'active';

export function cardStatus(card: Pick<WorkspaceCardFull, 'is_completed' | 'rejected_at'>): CardStatus {
  if (card.rejected_at) return 'rejected';
  if (card.is_completed) return 'completed';
  return 'active';
}

// Who may complete/uncomplete/reject: the card creator or an assigned member.
// This mirrors the backend gate (creator or assignee, else 403) so the UI only
// SHOWS the action bar to those users — the backend still enforces it. `member`
// may carry the employee nested (`member.id`) or as `member_id`.
export function canActOnCard(
  card: Pick<WorkspaceCardFull, 'created_by_id' | 'members'>,
  employeeId?: number,
): boolean {
  if (employeeId == null) return false;
  if (card.created_by_id === employeeId) return true;
  return (card.members ?? []).some(
    (m) => m.member?.id === employeeId || (m as { member_id?: number }).member_id === employeeId,
  );
}
