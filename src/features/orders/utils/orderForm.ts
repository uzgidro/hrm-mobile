// Pure form logic of the create/edit-order (buyruq) screen.
//
// It lives outside the screen so the rules that decide what the backend
// receives — which departments are seeded into the "tanishuvchilar" picker,
// which validation fires first, and which fields are create-only — can be
// unit-tested without rendering React (hooks cannot be tested under RNTL 14).
// Everything here mirrors web v1's `AddOrderDrawer.jsx`, which is the parity
// reference for this form.
import type { OrderAct } from '@/types';
import type { CreateOrderPayload } from '../api/mutations';

export type OrderApprover = { employee_id: number; can_edit_document: boolean };

export interface OrderFormValues {
  categoryId: number | null;
  summary: string;
  description: string;
  submitterId: number | null;
  leadershipId: number | null;
  familiarizerDeptIds: number[];
  approvers: OrderApprover[];
  // KADR-only, create-only (see `buildCreateOrderPayload`). Free TEXT: a decree
  // number is not necessarily numeric ("125/2026-QQ" is valid), so it is never
  // coerced with Number() — v1 did that once and turned every lettered number
  // into NaN.
  actNumber: string;
  actDate: string | null;
}

// Which visual field an error belongs to, so the screen can put the message
// under the offending input instead of only raising a modal alert.
export type OrderFormField =
  | 'category' | 'description' | 'approvers' | 'leadership' | 'actNumber' | 'form';

export interface OrderFormError {
  field: OrderFormField;
  // Key inside the `orders` i18n namespace (the screen calls t(`orders.${key}`)).
  messageKey: string;
}

export interface OrderFormValidationContext {
  branchId?: number | null;
  // The decree number/date pair is only rendered for KADR on CREATE, so its
  // "band" (taken) state may only block the submit while it is on screen.
  numberFieldShown: boolean;
  numberTaken: boolean;
}

// GET /order-acts/{id} (OrderActReadFull) carries the already-uploaded
// attachments in `documents`, but the shared `OrderAct` type does not declare
// them yet; narrow locally rather than reaching into another owner's file.
export interface OrderAttachedDocument {
  id: number;
  document_objectname?: string | null;
  file_path?: string | null;
}
export type OrderActWithDocuments = OrderAct & {
  documents?: OrderAttachedDocument[] | null;
};

const uniqueNumbers = (ids: (number | null | undefined)[]): number[] =>
  Array.from(new Set(ids.filter((v): v is number => typeof v === 'number')));

/**
 * Seed the "Buyruq bilan tanishuvchilar" picker of the EDIT form.
 *
 * `familiarizer_departments` is the field the form actually writes back
 * (`familiarizer_department_ids`), and it is the one v1 reads
 * (AddOrderDrawer.jsx:245). The per-EMPLOYEE `familiarizers` rows are a
 * DERIVED, later artefact: the backend only materialises them once the decree
 * reaches `confirmed` (`assign_familiarizers` 400s before that). Seeding from
 * them left the picker empty on every draft / pending / changes_requested
 * decree, and because the backend treats `familiarizer_department_ids` as a
 * FULL REPLACE, the following PATCH silently erased the saved departments.
 *
 * The `familiarizers` path stays only for a response that omits the field
 * entirely (`null`/`undefined` — an older backend or a stale cached payload).
 * An empty ARRAY is authoritative and must NOT fall through: a decree whose
 * familiarizers were assigned by employee id (no departments at all) would
 * otherwise get their departments injected and the save would widen the
 * acknowledgement list to whole departments nobody asked for.
 */
export function seedFamiliarizerDeptIds(order?: OrderAct | null): number[] {
  const departments = order?.familiarizer_departments;
  if (departments != null) return uniqueNumbers(departments.map((d) => d.id));
  return uniqueNumbers((order?.familiarizers ?? []).map((f) => f.employee?.department?.id));
}

// Existing attachments of an order, minus the GENERATED decree document.
// Files whose object name starts with `decree_` are produced by the backend
// document generator (and opened through the OnlyOffice screen), not uploaded
// by a person — v1 filters them out of the attachment list the same way
// (AddOrderDrawer.jsx:250) so the user only sees what they themselves attached.
export function existingOrderDocuments(order?: OrderActWithDocuments | null): OrderAttachedDocument[] {
  return (order?.documents ?? []).filter(
    (d) => !(d.document_objectname ?? '').startsWith('decree_'),
  );
}

