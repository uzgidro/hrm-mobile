import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FOLDERS_LIST, FILES_LIST } from '@/api/urls';
import type { DocumentFolder, HrmFile } from '@/types';

// Hierarchical query keys — invalidating `documentKeys.all` refreshes both the
// folder list and the root-files list (prefix match). Same per-feature
// queryOptions pattern as `visitors` (key + queryFn colocated).
export const documentKeys = {
  all: ['documents'] as const,
  folders: () => [...documentKeys.all, 'folders'] as const,
  root: () => [...documentKeys.all, 'root'] as const,
};

// The list endpoints return either a bare array or an { items } envelope.
function unwrapList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : ((data as { items?: T[] })?.items ?? [])) as T[];
}

// Flat folders, each embedding its own files[] inline (no per-folder fetch).
// The backend scopes the list by branch/visibility, so this returns only what
// the caller may see.
export function foldersQuery() {
  return queryOptions({
    queryKey: documentKeys.folders(),
    queryFn: () =>
      apiClient.get(FOLDERS_LIST).then((r) => unwrapList<DocumentFolder>(r.data)),
    staleTime: 60 * 1000,
  });
}

// Root (folder-less) files. The backend maps folder_id=0 to folder_id IS NULL.
export function rootFilesQuery() {
  return queryOptions({
    queryKey: documentKeys.root(),
    queryFn: () =>
      apiClient
        .get(FILES_LIST, { params: { folder_id: 0 } })
        .then((r) => unwrapList<HrmFile>(r.data)),
    staleTime: 60 * 1000,
  });
}
