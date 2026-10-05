// Filiallar va manzillar (web v2 BranchesPage + features/system/useSystemAdmin) — sof mantiq: ro'yxat
// qatori, qidiruv, viloyatlar katalogi, filial va manzil formalarining tekshiruvi/tanasi (v2 bilan aynan).
//
// Huquq: sahifa — `canAccessSystemAdmin` (admin hisobi, master-admin, AKT xodimi; katalogda
// `systemAdmin`). Filial QO'SHISH va O'CHIRISH serverda `require_roles("admin","master-admin")` —
// AKT xodimiga bu tugmalar chizilmaydi (v2 `canManageBranches`). Tahrir va manzillar AKT ga ham ochiq
// (server o'z filialiga toraytiradi).
import type { User } from '@/types';
import { isBranchAdmin, isSiteMasterAdmin } from '@/utils/roles';

/** `GET /organization-branches` qatori (to'liq `OrganizationBranchReadFull`). */
export interface BranchRow {
  id: number;
  name?: string | null;
  region?: string | null;
  regions?: string[] | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_head_office?: boolean | null;
  is_medical_center?: boolean | null;
  terminal_group?: string | null;
  department_count?: number | null;
  employee_count?: number | null;
  turnstile_count?: number | null;
}

/** `GET /locations` qatori — turniket aynan manzilga biriktiriladi, manzil esa filialga. */
export interface LocationRow {
  id: number;
  name?: string | null;
  address?: string | null;
  organization_branch_id?: number | null;
  organization_branch?: { id?: number; name?: string | null } | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** v2 `canManageBranches`: filial yaratish/o'chirish faqat sayt master-admini va admin hisobiga. */
export function canManageBranches(user?: User | null): boolean {
  return isSiteMasterAdmin(user) || isBranchAdmin(user);
}

export const branchName = (b: Pick<BranchRow, 'id' | 'name'>) => b.name || `#${b.id}`;

/** v2 qator osti: asosiy viloyat · manzil (bo'sh bo'lsa «—»). */
export function branchSubtitle(b: BranchRow): string {
  return [b.region, b.address].filter(Boolean).join(' · ') || '—';
}

/** Filial bir nechta viloyatga qarashi mumkin; eski yozuvda faqat `region` bo'ladi. */
export function branchRegions(b: Pick<BranchRow, 'region' | 'regions'>): string[] {
  return b.regions?.length ? b.regions.filter(Boolean) : b.region ? [b.region] : [];
}

/** v2: viloyatlar alohida katalogdan emas, filiallarning o'zidan (alifbo bo'yicha). */
export function knownRegions(rows: BranchRow[]): string[] {
  const set = new Set<string>();
  for (const b of rows) branchRegions(b).forEach((r) => set.add(r));
  return Array.from(set).sort();
}

/** v2: qidiruv faqat filial nomi bo'yicha, mijozda (ro'yxat bitta so'rovda keladi). */
export function filterBranches(rows: BranchRow[], search: string): BranchRow[] {
  const q = search.trim().toLowerCase();
  return q ? rows.filter((b) => (b.name ?? '').toLowerCase().includes(q)) : rows;
}

/** Manzilning filial id si — eski javobda faqat ichki obyekt bo'lishi mumkin. */
export const locationBranchId = (l: LocationRow): number | null =>
  l.organization_branch_id ?? l.organization_branch?.id ?? null;

/** v2 qator osti: filial nomi · manzil. */
export function locationSubtitle(l: LocationRow, nameOf: (id: number) => string): string {
  const id = locationBranchId(l);
  return [id != null ? nameOf(id) : '—', l.address].filter(Boolean).join(' · ');
}

export type BuildResult = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

/**
 * Koordinata: bo'sh — `null`; vergul nuqtaga aylantiriladi; son bo'lmasa — xato (`undefined`).
 * v2 `Number('abc')` ni NaN sifatida yuborardi (JSON da `null` — koordinata jimgina o'chardi).
 */
export function parseCoord(v: string): number | null | undefined {
  const s = v.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const coordText = (n?: number | null) => (n != null ? String(n) : '');

/**
 * Koordinata oralig'i: kenglik [-90, 90], uzunlik [-180, 180]. v2 tekshirmaydi, server esa
 * ma'nosiz qiymatni (91.5) saqlab qo'yardi — geofencing buziladi. Bo'sh (`null`) — tekshirilmaydi.
 */
export function coordRangeError(
  latitude: number | null,
  longitude: number | null,
): 'branches.latRange' | 'branches.lonRange' | null {
  if (latitude != null && (latitude < -90 || latitude > 90)) return 'branches.latRange';
  if (longitude != null && (longitude < -180 || longitude > 180)) return 'branches.lonRange';
  return null;
}

// ── Filial formasi ───────────────────────────────────────────────────────────

export interface BranchForm {
  name: string;
  /** Tartib muhim: birinchisi — hujjatlarda chiqadigan asosiy viloyat (`region`). */
  regions: string[];
  address: string;
  lat: string;
  lon: string;
  isHeadOffice: boolean;
  isMedicalCenter: boolean;
  terminalGroup: string;
}

export const seedBranchForm = (r: BranchRow | null): BranchForm => ({
  name: r?.name ?? '',
  regions: r ? branchRegions(r) : [],
  address: r?.address ?? '',
  lat: coordText(r?.latitude),
  lon: coordText(r?.longitude),
  isHeadOffice: !!r?.is_head_office,
  isMedicalCenter: !!r?.is_medical_center,
  terminalGroup: r?.terminal_group ?? '',
});

/** Ro'yxatga qo'shadi yoki olib tashlaydi (qo'shilgan oxiriga — birinchisi asosiy bo'lib qoladi). */
export const toggleRegion = (list: string[], r: string) =>
  list.includes(r) ? list.filter((x) => x !== r) : [...list, r];

/**
 * v2 `BranchModal.submit`: nom majburiy; `regions` ro'yxati manba, `region` — uning birinchisi;
 * bo'sh manzil/koordinata — `null` (server tahrirda aniq `null` ni tozalash deb qabul qiladi);
 * `terminal_group` bo'sh satr — guruhdan chiqarish.
 */
export function buildBranchBody(f: BranchForm): BuildResult {
  const name = f.name.trim();
  if (!name) return { ok: false, error: 'branches.nameRequired' };
  const latitude = parseCoord(f.lat);
  const longitude = parseCoord(f.lon);
  if (latitude === undefined || longitude === undefined) return { ok: false, error: 'branches.coordInvalid' };
  const range = coordRangeError(latitude, longitude);
  if (range) return { ok: false, error: range };
  return {
    ok: true,
    body: {
      name,
      regions: f.regions,
      region: f.regions[0] ?? null,
      address: f.address.trim() || null,
      latitude,
      longitude,
      is_head_office: f.isHeadOffice,
      is_medical_center: f.isMedicalCenter,
      terminal_group: f.terminalGroup.trim(),
    },
  };
}

// ── Manzil formasi ───────────────────────────────────────────────────────────

export interface LocationForm {
  name: string;
  branchId: number | null;
  address: string;
  lat: string;
  lon: string;
}

export const seedLocationForm = (r: LocationRow | null): LocationForm => ({
  name: r?.name ?? '',
  branchId: r ? locationBranchId(r) : null,
  address: r?.address ?? '',
  lat: coordText(r?.latitude),
  lon: coordText(r?.longitude),
});

/** v2 `LocationModal.submit`: nom majburiy; filial ixtiyoriy (`null`); koordinatalar geofencing uchun. */
export function buildLocationBody(f: LocationForm): BuildResult {
  const name = f.name.trim();
  if (!name) return { ok: false, error: 'branches.nameRequired' };
  const latitude = parseCoord(f.lat);
  const longitude = parseCoord(f.lon);
  if (latitude === undefined || longitude === undefined) return { ok: false, error: 'branches.coordInvalid' };
  const range = coordRangeError(latitude, longitude);
  if (range) return { ok: false, error: range };
  return {
    ok: true,
    body: { name, organization_branch_id: f.branchId, address: f.address.trim() || null, latitude, longitude },
  };
}

// ── «Hik'ga yuborish» navbati ────────────────────────────────────────────────

/** v2: navbatga qo'yilgan sinxron hech narsa ko'rsatmaydi — tugma 60 s bosilmaydi (uch marta navbat bo'lmasin). */
export const SYNC_COOLDOWN_MS = 60_000;

export const isSyncQueued = (queuedAt: Record<number, number>, id: number, now: number) =>
  queuedAt[id] != null && now - queuedAt[id]! < SYNC_COOLDOWN_MS;

/**
 * Filial doirasidan tashqarida (AKT `akt_branch_ids`, filialga bog'langan admin hisobi) tahrir / Hik'ga
 * yuborish / o'chirish: server mavjudlikni oshkor qilmaslik uchun umumiy 404 `not_found` qaytaradi
 * (`assert_branch_access`; ba'zi yo'llar 403). v2 bu tugmalarni hammaga ko'rsatadi (paritet) — biz faqat
 * «Topilmadi» o'rniga tushunarli matn chiqaramiz. Aniq kodli 404 (`branch_not_found` …) — haqiqatan yo'q,
 * uning o'z matni qoladi.
 */
export function isOutOfScopeError(e: unknown): boolean {
  const res = (e as { response?: { status?: number; data?: unknown } } | null)?.response;
  if (res?.status === 403) return true;
  if (res?.status !== 404) return false;
  const code = (res.data as { code?: unknown } | null | undefined)?.code;
  return code == null || code === 'not_found';
}
