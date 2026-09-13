import {
  ticketStatusKey, ticketStatusKind, ticketPriorityKey, canRateTicket, canTakeTicket, canDoneTicket,
} from '../supportStatus';
import type { SupportTicket } from '@/types';

const base: SupportTicket = { id: 1, priority: 'normal', description: 'x', status: 'open' };

describe('ticketStatusKey', () => {
  it('maps each status to its i18n key', () => {
    expect(ticketStatusKey('open')).toBe('support.statusOpen');
    expect(ticketStatusKey('in_progress')).toBe('support.statusInProgress');
    expect(ticketStatusKey('done')).toBe('support.statusDone');
    expect(ticketStatusKey('rated')).toBe('support.statusRated');
  });
});

describe('ticketStatusKind', () => {
  it('maps status to a semantic kind', () => {
    expect(ticketStatusKind('open')).toBe('open');
    expect(ticketStatusKind('in_progress')).toBe('progress');
    expect(ticketStatusKind('done')).toBe('done');
    expect(ticketStatusKind('rated')).toBe('rated');
  });
});

describe('ticketPriorityKey', () => {
  it('maps each priority to its i18n key', () => {
    expect(ticketPriorityKey('urgent')).toBe('support.priorityUrgent');
    expect(ticketPriorityKey('normal')).toBe('support.priorityNormal');
    expect(ticketPriorityKey('low')).toBe('support.priorityLow');
  });
});

describe('canRateTicket', () => {
  it('lets the creator rate a done ticket', () => {
    expect(canRateTicket({ ...base, status: 'done' }, true)).toBe(true);
  });
  it('denies a non-creator', () => {
    expect(canRateTicket({ ...base, status: 'done' }, false)).toBe(false);
  });
  it('denies rating when not done yet', () => {
    expect(canRateTicket({ ...base, status: 'in_progress' }, true)).toBe(false);
  });
});

describe('canRateTicket — master-admin (server: creator || master-admin)', () => {
  it('lets the site master-admin rate/reopen a done ticket', () => {
    expect(canRateTicket({ ...base, status: 'done' }, false, true)).toBe(true);
  });
});

describe('AKT gates (mirror services/support_ticket.py)', () => {
  const t = { ...base, status: 'open' as const, organization_branch_id: 4, assignee_id: null };
  it('canTakeTicket: AKT for the branch AND status open', () => {
    expect(canTakeTicket(t, [4])).toBe(true);
    expect(canTakeTicket(t, [5])).toBe(false);
    expect(canTakeTicket({ ...t, status: 'in_progress' }, [4])).toBe(false);
    expect(canTakeTicket({ ...t, organization_branch_id: null }, [4])).toBe(false);
  });
  it('canDoneTicket: assignee (or master-admin) while in progress', () => {
    const inProg = { ...t, status: 'in_progress' as const, assignee_id: 9 };
    expect(canDoneTicket(inProg, 9)).toBe(true);
    expect(canDoneTicket(inProg, 8)).toBe(false);
    expect(canDoneTicket(inProg, 8, true)).toBe(true);
    expect(canDoneTicket({ ...inProg, status: 'open' }, 9)).toBe(false);
  });
});
