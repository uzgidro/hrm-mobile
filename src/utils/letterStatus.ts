import i18n from '../i18n';
import type { Letter, LetterSigner, User } from '../types';
import type { StatusKind } from './orderStatus';
import { statusColor } from './orderStatus';
import { canActAsChancellery, isSiteMasterAdmin } from './roles';

export { statusColor };

// i18n note (same trade-off as orderStatus.ts): the letter-type CODES (the
// Record keys: 'bildirgi', 'application', 'business_trip', …) are contract
// identifiers and are NOT translated. Only the displayed labels are localized.
// The map holds `labelKey`s (dotted paths into the `status` namespace) and the
// concrete label is resolved via i18n.t() at call time so it follows the
// current language. Several distinct codes ('bildirgi'/'explanatory'/…) map to
// the same label key — that mirrors the original 1:many code→label mapping.
export const LETTER_TYPE_LABELS: Record<string, string> = {
  bildirgi: 'status.letterTypeNotification',
  explanotary: 'status.letterTypeNotification',
  explanatory: 'status.letterTypeNotification',
  notification: 'status.letterTypeNotification',
  application: 'status.letterTypeApplication',
  business_trip: 'status.letterTypeBusinessTrip',
};

export function letterTypeLabel(type?: string): string {
  const key = LETTER_TYPE_LABELS[type ?? ''];
  if (key) return i18n.t(key);
  return type || i18n.t('status.letterTypeDefault');
}

export function normalizeLetterType(type?: string): string {
  if (type === 'bildirgi' || type === 'explanotary' || type === 'explanatory' || type === 'notification') return 'explanatory';
  if (type === 'application') return 'application';
  if (type === 'business_trip') return 'business_trip';
  return type || '';
}

function sid(s?: LetterSigner): number | null {
  if (!s) return null;
  return s.employee_id ?? s.employee?.id ?? null;
}
function eq(a?: number | null, b?: number | null) {
  return a != null && b != null && Number(a) === Number(b);
}

export function getMainSigner(l: Letter) {
  return (l.assigned_signers ?? []).find((s) => s.signer_type === 'main');
}
export function getOrdinarySigners(l: Letter) {
  return (l.assigned_signers ?? []).filter((s) => s.signer_type === 'ordinary');
}
export function getManagementSigners(l: Letter) {
  return (l.assigned_signers ?? []).filter((s) => s.signer_type === 'management');
}

function isApplication(l: Letter) { return normalizeLetterType(l.letter_type) === 'application'; }
function isBusinessTrip(l: Letter) { return normalizeLetterType(l.letter_type) === 'business_trip'; }

// ── Business-trip report stage (xizmat safari, OLD flow only) ──────────────────
// flow_version 2 = NEW flow (main branch): XODIM→KADR→RAHBAR→BUXGALTERIYA, with
// NO report substage. 1 / null / undefined = OLD flow, which has the report
// stage. Mirrors backend _is_new_trip_flow (letter.py:45).
export function isNewTripFlow(l: Letter): boolean {
  return isBusinessTrip(l) && l.flow_version === 2;
}

// Statuses a trip is in while the employee may submit/edit a report.
const REPORT_SUBMITTABLE_STATUSES = ['management_approved', 'report_submitted', 'report_returned'];

// OLD-flow trip statuses from which the management (rahbariyat) approval is
// considered done in the timeline — the approval isn't recorded in `signers`, so
// it's derived from the trip having advanced past registration. Mirrors the web
// getLetterSigningTimeline mgmtApproved list (helpers.js:300).
const TRIP_MGMT_APPROVED_STATUSES = [
  'management_approved', 'report_submitted', 'report_management_review',
  'report_approved', 'extension_review',
];

function isTripAuthor(l: Letter, employeeId?: number | null): boolean {
  if (!employeeId) return false;
  return eq(l.creator_employee_id, employeeId) || eq(l.submitter_id, employeeId);
}

