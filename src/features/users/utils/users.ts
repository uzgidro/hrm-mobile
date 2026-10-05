// Foydalanuvchilar (web v2 UsersPage + features/users) — sof mantiq: sahifa meta, hisob holati,
// rol vakili qatorlari, administrator va kiosk formalarining tekshiruvi/tanasi (v2 bilan aynan).
//
// ⚠️ Parollar: administrator/kiosk formasida kiritilgan parol faqat so'rov tanasiga tushadi va hech
// qayerda saqlanmaydi; «Parol yuborish» serverda bir martalik parol yasab POCHTAGA jo'natadi —
// javobda parol yo'q, shuning uchun mobil uni ko'rsatmaydi ham, keshlamaydi ham (v2).
import { unwrapList } from '@/api/response';

/** v2 `useListParams` DEFAULT_PAGE_SIZE. */
export const USERS_PAGE_SIZE = 25;

export interface Paged<T> {
  items: T[];
  total: number;
  pages: number;
}

export function toPaged<T>(data: unknown, size: number): Paged<T> {
  const items = unwrapList<T>(data);
  const meta = (data && !Array.isArray(data) ? data : {}) as { total?: number; pages?: number };
  const total = meta.total ?? items.length;
  return { items, total, pages: meta.pages ?? Math.max(1, Math.ceil(total / size)) };
}

type Named = { id: number; name?: string | null } | null;

/** Xodim hisobi (`/employees` qatori). `account_is_active: null` — xodimda hisob yo'q. */
export interface EmployeeAccountRow {
  id: number;
  legal_name?: string | null;
  email?: string | null;
  photo_thumb_path?: string | null;
  photo_path?: string | null;
  department?: Named;
  job_position?: Named;
  account_is_active?: boolean | null;
}

export type AccountState = 'none' | 'active' | 'inactive';

export function accountState(r: Pick<EmployeeAccountRow, 'id' | 'account_is_active'>): AccountState {
  if (r.account_is_active == null) return 'none';
  return r.account_is_active ? 'active' : 'inactive';
}

/** Rol vakili — ko'p filialli rol egasi (`/employees?is_multi_org_user=true&include_multi_org=true`). */
export interface MultiOrgRow {
  id: number;
  legal_name?: string | null;
  email?: string | null;
  photo_thumb_path?: string | null;
  multi_org_employee_role?: string | string[] | null;
  is_kpi_admin?: boolean | null;
  organization_branches?: { id: number; name?: string | null }[] | null;
  organization_branch_ids?: number[] | null;
  created_at?: string | null;
}

/** v2: rol massiv bo'lib kelishi mumkin — jadvalda birinchisi. */
export function primaryMultiOrgRole(r: MultiOrgRow): string | null {
  const v = Array.isArray(r.multi_org_employee_role) ? r.multi_org_employee_role[0] : r.multi_org_employee_role;
  return v || null;
}

/** Ichki filiallar bo'lsa — ularning nomi; eski javobda faqat id lar — katalogdan nom. */
export function multiOrgBranchNames(r: MultiOrgRow, nameOf: (id: number) => string): string[] {
  const nested = r.organization_branches ?? [];
  if (nested.length) return nested.map((b) => b.name || nameOf(b.id)).filter(Boolean);
  return (r.organization_branch_ids ?? []).map(nameOf);
}

// ── Administrator hisoblari (`/admins`) ──────────────────────────────────────

export interface AdminRow {
  id: number;
  email?: string | null;
  organization_branch_id?: number | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
}

export interface AdminForm {
  email: string;
  password: string;
  /** `null` — barcha filiallar. */
  branchId: number | null;
}

export const seedAdminForm = (r: AdminRow | null): AdminForm => ({
  email: r?.email ?? '',
  password: '',
  branchId: r?.organization_branch_id ?? null,
});

export type BuildResult = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

