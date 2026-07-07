import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LETTER_CREATE, LETTER_SIGN, LETTER_REJECT, LETTER_UPLOAD_ATTACHMENT } from '@/api/urls';
import type { PickedFile } from '@/components/AttachmentField';
import { letterKeys } from './queries';

// ── Sign / reject request functions (pure; unit-testable without React) ───────
// Both are a bare POST with NO body — exactly what the old letter-detail
// `run()` closures issued (`apiClient.post(LETTER_SIGN(id))`).

export function signLetter(id: number): Promise<unknown> {
  return apiClient.post(LETTER_SIGN(id)).then((r) => r.data);
}

export function rejectLetter(id: number): Promise<unknown> {
  return apiClient.post(LETTER_REJECT(id)).then((r) => r.data);
}

// ── Create ────────────────────────────────────────────────────────────────────
// The letter payload is loosely typed on the backend (its shape depends on the
// letter_type); the create screen assembles it. We keep it as a record so no
// field is dropped.
export type CreateLetterPayload = Record<string, unknown>;

// Creates the letter, then (best-effort) uploads a single attachment as
// multipart to the upload-attachment endpoint — preserving the old screen's
// exact FormData (single `file` field, LETTER_UPLOAD_ATTACHMENT flow) and the
// behavior where a failed upload does NOT fail create. `onFilesError` lets the
// caller surface the "Xat saqlandi, lekin ilova yuklanmadi" note.
export async function createLetter(
  payload: CreateLetterPayload,
  files: PickedFile[] = [],
  onFilesError?: () => void
): Promise<number> {
  const res = await apiClient.post(LETTER_CREATE, payload);
  const letterId = res.data.id;
  if (files.length) {
    const f = files[0];
    const fd = new FormData();
    fd.append('file', {
      uri: f.uri,
      name: f.name,
      type: f.mimeType || 'application/octet-stream',
    } as unknown as Blob);
    try {
      await apiClient.post(LETTER_UPLOAD_ATTACHMENT(letterId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch {
      onFilesError?.();
    }
  }
  return letterId;
}

// ── Thin mutation hooks ───────────────────────────────────────────────────────
// Each invalidates the whole letter subtree on success (one call refreshes the
// list and any open detail via the hierarchical key). The detail screen uses
// `useLetterActions` for its busy/Alert orchestration; these remain available
// for callers that only need fire-and-invalidate.

export function useSignLetter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => signLetter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useRejectLetter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => rejectLetter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useCreateLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { payload: CreateLetterPayload; files?: PickedFile[]; onFilesError?: () => void }) =>
      createLetter(args.payload, args.files, args.onFilesError),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}
