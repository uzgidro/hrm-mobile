import i18n from '../i18n';
import type { Letter, LetterSigner } from '../types';
import type { StatusKind } from './orderStatus';
import { statusColor } from './orderStatus';

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
  if (isApplication(l)) return !isLetterRejected(l);
  // Bildirgi: faqat main imzolaydi
  if (assigned.signer_type !== 'main') return false;
  return !isMainRejection(l);
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
    getManagementSigners(l).forEach((s) => push(s, 'status.roleLeadership', 'status.timelineApproved'));
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
    case 'report_returned': return { label: i18n.t('status.letterReportReturned'), kind: 'error' };
    case 'report_management_review': return { label: i18n.t('status.letterReportReview'), kind: 'pending' };
    case 'report_approved': return { label: i18n.t('status.letterReportApproved'), kind: 'success' };
  }
  if (l.is_stamped || l.status === 'registered' || l.status === 'stamped') return { label: i18n.t('status.letterRegistered'), kind: 'success' };
  if (isLetterSigned(l)) return { label: i18n.t('status.letterSignedStatus'), kind: 'success' };
  if (l.status === 'review') return { label: i18n.t('status.letterInChancellery'), kind: 'info' };
  if (l.status === 'management_review') return { label: i18n.t('status.letterInLeadership'), kind: 'pending' };
  return { label: i18n.t('status.letterPending'), kind: 'pending' };
}