const filledApprovers = (approvers: OrderApprover[]): OrderApprover[] =>
  (approvers ?? []).filter((a) => !!a?.employee_id);

/**
 * All blocking checks of the form, in the order v1 applies them.
 *
 * Returns the FIRST failure (or null) — one message at a time keeps the alert
 * and the inline field error in agreement.
 */
export function validateOrderForm(
  values: OrderFormValues,
  ctx: OrderFormValidationContext,
): OrderFormError | null {
  if (!values.categoryId) return { field: 'category', messageKey: 'categoryRequired' };
  if (!values.description.trim()) return { field: 'description', messageKey: 'descriptionRequired' };

  // Web parity (AddOrderDrawer, c66c2af) + backend 7b3326f: decree/submit 400s
  // `approver_required` — without at least one kelishuvchi the decree would skip
  // the agreement/sign stages straight to 'approved'.
  const approvers = filledApprovers(values.approvers);
  if (!approvers.length) return { field: 'approvers', messageKey: 'approverRequired' };

  // The KIRITUVCHI (submitter) introduces the decree and confirms it; agreement
  // is meant to be an INDEPENDENT control, so the same person cannot be both.
  // The backend rejects it with `submitter_cannot_be_approver` — catching it
  // here saves a full round trip on an otherwise complete form
  // (AddOrderDrawer.jsx:384-392).
  if (values.submitterId && approvers.some((a) => a.employee_id === values.submitterId)) {
    return { field: 'approvers', messageKey: 'submitterCannotBeApprover' };
  }

  if (!values.leadershipId) return { field: 'leadership', messageKey: 'leadershipRequired' };

  // An EMPTY number is allowed (the backend assigns one later); only a number
  // already taken in this branch is refused, and the live check has told us so
  // while the user was still typing.
  if (ctx.numberFieldShown && values.actNumber.trim() && ctx.numberTaken) {
    return { field: 'actNumber', messageKey: 'actNumberTaken' };
  }

  if (!ctx.branchId) return { field: 'form', messageKey: 'branchNotFound' };
  return null;
}

// `assigned_signers` mixes both signer kinds in one list, approvers first and
// the single leadership signer last — the order the backend stores and v1 sends.
function buildAssignedSigners(values: OrderFormValues): CreateOrderPayload['assigned_signers'] {
  return [
    ...filledApprovers(values.approvers).map((a) => ({
      employee_id: a.employee_id,
      signer_type: 'approver',
      can_edit_document: a.can_edit_document,
    })),
    ...(values.leadershipId
      ? [{ employee_id: values.leadershipId, signer_type: 'leadership', can_edit_document: false }]
      : []),
  ];
}

// The fields both create and edit send. `familiarizer_department_ids` is always
// present because the backend does a full replace on it.
function buildBasePayload(values: OrderFormValues): Omit<CreateOrderPayload, 'organization_branch_id'> {
  return {
    category_id: values.categoryId as number,
    summary: values.summary.trim() || null,
    description: values.description.trim(),
    submitter_id: values.submitterId || null,
    familiarizer_department_ids: values.familiarizerDeptIds,
    assigned_signers: buildAssignedSigners(values),
  };
}

/**
 * POST /order-acts body.
 *
 * `act_number` / `act_date` are sent ONLY here and ONLY for KADR: a KADR decree
 * has no devonxona (chancellery) step, so nobody else would ever assign its
 * number — while an employee decree gets its number from the devonxona at
 * registration. On PATCH the backend deliberately ignores both fields (they are
 * changed through the detail screen's stamp action), so sending them from the
 * edit form would be a silent no-op.
 */
export function buildCreateOrderPayload(
  values: OrderFormValues,
  ctx: { branchId: number; creatorRole: 'hr' | 'employee' },
): CreateOrderPayload {
  return {
    ...buildBasePayload(values),
    organization_branch_id: ctx.branchId,
    ...(ctx.creatorRole === 'hr'
      ? { act_number: values.actNumber.trim() || null, act_date: values.actDate || null }
      : {}),
  };
}

// PATCH /order-acts/{id} body. OWNERSHIP never changes on edit, so the branch
// is not resent (v1 omits it too).
export function buildUpdateOrderPayload(values: OrderFormValues): Partial<CreateOrderPayload> {
  return buildBasePayload(values);
}
