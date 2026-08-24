import type { Letter, User } from '../types';
import { canActAsChancellery, canApproveTripForBranch, isBranchHr, isSiteMasterAdmin } from './roles';

// ─────────────────────────────────────────────────────────────────────────────
// Business-trip (xizmat safari) action helpers. Action gating (submit / approve)
// reads the server-computed letter.available_actions flags — the client does not
// re-derive trip rights (it does not know the branch trip_approver). See the
// backend _available_actions. This file stays self-contained (no import from
// letterStatus.ts) so the dependency arrow is strictly one-way.
// ─────────────────────────────────────────────────────────────────────────────

// The employee may send a trip draft into the flow. Purely the server flag —
// the backend already checked creator + draft + (NEW-flow attachment).
export function canSubmitTrip(l: Letter): boolean {
  return !!l.available_actions?.can_submit_trip;
}

// Leadership approvals. Each reads its OWN server flag; the backend already
// checked the trip_approver / deputy rights + the required status/flow. The
// statuses are mutually exclusive, so at most one is ever true on a letter.
//
// ⚠️ `canApproveTrip` OLIB TASHLANDI: backend `/approve-trip` marshrutini ham,
// `available_actions.can_approve_trip` bayrog'ini ham olib tashlagan (safar
// oqimi yagona). Bayroq hech qachon kelmagani uchun tugma chiqmasdi, chaqirilsa
// esa 404 bo'lardi.
/**
 * DEVONXONA ro'yxatga olgach RAHBAR tasdig'i (registered_pending_rahbar →
 * management_approved). Buning uchun backend available_actions bayrog'i
 * BERMAYDI, shu bois web bilan bir xil qoida mijozda takrorlanadi:
 * status + (xodim TANLAGAN rahbariyat imzolovchisi YOKI filial safar
 * tasdiqlovchisi YOKI master-admin).
 */
export function canApproveTripRegistration(
  l: Letter,
  user: User | null | undefined,
  employeeId?: number | null,
): boolean {
  if (l.letter_type !== 'business_trip' || l.status !== 'registered_pending_rahbar') return false;
  const isChosenManagement = (l.assigned_signers ?? []).some(
    (s) => s.signer_type === 'management'
      && employeeId != null
      && Number(s.employee_id ?? s.employee?.id) === Number(employeeId),
  );
  return isChosenManagement || canApproveTripForBranch(user, l.organization_branch_id);
}

export function canApproveReport(l: Letter): boolean {
  return !!l.available_actions?.can_approve_report;
}
export function canApproveGuvohnoma(l: Letter): boolean {
  return !!l.available_actions?.can_approve_guvohnoma;
}

// Reject a letter in the signing queue — an assigned signer, decided server-side.
// The flag is general (the backend returns it for any letter; it is false for
// application/explanatory, which use the agree/disagree flow), so in practice it
// is only true for a trip. Separate from canSignLetter so the reject button is
// not tied to the sign gate.
export function canRejectLetter(l: Letter): boolean {
  return !!l.available_actions?.can_reject;
}


// ── DEVONXONA / KADR amallari (web LetterDetailModal bilan 1:1) ──────────────

/**
 * Devonxona hujjatni QAYTARADI (sabab majburiy). Backend `return_letter`:
 * `_can_register` (filial devonxonasi) — ISTALGAN bosqichda, muhr/ro'yxat
 * bekor bo'ladi. Rad etilgan/bekor qilingan hujjatda ma'nosi yo'q.
 */
export function canReturnLetter(l: Letter, user?: User | null): boolean {
  if (['rejected', 'cancelled', 'draft'].includes(l.status ?? '')) return false;
  return isSiteMasterAdmin(user) || canActAsChancellery(user, l.organization_branch_id);
}

/** Devonxona hujjatni ro'yxatdan O'CHIRADI (web: isChancellery bo'lsa doim). */
export function canDeleteLetter(l: Letter, user?: User | null): boolean {
  return isSiteMasterAdmin(user) || canActAsChancellery(user, l.organization_branch_id);
}

/**
 * Devonxona safar HISOBOTINI qaytaradi — web `canReturnTripReport`:
 * xizmat safari + `report_submitted`.
 */
export function canReturnTripReport(l: Letter, user?: User | null): boolean {
  if (l.letter_type !== 'business_trip' || l.status !== 'report_submitted') return false;
  return isSiteMasterAdmin(user) || canActAsChancellery(user, l.organization_branch_id);
}

/**
 * KADR safarni BEKOR qiladi — web `canCancelTrip` + rol darvozasi:
 * yakunlanmagan har qanday bosqichda, KADR "Keldi" tasdig'idan OLDIN, va faqat
 * UY (kelib chiqqan) filial KADR'i (borish filiali HR'i emas).
 */
export function canCancelTrip(l: Letter, user?: User | null): boolean {
  if (l.letter_type !== 'business_trip') return false;
  if (l.is_trip_confirmed) return false;
  if (['report_approved', 'cancelled'].includes(l.status ?? '')) return false;
  return isSiteMasterAdmin(user) || isBranchHr(user, l.organization_branch_id);
}
