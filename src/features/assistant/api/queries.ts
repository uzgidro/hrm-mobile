import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LLM_SESSIONS, LLM_SESSION_MESSAGES } from '@/api/urls';
import type { LlmMessage, LlmSession } from '@/types';

// Per-feature queryOptions factories for the LLM assistant. All endpoints are
// owner-scoped server-side (created_by_id); visibility of the whole feature is
// the CLIENT gate canAccessPage(user,'assistant') — the backend accepts any
// authenticated user.
export const assistantKeys = {
  all: ['assistant'] as const,
  sessions: () => [...assistantKeys.all, 'sessions'] as const,
  messages: (sessionId: number) => [...assistantKeys.all, 'messages', sessionId] as const,
};

function unwrap<T>(d: any): T[] {
  return (Array.isArray(d) ? d : (d?.items ?? [])) as T[];
}

// My chat sessions, newest first (server orders by id desc already; re-sort
// defensively since SessionRead has no timestamps to sort by client-side).
export function assistantSessionsQuery() {
  return queryOptions({
    queryKey: assistantKeys.sessions(),
    queryFn: () =>
      apiClient.get(LLM_SESSIONS).then((r) => {
        const items = unwrap<LlmSession>(r.data);
        return [...items].sort((a, b) => b.id - a.id);
      }),
    staleTime: 60 * 1000,
  });
}

// A session's visible transcript (user + final assistant rows only), ordered
// by sequence. ALWAYS visible_only=true — without it, raw tool-call/tool-result
// rows leak into the chat.
export function assistantMessagesQuery(sessionId: number) {
  return queryOptions({
    queryKey: assistantKeys.messages(sessionId),
    queryFn: () =>
      apiClient
        .get(LLM_SESSION_MESSAGES(sessionId), { params: { visible_only: true } })
        .then((r) => {
          const items = unwrap<LlmMessage>(r.data);
          return [...items].sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id));
        }),
    staleTime: 0,
  });
}
