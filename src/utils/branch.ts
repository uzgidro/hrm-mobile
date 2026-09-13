import type { Employee, OrganizationBranch } from '@/types';

// "Ijro apparati" = the head company ("O'zbekgidroenergo" AJ) branch. The phone
// directory / employee dashboards split into Ijro apparati vs Tizim tashkilotlari
// around this branch. Mirrors the web shared/utils/branchHelpers.findExecutiveBranchId
// (name match, apostrophe/quote-normalized), falling back to branch id 1.
function norm(s?: string | null): string {
  return (s || '')
    .toLowerCase()
    .replace(/[‘’`']/g, '')
    .replace(/[«»"”“]/g, '');
}

export function findExecutiveBranchId(branches?: OrganizationBranch[] | null): number {
  const match = (branches || []).find((b) => {
    const n = norm(b.name);
    return /\bozbekgidroenergo\b/.test(n) && /\baj\b/.test(n) && !n.includes('filial');
  });
  return match?.id ?? 1;
}

// Foydalanuvchi "qaysi filialda ishlaydi" degan savolga YAGONA javob.
//
// ⚠️ NEGA KERAK (shikoyat 2026-08-26: "bildirgi/ariza va buyruqlarda
// filialdagi barcha xodimlar chiqmayapti, webda muammosiz"): ekranlar
// filialni `employee.organization_branches[0].id` dan olardi. Bu M2M
// ro'yxatning IXTIYORIY birinchi elementi — tartib backend join'iga
// bog'liq va TASODIFIY. TEST bazasida o'lchandi (2026-08-26):
//
//   Boshqaruv raisi:  bo'lim filiali = 1 (Ijro apparati)
//                     organization_branches[0] = 22 ("O'zsuvloyiha" AJ)
//
// Ya'ni mobil xodimlar ro'yxatini 22-filialdan so'rardi, foydalanuvchi esa
// 1-filialdagi hamkasblarini kutardi. 28 ta filialga bog'langan rahbariyat
// uchun natija har safar boshqacha bo'lardi.
//
// WEB tartibi (`AddLetterDrawer`): `selectedBranchId ?? user.employee
// .department.organization_branch_id`. Mobilda filial tanlagichi yo'q,
// shuning uchun:
//   1) `primary_organization_branch_id` — ataylab belgilangan asosiy filial;
//   2) BO'LIM filiali — xodim haqiqatda ishlaydigan joy (web ham shunga tushadi);
//   3) M2M birinchisi — faqat oxirgi chora (bo'limi yo'q hisoblar uchun),
//      aks holda ekran umuman ishlamay qolardi.
export function resolveEmployeeBranchId(
  employee?: Pick<
    Employee,
    'primary_organization_branch_id' | 'department' | 'organization_branches'
  > | null,
): number | undefined {
  if (!employee) return undefined;
  return (
    employee.primary_organization_branch_id ??
    employee.department?.organization_branch_id ??
    employee.organization_branches?.[0]?.id
  );
}
