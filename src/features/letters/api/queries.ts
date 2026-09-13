import { queryOptions } from '@tanstack/react-query';
import { pagedListOptions, cleanParams, type ListParams } from '@/lib/pagedList';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  LETTERS_LIST,
  LETTER_DETAIL,
  LETTER_TRIP_MOVEMENTS,
  LETTER_TRIP_ATTENDANCE,
  LETTER_REGISTERED_NUMBER_AVAILABILITY,
  EMPLOYEES_LIST,
  ORGANIZATION_BRANCHES,
  ORGANIZATION_BRANCH_LEADERS,
  VEHICLE_ACCESS,
} from '@/api/urls';
import { fetchAllEmployees } from '@/utils/employees';
import type { BranchLite } from '@/utils/tripRegions';
import type { Employee, Letter, BusinessTripMovement, TripAttendance } from '@/types';

// Hierarchical query keys.
//
// `all` is deliberately `['letters']` (NOT a fresh namespace): the old tab,
// create-letter and letter-detail screens invalidate/read `['letters']`
// directly, so keeping `all` equal to that string means those existing prefix
// invalidations still match every list AND any open detail. The detail lives
// under `all` (as `['letters', 'detail', id]`) so a single
// `invalidateQueries({ queryKey: letterKeys.all })` refreshes the list AND the
// open detail in one call (mirrors orderKeys / leaveKeys).
export type LettersTab = 'action' | 'mine' | 'all';

export interface LettersListParams {
  tab: LettersTab;
  /** `all` = no type filter. */
  letterType?: 'all' | 'explanatory' | 'application' | 'business_trip';
  /** `all` = no status filter; otherwise one backend status code. */
  status?: string;
  search?: string;
  /** Current employee — needed for the `mine` tab (`employee_id`). */
  employeeId?: number;
}

export const letterKeys = {
  all: ['letters'] as const,
  list: (params?: LettersListParams) =>
    [...letterKeys.all, 'list', params ? cleanParams(lettersListServerParams(params)) : null] as const,
  detail: (id: number) => [...letterKeys.all, 'detail', id] as const,
  tripMovements: (id: number) => [...letterKeys.all, 'trip-movements', id] as const,
  tripAttendance: (id: number) => [...letterKeys.all, 'trip-attendance', id] as const,
};

/**
 * Tab / chip / search → `GET /letters` query params. Pure; unit-tested.
 *
 * • `action` → `action_required=true` (backend 2026-09-13: the SQL twin of the
 *   yellow-row flag — devonxona registers, KADR confirms arrival, agreers agree,
 *   the author fixes a returned report; `assigned_signer=true` covered none of
 *   those, which is why the tab used to be split in JS).
 * • `mine` → `employee_id=me` — author OR submitter, exactly what web v1 sends
 *   (`buildLettersListParams` 'my' tab). The backend accepts it since 2026-09-02.
 * • type/status/search map 1:1; the server folds Cyrillic/Latin and searches
 *   every number column + author/submitter name + text (core.search).
 */
export function lettersListServerParams(p: LettersListParams): ListParams {
  return {
    action_required: p.tab === 'action' ? true : undefined,
    employee_id: p.tab === 'mine' ? p.employeeId : undefined,
    letter_type: p.letterType,
    status: p.status,
    search: p.search?.trim() || undefined,
  };
}

