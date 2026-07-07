import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  WORKSPACES_LIST,
  WORKSPACE_DETAIL,
  WORKSPACE_MEMBER,
  COLUMNS_LIST,
  CARDS_LIST,
  CARD_COMPLETE,
  CARD_UNCOMPLETE,
} from '@/api/urls';
import type { Workspace, WorkspaceColumn, WorkspaceCard } from '@/types';
import { projectKeys } from './queries';

export interface WorkspacePayload {
  name: string;
  description?: string;
}

export interface CardPayload {
  title: string;
  description?: string;
  column_id: number;
}

// ── Request functions (pure data access; unit-testable without React) ────────
export function createWorkspace(payload: WorkspacePayload): Promise<Workspace> {
  return apiClient.post<Workspace>(WORKSPACES_LIST, payload).then((r) => r.data);
}

export function updateWorkspace(id: number, payload: WorkspacePayload): Promise<Workspace> {
  return apiClient.patch<Workspace>(WORKSPACE_DETAIL(id), payload).then((r) => r.data);
}

export function deleteWorkspace(id: number): Promise<void> {
  return apiClient.delete(WORKSPACE_DETAIL(id)).then(() => undefined);
}

export function addWorkspaceMember(workspaceId: number, memberId: number): Promise<void> {
  return apiClient.post(WORKSPACE_MEMBER(workspaceId, memberId)).then(() => undefined);
}

export function removeWorkspaceMember(workspaceId: number, memberId: number): Promise<void> {
  return apiClient.delete(WORKSPACE_MEMBER(workspaceId, memberId)).then(() => undefined);
}

export function createColumn(workspaceId: number, name: string): Promise<WorkspaceColumn> {
  return apiClient
    .post<WorkspaceColumn>(COLUMNS_LIST, { name, workspace_id: workspaceId })
    .then((r) => r.data);
}

export function createCard(payload: CardPayload): Promise<WorkspaceCard> {
  return apiClient.post<WorkspaceCard>(CARDS_LIST, payload).then((r) => r.data);
}

export function completeCard(id: number): Promise<void> {
  return apiClient.post(CARD_COMPLETE(id)).then(() => undefined);
}

export function uncompleteCard(id: number): Promise<void> {
  return apiClient.post(CARD_UNCOMPLETE(id)).then(() => undefined);
}

// Toggle a card's completion in one call — mirrors the board checkbox.
export function toggleCardComplete(card: WorkspaceCard): Promise<void> {
  return card.is_completed ? uncompleteCard(card.id) : completeCard(card.id);
}

// ── Mutation hooks ──────────────────────────────────────────────────────────
// Each invalidates the whole projects subtree on success (one call refreshes
// the list, any open board detail and its per-column cards via the
// hierarchical key).
export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateWorkspace(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkspacePayload) => updateWorkspace(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useCreateColumn(workspaceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createColumn(workspaceId, name),
    // New column shows up under the workspace detail (which carries columns).
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.detail(workspaceId) }),
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CardPayload) => createCard(payload),
    // New card belongs to a single column — refresh just that column's list.
    onSuccess: (_data, payload) =>
      qc.invalidateQueries({ queryKey: projectKeys.cards(payload.column_id) }),
  });
}

export function useToggleCardComplete() {
  const qc = useQueryClient();
  return useMutation({
    // The caller passes the column the card is rendered in — the board reads
    // cards via `columnCardsQuery(col.id)`, and the `card.column_id` field is
    // not guaranteed to come back on that response, so we invalidate off the
    // column the mutation was invoked from rather than trusting the card.
    mutationFn: ({ card }: { card: WorkspaceCard; columnId: number }) => toggleCardComplete(card),
    onSuccess: (_data, { columnId }) =>
      qc.invalidateQueries({ queryKey: projectKeys.cards(columnId) }),
  });
}
