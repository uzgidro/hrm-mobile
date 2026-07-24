import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  LETTER_CREATE, LETTER_SIGN, LETTER_REJECT, LETTER_UPLOAD_ATTACHMENT,
  LETTER_SUBMIT_REPORT, LETTER_RESET_REPORT, LETTER_UPLOAD_REPORT,
  LETTER_CONFIRM_RETURN, LETTER_SUBMIT_TRIP,
} from '@/api/urls';
import type { PickedFile } from '@/components/AttachmentField';
import { letterKeys } from './queries';

export interface ConfirmReturnForm {
  return_date: string;
  note?: string | null;
}

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

// ── Business-trip report (xizmat safari, OLD flow) ────────────────────────────
// Plain-form submission: the employee types date/summary/task/content and the
// backend builds the DOCX server-side. report_number is NEVER sent (auto). Empty
// optional fields go out as null (web LetterReportDrawer parity); report_content
// is the required body (the caller/UI enforces non-empty).
export interface ReportForm {
  report_date?: string;
  report_summary?: string;
  report_task?: string;
  report_content: string;
}

export function submitReport(id: number, form: ReportForm): Promise<unknown> {
  const body = {
    report_date: form.report_date || null,
    report_summary: form.report_summary || null,
    report_task: form.report_task || null,
    report_content: form.report_content,
  };
  return apiClient.post(LETTER_SUBMIT_REPORT(id), body).then((r) => r.data);
}

// Re-open a submitted report for editing (report_submitted → management_approved).
export function resetReport(id: number): Promise<unknown> {
  return apiClient.post(LETTER_RESET_REPORT(id)).then((r) => r.data);
}

// Optional: attach a single file report instead of / in addition to the text
// (same multipart shape as the letter attachment upload).
export function uploadReport(id: number, file: PickedFile): Promise<unknown> {
  const fd = new FormData();
  fd.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as unknown as Blob);
  return apiClient
    .post(LETTER_UPLOAD_REPORT(id), fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
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

export function useSubmitReport(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ReportForm) => submitReport(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useResetReport(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resetReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

// ── Business-trip movements + return confirmation ─────────────────────────────
// confirm-return sets is_trip_confirmed on the backend, which unblocks the
// report stage (canSubmitReport in letterStatus). note is normalized to null so
// an empty input matches the web's omitted-optional behavior.
export function confirmReturn(id: number, form: ConfirmReturnForm): Promise<unknown> {
  return apiClient
    .post(LETTER_CONFIRM_RETURN(id), { return_date: form.return_date, note: form.note ?? null })
    .then((r) => r.data);
}

export function useConfirmReturn(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ConfirmReturnForm) => confirmReturn(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

// ── Business-trip submit (xodim "Yuborish": draft → pending) ──────────────────
// Bare POST, no body — the backend generates the number/date (and, for the NEW
// flow, the guvohnoma) server-side. The client never enters a manual decree
// number, so the NEW-flow attachment requirement never applies here.
export function submitTrip(id: number): Promise<unknown> {
  return apiClient.post(LETTER_SUBMIT_TRIP(id)).then((r) => r.data);
}

export function useSubmitTrip(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => submitTrip(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}
