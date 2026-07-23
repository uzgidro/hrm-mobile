import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORKSPACES_LIST, WORKSPACE_DETAIL, CARDS_LIST, CARD_DETAIL, CARD_COMMENTS } from '@/api/urls';
import type { Workspace, WorkspaceCard, WorkspaceCardFull, CardComment } from '@/types';

// Hierarchical query keys — invalidating `projectKeys.all` refreshes the
// my-workspaces list, any open board detail and its per-column card lists
// (prefix match). This is the per-feature queryOptions pattern (TkDodo): key +
// queryFn colocated so screens, prefetch and invalidation reference one source
// of truth.
export const projectKeys = {
  all: ['projects'] as const,
  myWorkspaces: () => [...projectKeys.all, 'mine'] as const,
  detail: (id: number) => [...projectKeys.all, 'detail', id] as const,
  cards: (columnId: number) => [...projectKeys.all, 'cards', columnId] as const,
  card: (id: number) => [...projectKeys.all, 'card', id] as const,
  cardComments: (id: number) => [...projectKeys.all, 'card', id, 'comments'] as const,
};

// Read a single workspace (used by the board detail query and the edit-form prefill).
export function getWorkspace(id: number): Promise<Workspace> {
  return apiClient.get<Workspace>(WORKSPACE_DETAIL(id)).then((r) => r.data);
}

// My workspaces (member-of only) — mirrors the web "my boards" list.
export function myWorkspacesQuery() {
  return queryOptions({
    queryKey: projectKeys.myWorkspaces(),
    queryFn: () =>
      apiClient
        .get(WORKSPACES_LIST, { params: { only_member: true, exclude_member: false } })
        .then((r) => {
          const d = r.data;
          // The API returns either a bare array or a { items } envelope.
          return (Array.isArray(d) ? d : (d?.items ?? [])) as Workspace[];
        }),
    staleTime: 60 * 1000,
  });
}

export function workspaceDetailQuery(id: number) {
  return queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: () => getWorkspace(id),
    enabled: !!id,
    // The kanban board (columns/cards/members) changes externally — always
    // revalidate on open so stale columns and stale action buttons aren't shown.
    refetchOnMount: 'always',
  });
}

export function columnCardsQuery(columnId: number) {
  return queryOptions({
    queryKey: projectKeys.cards(columnId),
    queryFn: () =>
      apiClient
        .get(CARDS_LIST, { params: { column_id: columnId } })
        .then((r) => {
          const d = r.data;
          return (Array.isArray(d) ? d : (d?.items ?? [])) as WorkspaceCard[];
        }),
    enabled: !!columnId,
    // Cards are the board's externally-mutable content (other members complete
    // or add cards) — revalidate on open, matching workspaceDetailQuery.
    refetchOnMount: 'always',
  });
}

// Full card detail (GET /cards/{id}) — description, dates, members, labels,
// attachments nested. Comments come separately (cardCommentsQuery).
export function cardDetailQuery(id: number) {
  return queryOptions({
    queryKey: projectKeys.card(id),
    queryFn: () => apiClient.get<WorkspaceCardFull>(CARD_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Status/members change externally — revalidate on open so the action
    // buttons and completed/rejected state aren't stale.
    refetchOnMount: 'always',
  });
}

export function cardCommentsQuery(id: number) {
  return queryOptions({
    queryKey: projectKeys.cardComments(id),
    queryFn: () =>
      apiClient.get(CARD_COMMENTS(id)).then((r) => {
        const d = r.data;
        return (Array.isArray(d) ? d : (d?.items ?? [])) as CardComment[];
      }),
    enabled: !!id,
    refetchOnMount: 'always',
  });
}