// Server-paged, 30 rows at a time (infinite scroll). Every filter is a server
// param — the whole list (140k rows on PROD for a chancellery clerk, ~7 KB
// each) is never downloaded any more. The list keeps the backend order
// (drafts, then rows awaiting my action, then by number desc).
export function lettersListQuery(params: LettersListParams) {
  return pagedListOptions<Letter>({
    queryKey: letterKeys.list(params),
    url: LETTERS_LIST,
    params: lettersListServerParams(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function letterDetailQuery(id: number) {
  return queryOptions({
    queryKey: letterKeys.detail(id),
    queryFn: () => apiClient.get<Letter>(LETTER_DETAIL(id)).then((r) => r.data),
    enabled: !!id,
    // Sign state must reflect the server on every open — another signer may have
    // acted. Override the global staleTime so it always revalidates.
    refetchOnMount: 'always',
  });
}

// Real-time availability of a registration number in a branch — used by the
// devonxona confirm-registration dialog while the number is being edited.
// `available` is false when the number is already taken; `suggested` is the next
// free number. exclude_id lets the letter keep its own auto-assigned number.
interface RegisteredNumberAvailability {
  available: boolean;
  suggested?: string | null;
}
export function registeredNumberAvailabilityQuery(
  branchId: number | undefined,
  numberValue: string,
  excludeId: number,
  enabled: boolean,
) {
  return queryOptions({
    queryKey: ['letter-registered-number-availability', branchId, numberValue, excludeId] as const,
    enabled: enabled && branchId != null && numberValue.trim() !== '',
    queryFn: () =>
      apiClient
        .get<RegisteredNumberAvailability>(LETTER_REGISTERED_NUMBER_AVAILABILITY, {
          params: { organization_branch_id: branchId, number: numberValue, exclude_id: excludeId },
        })
        .then((r) => r.data),
    staleTime: 0,
  });
}

// Business-trip movements (kelish/ketish) of a letter. A flat list from the
// backend. Kept fresh on every open since another branch's HR may add movements.
export function tripMovementsQuery(id: number) {
  return queryOptions({
    queryKey: letterKeys.tripMovements(id),
    queryFn: () =>
      apiClient.get<BusinessTripMovement[]>(LETTER_TRIP_MOVEMENTS(id)).then((r) => r.data ?? []),
    enabled: !!id,
    refetchOnMount: 'always',
  });
}

// ── Create-letter dropdown queries ────────────────────────────────────────────
// These read-only lookups keep the old inline keys so they share the same cache
// entries as before the migration.

// ADRESAT (bildirgi/ariza `main_signer`) — filialning hr/deputy/ministr rolidagi
// xodimlari. Web `multiOrgEmployeesPaginated` bilan bir xil.
//
// ⚠️ Bu ro'yxat KELISHUVCHILAR uchun ISHLATILMAYDI — buning uchun alohida
// `letterAgreementSignersQuery` bor (pastda). Ilgari ikkalasi ham shu manbadan
// o'qirdi va "Kelishuvchilar" ro'yxatida filialning 3-4 ta rahbariyat xodimi
// chiqardi, oddiy hamkasblar esa umuman ko'rinmasdi.
export function letterSignersQuery(branchId?: number) {
  return queryOptions({
    queryKey: ['letter-signers', branchId] as const,
    queryFn: async () => {
      /**
       * ADRESAT — bildirgi/ariza kimga yozilayotgani.
       *
       * ⚠️ FILIALGA BELGILANGAN RAHBARLAR AVVAL. Ilgari bu so'rov faqat
       * `multi_org_employee_role` bo'yicha qidirardi, ya'ni filialning
       * ro'yxatdan o'tgan `director`/`deputy` rahbari multi-org roli
       * bo'lmasa mobil ro'yxatda UMUMAN chiqmasdi, veb esa uni ko'rsatardi.
       * Jonli misol: 1-filialda `deputy` rahbari (emp 429) multi-org rolsiz —
       * vebda tanlanadi, mobilda tanlab bo'lmasdi.
       *
       * Tartib `letterRahbariyatQuery` bilan bir xil: filial rahbarlari
       * topilsa — shular; aks holda multi-org ro'yxatiga tushamiz. KADR
       * fallbackda SAQLANADI: mobil ilgari ham kadrni adresat sifatida
       * taklif qilardi va backend uni ataylab qabul qiladi.
       */
      if (branchId) {
        const branchLeaders = await apiClient
          .get(ORGANIZATION_BRANCH_LEADERS(branchId))
          .then(
            (r) =>
              (Array.isArray(r.data) ? r.data : [])
                .filter((l: { employee?: Employee; leadership_role?: string }) =>
                  l.employee && ['director', 'deputy'].includes(l.leadership_role ?? ''))
                .map((l: { employee?: Employee }) => l.employee)
                .filter(Boolean) as Employee[]
          )
          .catch(() => [] as Employee[]);
        if (branchLeaders.length) return branchLeaders;
      }
      return apiClient
        .get(EMPLOYEES_LIST, {
          params: {
            multi_org_employee_role: ['hr', 'deputy', 'ministr'],
            // ⚠️ `include_multi_org: true` OLIB TASHLANDI: u backendда M2M
            // biriktirmasi bo'yicha filtrlaydi, ya'ni 28 filialga bog'langan
            // rahbariyat HAR BIR filial ro'yxatida chiqardi ("rahbariyatda
            // boshqa xodimlar chiqyapti"). Usiz `_branch_visibility_clause`
            // ishlaydi — xodim ASOSIY filiali ro'yxatida ko'rinadi.
            //
            // `has_department: true` — bo'limi va lavozimi bo'lmagan xizmat
            // hisoblari (test/monitoring akkauntlari) ro'yxatga tushmasin.
            // Ministr istisno: backend uni bo'limsiz ham qoldiradi.
            // O'lchandi (TEST, 2026-08-26): 1-filial 11 -> 7 ta, faqat
            // haqiqiy rahbariyat.
            has_department: true,
            size: 100,
            ...(branchId ? { organization_branch_id: branchId } : {}),
          },
        })
        .then((r) => unwrapList<Employee>(r.data));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Xizmat safari uchun rahbariyat. Filialga belgilangan rahbarlar bo'lsa —
// shular (web bilan bir xil); aks holda deputy/ministr roli.
export function letterRahbariyatQuery(branchId: number | undefined, enabled: boolean) {
  return queryOptions({
    queryKey: ['letter-rahbariyat', branchId] as const,
    enabled,
    queryFn: async () => {
      if (branchId) {
        const branchLeaders = await apiClient
          .get(ORGANIZATION_BRANCH_LEADERS(branchId))
          .then(
            (r) =>
              (Array.isArray(r.data) ? r.data : [])
                // Only ACTUAL leadership (director/deputy) is rahbariyat — devonxona,
                // buxgalter, yurist, texnik yordam (akt) etc. are branch leaders too
                // but must NOT appear as a management signer. Web AddLetterDrawer parity.
                .filter((l: { employee?: Employee; leadership_role?: string }) =>
                  l.employee && ['director', 'deputy'].includes(l.leadership_role ?? ''))
                .map((l: { employee?: Employee }) => l.employee)
                .filter(Boolean) as Employee[]
          )
          .catch(() => [] as Employee[]);
        if (branchLeaders.length) return branchLeaders;
      }
      // FALLBACK FILIALGA BOG'LANMAYDI (web `rahbariyatEmployeesPaginated`):
      // ministr/o'rinbosar bir nechta filialga xizmat qiladi va ularning
      // bo'limi ko'pincha BOSHQA filialda. `organization_branch_id` bilan
      // so'ralganda ro'yxat BO'SH qaytib, filialga rahbar belgilanmagan
      // bo'lsa safar yaratib bo'lmasdi.
      return apiClient
        .get(EMPLOYEES_LIST, {
          params: {
            multi_org_employee_role: ['deputy', 'ministr'],
            include_multi_org: true,
            // Bo'limi/lavozimi yo'q xizmat hisoblari rahbariyat ro'yxatiga
            // tushmasin (ministr istisnosi backendда).
            has_department: true,
            sort_by_razryad: true,
            size: 100,
          },
        })
        .then((r) => unwrapList<Employee>(r.data));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// KELISHUVCHILAR (bildirgi/ariza `agreement`) — filialning BARCHA xodimlari,
// ROL CHEKLOVISIZ. Adresat faqat rahbariyatdan bo'ladi, kelishuvchi esa har
// qanday xodim bo'lishi mumkin (web `agreementEmployeesPaginated` 1:1):
//   • `include_multi_org: false` — bo'limi AYNAN shu filialga tegishlilar
//     (boshqa filialga m2m orqali bog'langanlar chiqib ketmaydi);
//   • `sort_by_razryad: true` — eng baland razryad tepada;
//   • lavozimi kiritilmagan xodimlar ro'yxatda CHIQMAYDI (web ham filtrlaydi).
export function letterAgreementSignersQuery(branchId: number | undefined, enabled: boolean) {
  return queryOptions({
    queryKey: ['letter-agreement-signers', branchId] as const,
    enabled: enabled && !!branchId,
    queryFn: async () => {
      // ⚠️ `include_multi_org: false` OLIB TASHLANDI. U backendда bo'limga
      // INNER JOIN qilib `Department.organization_branch_id == branch` ni
      // talab qilardi — ya'ni bo'limi BOSHQA filial daraxtida turgan xodim
      // (kichik tashkilotlarda odatiy hol) ro'yxatga UMUMAN tushmasdi.
      // O'lchandi (TEST, 2026-08-26): "Gidroproekt" AJ da 5 xodimdan mobil
      // 2 tasini ko'rsatardi, "Energoqurilishindustriya" da esa 0 ta —
      // ya'ni o'sha tashkilotlarda hujjat umuman yaratib bo'lmasdi.
      //
      // `has_department: true` server tomonda lavozim+bo'lim shartini
      // qo'yadi, shuning uchun mijozdagi qo'lda filtr ham KERAK EMAS.
      const { items } = await fetchAllEmployees(branchId, {
        has_department: true,
        sort_by_razryad: true,
      });
      return items;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// "Sizni yuborayotgan shaxs" (safar `submitter`) — FAQAT o'z filiali xodimlari.
// `include_multi_org: false` bo'lmasa boshqa filialga m2m bog'langanlar ham
// chiqib ketardi (web izohi: "qat'iy ravishda bo'limi shu filialga tegishli").
export function letterSubmittersQuery(branchId: number | undefined, enabled: boolean) {
  return queryOptions({
    queryKey: ['letter-submitters', branchId] as const,
    enabled,
    // Kelishuvchilar bilan bir xil manba (yuqoridagi izoh): bo'limi boshqa
    // filialda turgan xodim tushib qolmasin, bo'limsiz xizmat hisoblari esa
    // ro'yxatga chiqmasin.
    queryFn: () => fetchAllEmployees(branchId, { has_department: true, sort_by_razryad: true }),
    staleTime: 5 * 60 * 1000,
  });
}

export function orgBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ['org-branches'] as const,
    enabled,
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<BranchLite>(r.data)),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * TRANSPORT huquqi: which branches may ask for a car on a business trip.
 *
 * The trip form shows the "Mashina kerak" block only when the letter's branch
 * is on `requester_branch_ids`, exactly like the web (AddLetterDrawer.jsx:176).
 * Long `staleTime`: the list changes about as often as the org chart does.
 */
export function vehicleAccessQuery() {
  return queryOptions({
    queryKey: ['vehicle-access'] as const,
    queryFn: () =>
      apiClient
        .get<{ requester_branch_ids?: number[] }>(VEHICLE_ACCESS)
        .then((r) => r.data ?? {}),
    staleTime: 30 * 60 * 1000,
  });
}

// Safar davomati (web TripAttendancePanel): kunlar tabeli + xulosa. Faqat
// safar yuborilgandan keyin ma'noli; server ko'rish huquqini o'zi tekshiradi.
export function tripAttendanceQuery(id: number, enabled = true) {
  return queryOptions({
    queryKey: letterKeys.tripAttendance(id),
    queryFn: () => apiClient.get<TripAttendance>(LETTER_TRIP_ATTENDANCE(id)).then((r) => r.data),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}
