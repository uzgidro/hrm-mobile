import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  ORDER_ACTS,
  ORDER_ACT_DETAIL,
  ORDER_ACT_DOCUMENTS,
  ORDER_ACT_DECREE_APPROVE,
  ORDER_ACT_DECREE_REJECT,
  ORDER_ACT_DECREE_RESUBMIT,
  ORDER_ACT_DECREE_FORWARD,
  ORDER_ACT_DECREE_SUBMIT,
  ORDER_ACT_DECREE_CONFIRM_SUBMISSION,
  ORDER_ACT_DECREE_REGISTER,
  ORDER_ACT_DECREE_ACKNOWLEDGE,
  ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS,
  ORDER_ACT_COMMENTS,
  ORDER_ACT_DECREE_APPLY,
  ORDER_ACT_DECREE_REMOVAL_CONFIRM,
  ORDER_ACT_DECREE_REMOVAL_REJECT,
  ORDER_ACT_DOCUMENT_DELETE,
} from '@/api/urls';
import type { PickedFile } from '@/components/AttachmentField';
import { orderKeys } from './queries';

// ── Decree workflow request functions (pure; unit-testable without React) ─────
// Each is the exact POST + body the old order-detail runAction closures issued.

export function approveDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_APPROVE(id), {}).then((r) => r.data);
}

export function rejectDecree(id: number, comment: string): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_REJECT(id), { comment }).then((r) => r.data);
}

export function resubmitDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_RESUBMIT(id)).then((r) => r.data);
}

export function forwardDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_FORWARD(id)).then((r) => r.data);
}

// YARATUVCHI qoralamani oqimga yuboradi (draft → pending_submitter/pending_approval).
// Bu amal mobilда umuman yo'q edi: mobilда yaratilgan buyruq DRAFTда qolib,
// uni faqat webdan yuborish mumkin edi.
export function submitDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_SUBMIT(id)).then((r) => r.data);
}

// Kirituvchi shaxs (submitter) tasdig'i — pending_submitter bosqichi.
export function confirmSubmissionDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_CONFIRM_SUBMISSION(id)).then((r) => r.data);
}

export function acknowledgeDecree(id: number): Promise<unknown> {
  return apiClient.post(ORDER_ACT_DECREE_ACKNOWLEDGE(id)).then((r) => r.data);
}

// act_number va act_date IXTIYORIY (backend o'zi qo'yadi). Web devonxona
// SANANI ham tanlaydi (`OrderStampModal`) — mobilда u umuman yuborilmasdi,
// ya'ni ro'yxatga olish sanasini devonxona belgilay olmasdi.
export function registerDecree(
  id: number,
  actNumber?: number,
  actDate?: string,
): Promise<unknown> {
  return apiClient
    .post(ORDER_ACT_DECREE_REGISTER(id), {
      ...(actNumber != null ? { act_number: actNumber } : {}),
      ...(actDate ? { act_date: actDate } : {}),
    })
    .then((r) => r.data);
}

// Replace the whole familiarizer list. The backend does a full replace but never
// drops someone who already acknowledged, so the caller must send the complete
// desired set of employee ids (already-acknowledged ones stay regardless).
export function assignFamiliarizers(id: number, employeeIds: number[]): Promise<unknown> {
  return apiClient
    .post(ORDER_ACT_DECREE_ASSIGN_FAMILIARIZERS(id), { employee_ids: employeeIds })
    .then((r) => r.data);
}

// ── Create ────────────────────────────────────────────────────────────────────
export interface CreateOrderPayload {
  category_id: number;
  summary: string | null;
  description: string;
  submitter_id: number | null;
  familiarizer_department_ids: number[];
  assigned_signers: { employee_id: number; signer_type: string; can_edit_document: boolean }[];
  organization_branch_id: number;
}