export function isReportReturned(l: Letter): boolean {
  return l.status === 'report_returned';
}

// Web helpers.js:640 (canSubmitReport) parity: OLD-flow business trip; status in
// [management_approved, report_submitted, report_returned]; on management_approved
// arrival must be confirmed (is_trip_confirmed) — else the backend 400s
// arrival_not_confirmed; and the caller must be the trip's creator or submitter.
export function canSubmitReport(l: Letter, employeeId?: number | null): boolean {
  if (!isBusinessTrip(l) || isNewTripFlow(l)) return false;
  if (!REPORT_SUBMITTABLE_STATUSES.includes(l.status ?? '')) return false;
  if (l.status === 'management_approved' && !l.is_trip_confirmed) return false;
  return isTripAuthor(l, employeeId);
}

// The author may reset a still-submitted report back to management_approved
// (re-open for editing). Only while report_submitted. (Backend also allows HR;
// the mobile author-only slice is a safe subset.)
export function canResetReport(l: Letter, employeeId?: number | null): boolean {
  if (!isBusinessTrip(l) || isNewTripFlow(l)) return false;
  if (l.status !== 'report_submitted') return false;
  return isTripAuthor(l, employeeId);
}

// Statuses in which the backend still refuses KADR "Keldi" (confirm-return) with
// 400 trip_not_registered — the trip isn't registered by the chancellery yet, or
// it's already finished/terminal. Mirrors the web canConfirmTripReturn exclusion
// list (helpers.js:511).
const TRIP_RETURN_BLOCKED_STATUSES = [
  'draft', 'pending', 'signed', 'pending_registration',
  'report_approved', 'rejected', 'cancelled',
];

// KADR "Keldi" (confirm-return) stage gate — OLD-flow trip only, not yet
// confirmed, and past the chancellery's registration. This is the STAGE half of
// the gate; the caller ANDs it with the manage-right (branch HR) and lets a site
// master-admin bypass the stage, matching the backend (confirm-return allows
// master-admin regardless of status). Mirrors web canConfirmTripReturn.
export function canConfirmTripReturn(l: Letter): boolean {
  if (!isBusinessTrip(l) || isNewTripFlow(l)) return false;
  if (l.is_trip_confirmed) return false;
  return !TRIP_RETURN_BLOCKED_STATUSES.includes(l.status ?? '');
}

export function hasSigned(l: Letter, employeeId?: number | null) {
  if (!employeeId) return false;
  return (l.signers ?? []).some((s) => eq(sid(s), employeeId));
}
export function hasRejected(l: Letter, employeeId?: number | null) {
  if (!employeeId) return false;
  return eq(l.reject_by_id, employeeId) || eq(l.rejected_by?.id, employeeId);
}

function isMainRejection(l: Letter) {
  const main = getMainSigner(l);
  if (!main) return false;
  const rid = l.reject_by_id ?? l.rejected_by?.id;
  return rid != null && eq(rid, sid(main));
}

export function isLetterRejected(l: Letter): boolean {
  if (isApplication(l)) return l.status === 'rejected' || Boolean(l.rejected_by || l.reject_by_id);
  return isMainRejection(l);
}

export function isLetterSigned(l: Letter): boolean {
  if (isLetterRejected(l)) return false;
  const assigned = l.assigned_signers ?? [];
  if (!assigned.length) return false;
  if (isApplication(l)) return assigned.every((a) => hasSigned(l, sid(a)));
  const main = getMainSigner(l);
  return main ? hasSigned(l, sid(main)) : false;
}

export function getAssignedRecord(l: Letter, employeeId?: number): LetterSigner | null {
  if (!employeeId) return null;
  return (l.assigned_signers ?? []).find((s) => eq(sid(s), employeeId)) ?? null;
}

