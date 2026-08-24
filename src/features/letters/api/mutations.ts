import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  LETTER_CREATE, LETTER_SIGN, LETTER_REJECT, LETTER_UPLOAD_ATTACHMENT,
  LETTER_SUBMIT_REPORT, LETTER_RESET_REPORT, LETTER_UPLOAD_REPORT,
  LETTER_CONFIRM_RETURN, LETTER_SELF_CONFIRM_RETURN, LETTER_RETURN_DATE, LETTER_SUBMIT_TRIP,
  LETTER_APPROVE_TRIP_REGISTRATION,
  LETTER_APPROVE_REPORT, LETTER_APPROVE_GUVOHNOMA,
  LETTER_CONFIRM_REGISTRATION,
  LETTER_AGREE, LETTER_DISAGREE, LETTER_SUBMIT_AGREEMENT, LETTER_SEND_TO_REGISTRY,
  LETTER_RETURN, LETTER_RETURN_REPORT, LETTER_CANCEL_TRIP, LETTER_DETAIL,
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

// ── Xodimning O'ZI safarni yakunlashi (Face ID) ───────────────────────────────
// KADR "Keldi" tugmasining xodim tomonidagi juftligi (backend 2026-08-19).
// ODATDA TANASIZ POST: qaytish sanasini SERVER o'zi qo'yadi — u xodim o'z
// filiali turniketidan (Face ID) o'tgan sana; mijoz yuborgan sana e'tiborga
// OLINMAYDI. Server sharti bajarilmasa 400 `face_id_required` qaytadi.
//
// ISTISNO (backend 2026-08-21): SODDALASHTIRILGAN tartibdagi xodim (rais va
// yordamchilari) turniketdan o'tmasligi mumkin — u holda `self_finish_date`
// bo'sh keladi va sanani XODIMNING O'ZI belgilaydi. Faqat SHU holatda sana
// yuboriladi (web'dagi bilan bir xil qoida).
export function selfConfirmReturn(id: number, returnDate?: string | null): Promise<unknown> {
  const body = returnDate ? { return_date: returnDate } : {};
  return apiClient.post(LETTER_SELF_CONFIRM_RETURN(id), body).then((r) => r.data);
}

