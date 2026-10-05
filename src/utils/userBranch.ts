// «Bu hisob qaysi filial(lar)da?» degan savolga HAR HISOB TURI uchun YAGONA javob.
//
// ⚠️ NEGA KERAK (real-ma'lumot QA, 2026-10-05): Monitoring va KPP ekranlari filialni
// `employee` dan, bo'lmasa yuqori darajadagi `user.organization_branch_id` dan o'qirdi.
// Real `/auth/me` da bunday maydon YO'Q: kiosk (kpp / monitoring) hisobida `employee: null`,
// filial esa `multi_modal_user.organization_branch_ids: [1]` da; `admin` hisobida —
// `admin.organization_branch_id`. Natija: haqiqiy monitoring kioskida taxta hech qachon
// yuklanmasdi («filial aniqlanmadi»), testlar esa to'qima `organization_branch_id: 3` bilan o'tardi.
//
// Manba — web v2 `auth/branchHelpers.visibleBranches` + `roles.getSystemAdminBranchIds`:
//   - master-admin / ministr — GLOBAL: istalgan filial (v2 sarlavha tanlagichi, bosh filial bilan boshlanadi);
//   - `admin` — `admin.organization_branch_id` (filialsiz admin — hech qaysi);
//   - kiosk — `multi_modal_user.organization_branch_ids` (bir nechta bo'lishi mumkin);
//   - xodim — bo'lim filiali ∪ asosiy ∪ M2M (`employeeBranchIds`), asosiysi `resolveEmployeeBranchId`;
//   - mehmon — hech qaysi.
import type { User } from '../types';
import { findExecutiveBranchId, resolveEmployeeBranchId } from './branch';
import { employeeBranchIds, isBranchAdmin, isMasterAdmin, isSeparateAccount } from './roles';

function uniq(ids: (number | string | null | undefined)[]): number[] {
  const out: number[] = [];
  for (const raw of ids) {
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Hisobning O'Z filiallari (tartib — birinchisi asosiy). Global hisob uchun ham faqat o'zinikilar. */
export function userBranchIds(user?: User | null): number[] {
  if (!user || user.type === 'guest') return [];
  if (isBranchAdmin(user)) return uniq([user.admin?.organization_branch_id]);
  if (isSeparateAccount(user)) return uniq(user.multi_modal_user?.organization_branch_ids ?? []);
  const primary = resolveEmployeeBranchId(user.employee);
  return uniq([primary, ...employeeBranchIds(user)]);
}

/** Ekran ochilganda ko'rsatiladigan filial; aniqlab bo'lmasa `undefined` (global hisob — tanlagich). */
export function primaryBranchId(user?: User | null): number | undefined {
  return userBranchIds(user)[0];
}

/**
 * Istalgan filialni tanlay oladimi — v2 `visibleBranches`: `isMasterAdmin` (master-admin VA ministr)
 * uchun butun ro'yxat. Qolganlar faqat `userBranchIds` orasidan tanlaydi.
 */
export function hasGlobalBranchScope(user?: User | null): boolean {
  return isMasterAdmin(user);
}

/**
 * Filial tanlagichi kerakmi: global hisob yoki bir nechta o'z filiali bor hisob (v2 `BranchSelector`
 * `isStatic` — bitta filial va global emas bo'lsa tanlagich o'rniga statik belgi).
 */
export function needsBranchPicker(user?: User | null): boolean {
  return hasGlobalBranchScope(user) || userBranchIds(user).length > 1;
}

/**
 * Global hisobning (o'z filiali yo'q master-admin) boshlang'ich filiali — v2 `useBranchInit` uni
 * bosh filial bilan boshlaydi: `is_head_office` belgisi, bo'lmasa nom bo'yicha (`findExecutiveBranchId`, oxiri — 1).
 */
export function defaultGlobalBranchId(
  branches?: { id: number; name?: string | null; is_head_office?: boolean | null }[] | null,
): number {
  const flagged = (branches ?? []).find((b) => b.is_head_office);
  if (flagged) return flagged.id;
  return findExecutiveBranchId((branches ?? []).map((b) => ({ id: b.id, name: b.name ?? '' })));
}