export function canSignLetter(l: Letter, employeeId?: number): boolean {
  if (!employeeId) return false;
  if (isLetterRejected(l)) return false;
  const assigned = getAssignedRecord(l, employeeId);
  if (!assigned) return false;
  if (hasSigned(l, employeeId)) return false;

  if (isBusinessTrip(l)) {
    // Only the main signer signs a trip, and only in the OLD flow at 'pending'.
    // The NEW flow is not signed (backend 400s). The management signer never
    // signs — they approve via approve-trip/approve-report, not /sign.
    if (assigned.signer_type === 'main') return l.status === 'pending' && !isNewTripFlow(l);
    return false;
  }
  // BILDIRGI/ARIZA IMZOLANMAYDI — kelishuv oqimi (agree/disagree). Backend
  // `/sign` ga 400 `use_agreement_flow` qaytaradi, ya'ni bu yerdagi eski
  // `if (isApplication(l)) return true` tugmani ko'rsatib, bosilganda xato
  // berardi (web'да bunday tugma umuman yo'q).
  if (isAgreementLetter(l)) return false;
  // Bildirgi: faqat main imzolaydi
  if (assigned.signer_type !== 'main') return false;
  return !isMainRejection(l);
}

// ── Bildirgi/ariza KELISHUV oqimi (web helpers.js bilan 1:1) ────────────────

/** Bildirgi yoki ariza (kelishuv oqimidagi hujjat). */
export function isAgreementLetter(l: Letter): boolean {
  const t = normalizeLetterType(l.letter_type);
  return t === 'application' || t === 'explanatory';
}

/** Hujjatning kelishuvchilari (signer_type='agreement'). */
export function getLetterAgreements(l: Letter): LetterSigner[] {
  return (l.assigned_signers ?? []).filter((a) => a.signer_type === 'agreement');
}

export function getMyAgreementRow(l: Letter, employeeId?: number): LetterSigner | null {
  if (!employeeId) return null;
  return getLetterAgreements(l).find((a) => eq(sid(a), employeeId)) ?? null;
}

/** Hamma kelishuvchilar kelishganmi (kelishuvchi bo'lmasa — ha). */
export function allAgreementsAgreed(l: Letter): boolean {
  const rows = getLetterAgreements(l);
  return rows.length === 0 || rows.every((a) => a.agreed === true);
}

/**
 * Kelishuvchi HOZIR kelisha/rad eta oladimi.
 * `registered` — yakuniy; `review`/`returned` — devonxona bosqichi (kelishuv yopiq).
 */
export function canAgreeLetter(l: Letter, employeeId?: number): boolean {
  if (!isAgreementLetter(l)) return false;
  if (['registered', 'review', 'returned'].includes(l.status ?? '')) return false;
  const row = getMyAgreementRow(l, employeeId);
  return !!row && row.agreed !== true;
}

/** Muallif QORALAMANI kelishuvchilarga yuboradi (draft → pending_agreement). */
export function canSubmitAgreementDraft(l: Letter, employeeId?: number): boolean {
  if (!isAgreementLetter(l)) return false;
  if (l.status !== 'draft') return false;
  if (!isLetterAuthor(l, employeeId)) return false;
  // Arizada kamida bitta kelishuvchi MAJBURIY (backend ham shunday).
  if (normalizeLetterType(l.letter_type) === 'application' && getLetterAgreements(l).length === 0) {
    return false;
  }
  return true;
}

/** Muallif kelishilgan hujjatni DEVONXONAGA yuboradi. */
export function canSendAgreementLetter(l: Letter, employeeId?: number): boolean {
  if (!isAgreementLetter(l)) return false;
  if (!isLetterAuthor(l, employeeId)) return false;
  if (!['pending', 'signed', 'returned'].includes(l.status ?? '')) return false;
  if (normalizeLetterType(l.letter_type) === 'application' && getLetterAgreements(l).length === 0) {
    return false;
  }
  return allAgreementsAgreed(l);
}