// Creates the order-act, then (best-effort) uploads any attached files as
// multipart to the documents endpoint. Returns the new order id. The optional
// `onFilesError` lets the caller surface the exact "saqlandi, lekin fayllar
// yuklanmadi" note the old screen showed while still resolving successfully —
// preserving the original behavior where a failed upload does NOT fail create.
export async function createOrder(
  payload: CreateOrderPayload,
  files: PickedFile[] = [],
  onFilesError?: () => void
): Promise<number> {
  const res = await apiClient.post(ORDER_ACTS, payload);
  const orderId = res.data.id;
  if (files.length) {
    const fd = new FormData();
    files.forEach((f) =>
      fd.append('files', {
        uri: f.uri,
        name: f.name,
        type: f.mimeType || 'application/octet-stream',
      } as unknown as Blob)
    );
    try {
      await apiClient.post(ORDER_ACT_DOCUMENTS(orderId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch {
      onFilesError?.();
    }
  }
  return orderId;
}

// Buyruqqa IZOH qoldirish — buyruqni ko'ra oladigan har kim (status o'zgarmaydi).
export function addOrderComment(id: number, text: string): Promise<unknown> {
  return apiClient.post(ORDER_ACT_COMMENTS(id), { text }).then((r) => r.data);
}

export function useAddOrderComment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => addOrderComment(id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

// ── Tahrirlash (PATCH /order-acts/{id}) ──────────────────────────────────────
// Mobilда buyruqni TAHRIRLASH umuman yo'q edi (webda "Tahrirlash" tugmasi bor):
// "o'zgartirish so'ralgan" (changes_requested) buyruqni telefondan tuzatib
// bo'lmasdi — faqat qayta yuborish mumkin edi. Backend tahrirni devonxona
// ro'yxatga olgunicha qabul qiladi va matn o'zgarsa kelishganlarga ogohlantirish
// yuboradi (imzolar SAQLANADI).
export async function updateOrder(
  id: number,
  payload: Partial<CreateOrderPayload>,
  files: PickedFile[] = [],
  onFilesError?: () => void
): Promise<number> {
  await apiClient.patch(ORDER_ACT_DETAIL(id), payload);
  if (files.length) {
    const fd = new FormData();
    files.forEach((f) =>
      fd.append('files', {
        uri: f.uri,
        name: f.name,
        type: f.mimeType || 'application/octet-stream',
      } as unknown as Blob)
    );
    try {
      await apiClient.post(ORDER_ACT_DOCUMENTS(id), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch {
      onFilesError?.();
    }
  }
  return id;
}

// ── Thin mutation hooks ───────────────────────────────────────────────────────
// Each invalidates the whole order subtree on success (one call refreshes the
// list and any open detail via the hierarchical key). The decree detail screen
// uses `useDecreeActions` instead of these for its busy/Alert orchestration;
// these remain available for callers that only need fire-and-invalidate.

export function useAssignFamiliarizers(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeIds: number[]) => assignFamiliarizers(id, employeeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: number; payload: Partial<CreateOrderPayload>; files?: PickedFile[]; onFilesError?: () => void;
    }) => updateOrder(args.id, args.payload, args.files, args.onFilesError),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { payload: CreateOrderPayload; files?: PickedFile[]; onFilesError?: () => void }) =>
      createOrder(args.payload, args.files, args.onFilesError),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
    // CreateOrderScreen already shows the error via its own Alert in the catch
    // block; skip the global mutation toast so a failed submit isn't surfaced twice.
    meta: { skipErrorToast: true },
  });
}

// KADR buyruqni QO'LLAYDI (`confirmed` -> `applied`). Backend
// `OrderActApplyRequest`: employee_id + start_date majburiy; end_date
// ixtiyoriy (doimiy ko'chirish/ishdan bo'shatish turlarida), is_permanent.
export type DecreeApplyInput = {
  employee_id: number;
  start_date: string;
  end_date?: string | null;
  is_permanent?: boolean;
};

export function decreeApply(id: number, input: DecreeApplyInput) {
  return apiClient
    .post(ORDER_ACT_DECREE_APPLY(id), {
      employee_id: input.employee_id,
      start_date: input.start_date,
      ...(input.end_date ? { end_date: input.end_date } : {}),
      is_permanent: !!input.is_permanent,
    })
    .then((r) => r.data);
}

export function useDecreeApply(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DecreeApplyInput) => decreeApply(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── Ro'yxatdan chiqarilishga javob ──────────────────────────────────────────
// Muallif tasdiqlangan buyruqni tahrirlab kelishuvchini olib tashlamoqchi
// bo'lsa, backend o'sha kelishuvchida `removal_requested` bayrog'ini qo'yadi
// va UNING roziligini kutadi. Mobilда bu javob umuman yo'q edi: kelishuvchi
// mobilда ishlasa, tahrir abadiy kutib qolardi.
export function decreeRemovalConfirm(id: number) {
  return apiClient.post(ORDER_ACT_DECREE_REMOVAL_CONFIRM(id)).then((r) => r.data);
}

export function decreeRemovalReject(id: number) {
  return apiClient.post(ORDER_ACT_DECREE_REMOVAL_REJECT(id)).then((r) => r.data);
}

export function useDecreeRemovalResponse(id: number) {
  const qc = useQueryClient();
  return useMutation({
    // `agree: true` — roziman (safdan chiqaman), `false` — rad etaman.
    mutationFn: (agree: boolean) =>
      (agree ? decreeRemovalConfirm(id) : decreeRemovalReject(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// Ilova hujjatini o'chirish.
export function useDeleteOrderDocument(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: number) =>
      apiClient.delete(ORDER_ACT_DOCUMENT_DELETE(id, docId)).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
