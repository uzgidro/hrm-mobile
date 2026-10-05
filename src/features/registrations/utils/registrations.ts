// Ro'yxatdan o'tish arizalari (web v2 RegistrationsPage + features/registration) — sof mantiq: ro'yxat
// parametrlari, da'vo qilingan joy, tasdiqlash tanasi va rad etish sababi tekshiruvi (v2 bilan aynan).
// Holat toni — `@/utils/registrationStatus` (mehmonning «Arizam holati» ekrani bilan bitta manba).
import { REGISTRATION_STATUSES, type RegistrationStatus } from '@/utils/registrationStatus';

/** v2 `useListParams` DEFAULT_PAGE_SIZE (server: 1..200, default 50). */
export const REG_PAGE_SIZE = 25;

export type RegistrationFilter = RegistrationStatus | 'all';
export const REGISTRATION_FILTERS: RegistrationFilter[] = [...REGISTRATION_STATUSES, 'all'];

/**
 * Server faqat uchta haqiqiy holatni biladi (`^(pending|approved|rejected)$`) — «Barchasi» = holatsiz
 * (aks holda 422). Qidiruv bo'sh bo'lsa yuborilmaydi.
 */
export function registrationParams(status: RegistrationFilter, search: string, page: number) {
  return {
    ...(status !== 'all' ? { status } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    page,
    size: REG_PAGE_SIZE,
  };
}

export interface RegistrationRow {
  id: number;
  status: string;
  full_name?: string | null;
  email?: string | null;
  username?: string | null;
  phone_number?: string | null;
  birth_date?: string | null;
  gender?: number | null;
  birth_place?: string | null;
  address?: string | null;
  pinfl?: string | null;
  inn?: string | null;
  passport_number?: string | null;
  passport_issued_by?: string | null;
  passport_issue_date?: string | null;
  passport_expiry_date?: string | null;
  birth_country_name?: string | null;
  nationality_name?: string | null;
  citizenship_name?: string | null;
  is_uge_employee: boolean;
  claimed_branch_id?: number | null;
  claimed_department_id?: number | null;
  claimed_job_position_id?: number | null;
  claimed_branch_name?: string | null;
  claimed_department_name?: string | null;
  claimed_job_position_name?: string | null;
  photo_url?: string | null;
  reject_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
}

export interface RegistrationsPage {
  items: RegistrationRow[];
  total: number;
  pages: number;
}

/** Da'vo qilingan joy — xodim bo'lsa «filial · bo'lim · lavozim», aks holda «Mehmon». */
export function claimText(r: RegistrationRow, guestLabel: string): string {
  if (!r.is_uge_employee) return guestLabel;
  return [r.claimed_branch_name, r.claimed_department_name, r.claimed_job_position_name].filter(Boolean).join(' · ');
}

export const genderKey = (g?: number | null): 'male' | 'female' | null =>
  g === 1 ? 'male' : g === 2 ? 'female' : null;

/**
 * Tasdiqlash formasi — administrator xodimning HAQIQIY joyini belgilaydi; arizadagi qiymatlar faqat
 * boshlang'ich taklif (da'vo).
 */
export interface ApproveForm {
  branchId: number | null;
  departmentId: number | null;
  positionId: number | null;
}

export const seedApproveForm = (r: RegistrationRow): ApproveForm => ({
  branchId: r.claimed_branch_id ?? null,
  departmentId: r.claimed_department_id ?? null,
  positionId: r.claimed_job_position_id ?? null,
});

export type ApproveResult =
  | { ok: true; body: { organization_branch_id: number; department_id: number | null; job_position_id: number | null } }
  | { ok: false; error: string };

export function buildApproveBody(f: ApproveForm): ApproveResult {
  if (f.branchId == null) return { ok: false, error: 'registrations.errBranchRequired' };
  return {
    ok: true,
    body: { organization_branch_id: f.branchId, department_id: f.departmentId, job_position_id: f.positionId },
  };
}

/** Server: `reason` 3..1000 belgi; sabab arizachiga ko'rinadi. */
export function validateRejectReason(reason: string): { ok: true; reason: string } | { ok: false; error: string } {
  const r = reason.trim();
  return r.length < 3 ? { ok: false, error: 'registrations.errReasonRequired' } : { ok: true, reason: r };
}