function isLetterAuthor(l: Letter, employeeId?: number): boolean {
  if (!employeeId) return false;
  return eq(l.creator_employee_id, employeeId) || eq(l.submitter_id, employeeId);
}

export interface TimelineItem {
  key: string;
  name: string;
  role: string;
  status: 'pending' | 'signed' | 'rejected';
  statusText: string;
}

export function getSigningTimeline(l: Letter): TimelineItem[] {
  const items: TimelineItem[] = [];
  const isAriza = isApplication(l);
  const isTrip = isBusinessTrip(l);

  // Roles and status texts are resolved through i18n.t() at call time so the
  // timeline follows the current language (see the trade-off note above).
  const push = (s: LetterSigner, fallbackRoleKey: string, signedTextKey: string) => {
    const id = sid(s);
    const signed = hasSigned(l, id);
    const rejected = hasRejected(l, id);
    items.push({
      key: `${s.signer_type}-${s.employee_id}`,
      name: s.employee?.legal_name || i18n.t('status.unknown'),
      role: (typeof s.employee?.job_position === 'object' ? s.employee?.job_position?.name : '') || i18n.t(fallbackRoleKey),
      status: signed ? 'signed' : rejected ? 'rejected' : 'pending',
      statusText: signed ? i18n.t(signedTextKey) : rejected ? i18n.t('status.timelineRejected') : i18n.t('status.timelinePending'),
    });
  };

  if (isTrip) {
    // Web parity (helpers.js:294): a trip's management approval is NOT in
    // `signers` (OLD flow doesn't record it there) — it's implied once the letter
    // reaches a post-registration stage. is_stamped alone is not enough while
    // pending_registration (auto number+seal applied, but the chancellery hasn't
    // registered it yet), so that status is explicitly excluded.
    const mgmtApproved =
      l.status !== 'pending_registration' &&
      (l.is_stamped === true || TRIP_MGMT_APPROVED_STATUSES.includes(l.status ?? ''));
    getManagementSigners(l).forEach((s) => {
      const id = sid(s);
      const rejected = hasRejected(l, id);
      const status = mgmtApproved ? 'signed' : rejected ? 'rejected' : 'pending';
      items.push({
        key: `${s.signer_type}-${s.employee_id}`,
        name: s.employee?.legal_name || i18n.t('status.unknown'),
        role: (typeof s.employee?.job_position === 'object' ? s.employee?.job_position?.name : '') || i18n.t('status.roleLeadership'),
        status,
        statusText:
          status === 'signed' ? i18n.t('status.timelineApproved')
          : status === 'rejected' ? i18n.t('status.timelineRejected')
          : i18n.t('status.timelinePending'),
      });
    });
    const main = getMainSigner(l);
    if (main) push(main, 'status.roleChief', 'status.timelineSigned');
    return items;
  }

  getOrdinarySigners(l).forEach((s) =>
    push(s, 'status.roleCoordinator', isAriza ? 'status.timelineSigned' : 'status.timelineAgreed'),
  );
  const main = getMainSigner(l);
  if (main) push(main, 'status.roleSigner', 'status.timelineSigned');
  return items;
}

// i18n note: labels resolved via i18n.t() at call time; the letter status
// CODES compared against ('registered', 'review', 'management_review', …) are
// backend contract identifiers and are NOT translated.
// Devonxona "Tasdiqlash" — a stamped bildirgi / ariza / xizmat safari waits at
// pending_registration (auto number+seal already applied) until the chancellery
// confirms it. Mirrors the web canChancelleryConfirmRegistration: any of the
// three types at pending_registration, and the user may act as devonxona on the
// letter's branch (branch-leader devonxona included) or is the site master-admin.
export function canChancelleryConfirmRegistration(l: Letter, user?: User | null): boolean {
  if (l.status !== 'pending_registration') return false;
  const type = normalizeLetterType(l.letter_type);
  const isAgreementOrTrip = type === 'explanatory' || type === 'application' || type === 'business_trip';
  if (!isAgreementOrTrip) return false;
  return isSiteMasterAdmin(user) || canActAsChancellery(user, l.organization_branch_id);
}

