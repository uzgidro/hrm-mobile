import type { ThemeColors } from '../theme/palettes';
import type { Letter, LetterSigner } from '../types';
import type { StatusKind } from './orderStatus';
import { statusColor } from './orderStatus';

export { statusColor };

export const LETTER_TYPE_LABELS: Record<string, string> = {
  bildirgi: 'Bildirgi',
  explanotary: 'Bildirgi',
  explanatory: 'Bildirgi',
  notification: 'Bildirgi',
  application: 'Ariza',
  business_trip: 'Xizmat safari',
};

export function letterTypeLabel(type?: string): string {
  return LETTER_TYPE_LABELS[type ?? ''] || type || 'Xat';
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
    if (assigned.signer_type === 'management') return l.status === 'management_review';
    if (assigned.signer_type === 'main') return l.status === 'pending';
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

  const push = (s: LetterSigner, fallbackRole: string, signedText: string) => {
    const id = sid(s);
    const signed = hasSigned(l, id);
    const rejected = hasRejected(l, id);
    items.push({
      key: `${s.signer_type}-${s.employee_id}`,
      name: s.employee?.legal_name || "Noma'lum",
      role: (typeof s.employee?.job_position === 'object' ? s.employee?.job_position?.name : '') || fallbackRole,
      status: signed ? 'signed' : rejected ? 'rejected' : 'pending',
      statusText: signed ? signedText : rejected ? 'Rad etdi' : 'Kutilmoqda',
    });
  };

  if (isTrip) {
    getManagementSigners(l).forEach((s) => push(s, 'Rahbariyat', 'Tasdiqladi'));
    const main = getMainSigner(l);
    if (main) push(main, "Boshlig'i", 'Imzoladi');
    return items;
  }

  getOrdinarySigners(l).forEach((s) => push(s, 'Kelishuvchi', isAriza ? 'Imzoladi' : 'Roziman'));
  const main = getMainSigner(l);
  if (main) push(main, 'Imzolovchi', 'Imzoladi');
  return items;
}

export function letterStatusMeta(l: Letter): { label: string; kind: StatusKind } {
  if (isLetterRejected(l)) return { label: 'Rad etildi', kind: 'error' };
  if (l.is_stamped || l.status === 'registered' || l.status === 'stamped') return { label: "Ro'yxatga olingan", kind: 'success' };
  if (isLetterSigned(l)) return { label: 'Imzolangan', kind: 'success' };
  if (l.status === 'review') return { label: 'Devonxonada', kind: 'info' };
  if (l.status === 'management_review') return { label: 'Rahbariyatda', kind: 'pending' };
  return { label: 'Kutilmoqda', kind: 'pending' };
}
