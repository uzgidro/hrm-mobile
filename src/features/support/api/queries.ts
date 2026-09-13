import { queryOptions } from '@tanstack/react-query';
import { pagedListOptions, cleanParams, type ListParams } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { SUPPORT_TICKETS, SUPPORT_TICKET_DETAIL, SUPPORT_TICKET_MESSAGES } from '@/api/urls';
import type { SupportTicket, SupportTicketMessage } from '@/types';

// Hierarchical query keys. `all` = ['support-tickets'] so any mutation can
// refresh the list and any open detail with one invalidate.
export const supportKeys = {
  all: ['support-tickets'] as const,
  mine: (status?: string) => [...supportKeys.all, 'mine', status ?? 'any'] as const,
  detail: (id: number) => [...supportKeys.all, 'detail', id] as const,
  messages: (id: number) => [...supportKeys.all, 'messages', id] as const,
};

export type SupportScope = 'mine' | 'queue';
export type SupportStatusFilter = 'all' | 'open' | 'in_progress' | 'done';

export interface SupportListParams {
  scope: SupportScope;
  status?: SupportStatusFilter;
  search?: string;
}

/**
 * `mine=true` → my own tickets; without it the backend returns the AKT queue
 * of the branches the caller services (master-admin: all). `done` covers
 * `rated` too (backend `_STATUS_ALIASES`). Search = description / UGE / room.
 */
export function supportListServerParams(p: SupportListParams): ListParams {
  return {
    mine: p.scope === 'mine' ? true : undefined,
    status: p.status === 'all' ? undefined : p.status,
    search: p.search?.trim() || undefined,
  };
}

// Server-paged (30 rows); the queue polls because AKT work arrives from others.
export function ticketsListQuery(params: SupportListParams) {
  return pagedListOptions<SupportTicket>({
    queryKey: [...supportKeys.all, 'list', params.scope, cleanParams(supportListServerParams(params))] as const,
    url: SUPPORT_TICKETS,
    params: supportListServerParams(params),
    refetchOnMount: 'always',
    refetchInterval: params.scope === 'queue' ? 60 * 1000 : undefined,
  });
}

// Kept for callers needing a plain array of my tickets (legacy signature).
export function myTicketsQuery(status?: string) {
  return queryOptions({
    queryKey: supportKeys.mine(status),
    queryFn: () =>
      apiClient
        .get<SupportTicket[]>(SUPPORT_TICKETS, { params: { mine: true, ...(status ? { status } : {}) } })
        .then((r) => r.data ?? []),
    refetchOnMount: 'always',
  });
}

export function ticketDetailQuery(id: number) {
  return queryOptions({
    queryKey: supportKeys.detail(id),
    queryFn: () => apiClient.get<SupportTicket>(SUPPORT_TICKET_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    refetchOnMount: 'always',
  });
}

// Ticket yozishmasi. Ekran ochiq turganda 20 soniyada bir yangilanadi — AKT
// javobi push kutmasdan ko'rinsin (WebSocket bu ekran uchun ortiqcha).
export function ticketMessagesQuery(id: number) {
  return queryOptions({
    queryKey: supportKeys.messages(id),
    queryFn: () =>
      apiClient.get<SupportTicketMessage[]>(SUPPORT_TICKET_MESSAGES(id)).then((r) => r.data ?? []),
    enabled: !!id,
    refetchOnMount: 'always',
    refetchInterval: 20_000,
  });
}