export function letterStatusMeta(l: Letter): { label: string; kind: StatusKind } {
  if (isLetterRejected(l)) return { label: i18n.t('status.letterRejected'), kind: 'error' };
  // Report-stage statuses (business_trip, OLD flow) come AFTER registration, so a
  // report_* trip already has is_stamped=true — check these BEFORE the
  // is_stamped→registered fallthrough or they'd all read "registered".
  switch (l.status) {
    // management_approved is dual-meaning: OLD flow = arrived / awaiting report;
    // NEW flow = awaiting the leadership approve-trip. Show the right label so a
    // leader doesn't see "awaiting report" on a trip they must approve.
    case 'management_approved':
      return isNewTripFlow(l)
        ? { label: i18n.t('status.letterTripLeadershipPending'), kind: 'pending' }
        : { label: i18n.t('status.letterTripArrived'), kind: 'pending' };
    // registered_pending_rahbar waits on the leader; report_guvohnoma_review is a
    // distinct stage (guvohnoma approval by the trip_approver) — keep them apart
    // (web parity: the backend labels them differently).
    case 'registered_pending_rahbar':
      return { label: i18n.t('status.letterTripLeadershipPending'), kind: 'pending' };
    case 'report_guvohnoma_review':
      return { label: i18n.t('status.letterTripGuvohnomaReview'), kind: 'pending' };
    case 'report_submitted': return { label: i18n.t('status.letterReportSubmitted'), kind: 'info' };
    // 'returned' = devonxona (другой филиал) вернул письмо/ариза автору на правку;
    // автор редактирует и пере-отправляет (submit-trip/send_to_registry принимает
    // 'returned'). Web-parity helpers.js:741 → 'Qaytarilgan'.
    case 'returned': return { label: i18n.t('status.letterReturned'), kind: 'error' };
    case 'report_returned': return { label: i18n.t('status.letterReportReturned'), kind: 'error' };
    case 'report_management_review': return { label: i18n.t('status.letterReportReview'), kind: 'pending' };
    case 'report_approved': return { label: i18n.t('status.letterReportApproved'), kind: 'success' };
    // send_to_registry AUTO-assigns raqam/sana/muhr (is_stamped=true) but the
    // devonxona has NOT yet confirmed registration (pending_registration →
    // registered). Must precede the is_stamped→registered fallthrough below, or a
    // stamped-but-unconfirmed letter falsely reads "registered/success". Web
    // parity (backend letter.py:5036 sets it, :5072 keeps is_stamped set).
    // Kelishuvchilar ko'rib chiqmoqda — avval umumiy "Kutilmoqda" chiqardi.
    case 'pending_agreement':
      return { label: i18n.t('status.letterPendingAgreement'), kind: 'pending' };
    case 'pending_registration':
      return { label: i18n.t('status.letterPendingRegistration'), kind: 'pending' };
    // Terminal — the letter/trip was cancelled. Web renders it red "Bekor
    // qilingan" (helpers.js:761, LettersTable badge #FF4D4F). Without this case
    // it fell to the generic pending label and wrongly read as in-progress.
    case 'cancelled':
      return { label: i18n.t('status.letterCancelled'), kind: 'error' };
  }
  if (l.is_stamped || l.status === 'registered' || l.status === 'stamped') return { label: i18n.t('status.letterRegistered'), kind: 'success' };
  if (isLetterSigned(l)) return { label: i18n.t('status.letterSignedStatus'), kind: 'success' };
  if (l.status === 'review') return { label: i18n.t('status.letterInChancellery'), kind: 'info' };
  if (l.status === 'management_review') return { label: i18n.t('status.letterInLeadership'), kind: 'pending' };
  return { label: i18n.t('status.letterPending'), kind: 'pending' };
}
