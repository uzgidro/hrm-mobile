import { cardStatus, canActOnCard } from '../cardStatus';
import type { WorkspaceCardFull } from '@/types';

const card = (over: Partial<WorkspaceCardFull> = {}): WorkspaceCardFull => ({
  id: 1,
  title: 'T',
  ...over,
});

describe('cardStatus', () => {
  it('is "rejected" when rejected_at is set (takes priority)', () => {
    expect(cardStatus(card({ rejected_at: '2026-07-01T00:00:00' }))).toBe('rejected');
    // rejected wins even if is_completed somehow set
    expect(cardStatus(card({ rejected_at: '2026-07-01T00:00:00', is_completed: true }))).toBe('rejected');
  });

  it('is "completed" when is_completed and not rejected', () => {
    expect(cardStatus(card({ is_completed: true }))).toBe('completed');
  });

  it('is "active" otherwise', () => {
    expect(cardStatus(card())).toBe('active');
    expect(cardStatus(card({ is_completed: false }))).toBe('active');
  });
});

describe('canActOnCard', () => {
  it('lets the card creator act', () => {
    expect(canActOnCard(card({ created_by_id: 10 }), 10)).toBe(true);
  });

  it('lets a card member (assignee) act', () => {
    expect(canActOnCard(card({ members: [{ member: { id: 7, legal_name: 'X' } }] }), 7)).toBe(true);
  });

  it('denies a non-member, non-creator', () => {
    expect(canActOnCard(card({ created_by_id: 10, members: [{ member: { id: 7, legal_name: 'X' } }] }), 99)).toBe(false);
  });

  it('denies when the employee id is undefined', () => {
    expect(canActOnCard(card({ created_by_id: 10 }), undefined)).toBe(false);
  });

  it('resolves member id from member_id when member object is absent', () => {
    expect(canActOnCard(card({ members: [{ id: 1, member_id: 5 } as any] }), 5)).toBe(true);
  });
});
