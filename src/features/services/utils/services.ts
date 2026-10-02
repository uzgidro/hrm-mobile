// Interaktiv xizmatlar — web v2 `features/services` sof mantig'i (TZ 4.2.12).
// Uchala xizmat (ma'lumotnoma, tavsifnoma, nomzodlik arizasi) bitta hayot tsikliga
// ega: qabul → ko'rib chiqish → bajarilish → tayyor → berildi.

export type ServiceType = 'work_certificate' | 'reference_letter' | 'job_application';
export type ServiceStatus = 'accepted' | 'in_review' | 'in_progress' | 'ready' | 'issued' | 'rejected' | 'cancelled';

/**
 * Backend ruxsat etgan o'tishlar — UI faqat qabul qilinadiganini taklif qiladi.
 * ORQAGA YO'L YO'Q: holat tarixi rasmiy iz; xato oldinga izoh bilan tuzatiladi.
 */
export const TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  accepted: ['in_review', 'rejected'],
  in_review: ['in_progress', 'rejected'],
  in_progress: ['ready', 'rejected'],
  ready: ['issued', 'rejected'],
  issued: [],
  rejected: [],
  cancelled: [],
};

/** Tafsilotda progress zanjiri bo'lib chiziladi. */
export const STATUS_CHAIN: ServiceStatus[] = ['accepted', 'in_review', 'in_progress', 'ready', 'issued'];

export const nextStates = (s: ServiceStatus): ServiceStatus[] => TRANSITIONS[s] ?? [];

/** Rad etishda sabab majburiy (v2 `rejectReasonRequired`); qolgan o'tishlarda izoh ixtiyoriy. */
export function validateTransition(to: ServiceStatus, comment: string): 'rejectReasonRequired' | null {
  return to === 'rejected' && !comment.trim() ? 'rejectReasonRequired' : null;
}

/** Faqat o'z so'rovim va faqat hali ko'rib chiqilmagan («qabul qilindi») holatda. */
export function canCancel(r: { status: ServiceStatus; employee_id?: number | null }, myEmployeeId?: number): boolean {
  return !!myEmployeeId && r.employee_id === myEmployeeId && r.status === 'accepted';
}

export interface CreateForm {
  type: string;
  purpose: string;
  branchId: number | null;
  lastName: string;
  firstName: string;
  middleName: string;
  position: string;
  phone: string;
  note: string;
}

export function validateCreate(f: CreateForm): 'pickService' | 'lastNameRequired' | null {
  if (!f.type) return 'pickService';
  // Faqat nomzodlik arizasida ariza beruvchi ma'lumoti bor: ma'lumotnomani tizim
  // allaqachon biladigan xodim so'raydi.
  if (f.type === 'job_application' && !f.lastName.trim()) return 'lastNameRequired';
  return null;
}

export function buildCreateBody(f: CreateForm): Record<string, unknown> {
  const app = f.type === 'job_application';
  return {
    service_type: f.type,
    purpose: f.purpose.trim() || null,
    organization_branch_id: app && f.branchId ? f.branchId : null,
    payload: app
      ? {
          last_name: f.lastName,
          first_name: f.firstName,
          middle_name: f.middleName,
          position: f.position,
          phone: f.phone,
          note: f.note,
        }
      : null,
  };
}
