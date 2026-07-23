import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { SUPPORT_TICKETS, SUPPORT_TICKET_DETAIL } from '@/api/urls';
import type { SupportTicket } from '@/types';

// Hierarchical query keys. `all` = ['support-tickets'] so any mutation can
// refresh the list and any open detail with one invalidate.
export const supportKeys = {
  all: ['support-tickets'] as const,
  mine: (status?: string) => [...supportKeys.all, 'mine', status ?? 'any'] as const,
  detail: (id: number) => [...supportKeys.all, 'detail', id] as const,
};

// The employee's own tickets. The backend returns a flat List; `mine=true`
// scopes to created_by = me. Optional status filter (open/in_progress/done).
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