export function useSelfConfirmReturn(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (returnDate?: string | null) => selfConfirmReturn(id, returnDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

// ── KADR kelgan sanani TUZATADI (backend 2026-08-19) ─────────────────────────
// "Keldi" sanani BIR MARTA qo'yadi; bu esa keyingi tuzatish uchun — guvohnoma va
// tabel xato sana bilan qolib ketmasin. Har qanday bosqichda ishlaydi (yakunlangan
// safarda ham). Server tekshiradi: kelajakdagi va safar boshlanishidan oldingi
// sana 400 beradi.
export function updateReturnDate(id: number, returnDate: string): Promise<unknown> {
  return apiClient.patch(LETTER_RETURN_DATE(id), { return_date: returnDate }).then((r) => r.data);
}

export function useUpdateReturnDate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (returnDate: string) => updateReturnDate(id, returnDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

// ── BILDIRGI/ARIZA kelishuv oqimi ───────────────────────────────────────────
// Bu hujjatlar IMZOLANMAYDI: backend `/sign` ga 400 `use_agreement_flow` beradi.
// Kelishuvchi agree/disagree qiladi va IZOH MAJBURIY (static.uz talabi —
// `LetterAgreementAction.comment` min_length=1), shu bois bo'sh izoh bilan
// so'rov umuman yuborilmaydi.
export function agreeLetter(id: number, comment: string): Promise<unknown> {
  return apiClient.post(LETTER_AGREE(id), { comment }).then((r) => r.data);
}

export function disagreeLetter(id: number, comment: string): Promise<unknown> {
  return apiClient.post(LETTER_DISAGREE(id), { comment }).then((r) => r.data);
}

// Muallif qoralamani kelishuvchilarga yuboradi: draft → pending_agreement
// (kelishuvchisiz bildirgi — to'g'ridan ro'yxatga).
export function submitAgreementLetter(id: number): Promise<unknown> {
  return apiClient.post(LETTER_SUBMIT_AGREEMENT(id)).then((r) => r.data);
}

// Hammasi kelishgach muallif hujjatni DEVONXONAGA yuboradi.
export function sendLetterToRegistry(id: number): Promise<unknown> {
  return apiClient.post(LETTER_SEND_TO_REGISTRY(id)).then((r) => r.data);
}

export function useAgreeLetter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agreed, comment }: { agreed: boolean; comment: string }) =>
      (agreed ? agreeLetter : disagreeLetter)(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useSubmitAgreement(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => submitAgreementLetter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useSendToRegistry(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sendLetterToRegistry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

// ── Devonxona confirm-registration (Tasdiqlash) ───────────────────────────────
// A stamped bildirgi/ariza/xizmat safari waits at pending_registration until the
// chancellery confirms it. Both fields are optional — an empty value keeps the
// auto-assigned number/date; a changed number re-draws the stamp and is
// duplicate-checked server-side. Agreement → registered; trip → management_approved.
export interface ConfirmRegistrationForm {
  registered_number?: string | null;
  registered_date?: string | null;
}

export function confirmRegistration(id: number, form: ConfirmRegistrationForm): Promise<unknown> {
  const body: Record<string, unknown> = {};
  if (form.registered_number != null && form.registered_number !== '') body.registered_number = form.registered_number;
  if (form.registered_date) body.registered_date = form.registered_date;
  return apiClient.post(LETTER_CONFIRM_REGISTRATION(id), body).then((r) => r.data);
}

export function useConfirmRegistration(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ConfirmRegistrationForm) => confirmRegistration(id, form),
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

// ── Leadership approvals (xizmat safari) ──────────────────────────────────────
// Bare POSTs, no body. Whether the current user may call each is decided by the
// backend and surfaced as letter.available_actions.can_approve_* (see tripStatus)
// — the client only shows the button; the backend still 403s on every call.

// Devonxona ro'yxatga olgandan keyingi RAHBAR tasdig'i
// (registered_pending_rahbar → management_approved). Backend ruxsatni
// `_is_trip_approver` bilan tekshiradi: xodim TANLAGAN rahbariyat imzolovchisi
// yoki filialga biriktirilgan direktor/o'rinbosar (asosiy filialda — qat'iy
// lavozim). Mijoz tomonidagi darvoza `canApproveTripRegistration` da.
export function approveTripRegistration(id: number): Promise<unknown> {
  return apiClient.post(LETTER_APPROVE_TRIP_REGISTRATION(id)).then((r) => r.data);
}
export function approveReport(id: number): Promise<unknown> {
  return apiClient.post(LETTER_APPROVE_REPORT(id)).then((r) => r.data);
}
export function approveGuvohnoma(id: number): Promise<unknown> {
  return apiClient.post(LETTER_APPROVE_GUVOHNOMA(id)).then((r) => r.data);
}

export function useApproveReport(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => approveReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}
export function useApproveGuvohnoma(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => approveGuvohnoma(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

// ── DEVONXONA / KADR amallari ────────────────────────────────────────────────
// Bularning uchtasi ham mobilда umuman yo'q edi (webda tugmalari bor):
// devonxona hujjatni ham, hisobotni ham qaytara olmasdi va hujjatni o'chira
// olmasdi; KADR esa safarni bekor qila olmasdi.

/** Devonxona hujjatni yaratuvchiga QAYTARADI — sabab MAJBURIY (backend min_length=1). */
export function returnLetter(id: number, reason: string): Promise<unknown> {
  return apiClient.post(LETTER_RETURN(id), { reason }).then((r) => r.data);
}

/** Devonxona safar HISOBOTINI qaytaradi — sabab MAJBURIY. */
export function returnReport(id: number, reason: string): Promise<unknown> {
  return apiClient.post(LETTER_RETURN_REPORT(id), { reason }).then((r) => r.data);
}

/** KADR safarni BEKOR qiladi — sabab IXTIYORIY (bo'sh izoh yuborilmaydi). */
export function cancelTrip(id: number, reason?: string | null): Promise<unknown> {
  const trimmed = (reason ?? '').trim();
  return apiClient.post(LETTER_CANCEL_TRIP(id), trimmed ? { reason: trimmed } : {}).then((r) => r.data);
}

/** Devonxona hujjatni ro'yxatdan O'CHIRADI (har bosqichda). */
export function deleteLetter(id: number): Promise<unknown> {
  return apiClient.delete(LETTER_DETAIL(id)).then((r) => r.data);
}

export function useReturnLetter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => returnLetter(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useReturnReport(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => returnReport(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useCancelTrip(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string | null) => cancelTrip(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}

export function useDeleteLetter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteLetter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: letterKeys.all }),
  });
}