/**
 * v2 `AdminModal.save`: pochta majburiy; parol ixtiyoriy, lekin kiritilsa kamida 8 belgi (server
 * `create_user` chegarasi). Yangi hisobda bo'sh parol — `null`: server bir martalik parolni pochtaga
 * yuboradi. Tahrirda bo'sh parol umuman yuborilmaydi — joriy parol o'chib ketmasin.
 */
export function buildAdminBody(f: AdminForm, editing: boolean): BuildResult {
  const email = f.email.trim();
  if (!email) return { ok: false, error: 'users.errEmail' };
  if (f.password && f.password.length < 8) return { ok: false, error: 'users.errPasswordShort' };
  if (editing) {
    const body: Record<string, unknown> = { email, organization_branch_id: f.branchId };
    if (f.password) body.password = f.password;
    return { ok: true, body };
  }
  return { ok: true, body: { email, password: f.password || null, organization_branch_id: f.branchId } };
}

// ── Kiosk (post) hisoblari (`/multi-modal-users`) ────────────────────────────

/**
 * Serverning `ALLOWED_MULTI_MODAL_ROLES` ro'yxati — erkin matn EMAS: rol `User.type` ga yoziladi va
 * ba'zi turlar (master-admin) ruxsatni chetlab o'tadi (v2 `KIOSK_ROLES`).
 */
export const KIOSK_ROLES = ['monitoring-operator', 'kpp'] as const;

export const kioskRoleKey = (role?: string | null): 'kpp' | 'monitoring' => (role === 'kpp' ? 'kpp' : 'monitoring');

export interface KioskUser {
  id?: number;
  role?: string | null;
  user_id?: number | null;
  username?: string | null;
  organization_branch_ids?: number[] | null;
  personal_identification_number?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  legal_name?: string | null;
}

export interface KioskForm {
  username: string;
  legalName: string;
  password: string;
  role: string;
  pinfl: string;
  branchIds: number[];
}

export const seedKioskForm = (r: KioskUser | null): KioskForm => ({
  username: r?.username ?? '',
  legalName: r?.legal_name ?? '',
  password: '',
  role: r?.role ?? KIOSK_ROLES[0],
  pinfl: r?.personal_identification_number ?? '',
  branchIds: r?.organization_branch_ids ?? [],
});

/** v2 `maskValue('pinfl')`. */
export const maskPinfl = (v: string) => v.replace(/\D/g, '').slice(0, 14);

const KIOSK_PASSWORD_MIN = 8;

/**
 * v2 `KioskUserModal.submit`: login (faqat yaratishda, keyin o'zgarmaydi) → kamida bitta filial
 * (bu hisob filialini boshqa joydan ololmaydi; server bo'sh ro'yxatni ham yaratishda, ham tahrirda
 * rad etadi) → parol: yaratishda majburiy ≥ 8, tahrirda bo'sh = o'zgarmaydi.
 */
export function buildKioskBody(f: KioskForm, editing: boolean): BuildResult {
  if (!editing && !f.username.trim()) return { ok: false, error: 'users.kioskUsernameRequired' };
  if (f.branchIds.length === 0) return { ok: false, error: 'users.kioskBranchRequired' };
  const password = f.password.trim();
  if (!editing && password.length < KIOSK_PASSWORD_MIN) return { ok: false, error: 'users.kioskPasswordShort' };
  if (editing && password && password.length < KIOSK_PASSWORD_MIN) {
    return { ok: false, error: 'users.kioskPasswordShort' };
  }
  const common = {
    role: f.role,
    legal_name: f.legalName.trim() || null,
    organization_branch_ids: f.branchIds,
    personal_identification_number: f.pinfl.trim() || null,
  };
  if (editing) {
    return {
      ok: true,
      body: {
        legal_name: common.legal_name,
        role: common.role,
        organization_branch_ids: common.organization_branch_ids,
        personal_identification_number: common.personal_identification_number,
        ...(password ? { password } : {}),
      },
    };
  }
  return {
    ok: true,
    body: {
      username: f.username.trim(),
      password,
      role: common.role,
      legal_name: common.legal_name,
      organization_branch_ids: common.organization_branch_ids,
      personal_identification_number: common.personal_identification_number,
    },
  };
}
