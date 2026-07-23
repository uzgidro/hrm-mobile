import {
  ticketStatusKey, ticketStatusKind, ticketPriorityKey, canRateTicket,
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
