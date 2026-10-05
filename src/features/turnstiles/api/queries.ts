import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  HIK_SYNC_ACCESS_LISTS,
  ISAPI_DEVICES,
  LOCATIONS_LIST,
  ORGANIZATION_BRANCHES,
  TURNSTILES,
  TURNSTILE_DOORS,
} from '@/api/urls';
import type { AccessList, IsapiDevice, TurnstileDoor, TurnstileRow } from '../utils/turnstiles';

export const turnstilesKeys = {
  all: ['turnstiles-admin'] as const,
  list: (search: string, page: number) => [...turnstilesKeys.all, 'list', search, page] as const,
  locations: (branchId: number | null) => [...turnstilesKeys.all, 'locations', branchId] as const,
  branches: () => [...turnstilesKeys.all, 'branches'] as const,
  doors: (turnstileId: number) => [...turnstilesKeys.all, 'doors', turnstileId] as const,
  isapi: () => [...turnstilesKeys.all, 'isapi-devices'] as const,
  accessLists: () => [...turnstilesKeys.all, 'access-lists'] as const,
};

/** Turniketlar sahifasi hajmi (server `OptionalPage` standarti) — 100+ qurilma bir varaqda chizilmaydi. */
export const TURNSTILES_PAGE_SIZE = 50;

export interface PagedTurnstiles {
  items: TurnstileRow[];
  total: number;
  pages: number;
}

/**
 * Turniketlar — qidiruv SERVERDA (nomi, ko'rinadigan nomi, IP, indeks kodi; kirill/lotin farqsiz):
 * v2 `useTurnstiles`. Server sahifalaydi (`page`/`size` berilsa konvert qaytaradi); filial doirasini
 * server o'zi qo'yadi (AKT — o'z filiali). Eski server yalang massiv qaytarsa — bitta sahifa.
 */
export function turnstilesQuery(search: string, page = 1) {
  const term = search.trim();
  return queryOptions({
    queryKey: turnstilesKeys.list(term, page),
    queryFn: () =>
      apiClient
        .get(TURNSTILES, { params: { page, size: TURNSTILES_PAGE_SIZE, ...(term ? { search: term } : {}) } })
        .then((r): PagedTurnstiles => {
          const items = unwrapList<TurnstileRow>(r.data);
          const meta = (r.data && !Array.isArray(r.data) ? r.data : {}) as { total?: number; pages?: number };
          const total = meta.total ?? items.length;
          return { items, total, pages: meta.pages ?? Math.max(1, Math.ceil(total / TURNSTILES_PAGE_SIZE)) };
        }),
    placeholderData: keepPreviousData,
  });
}

/** Manzillar (turniket formasi va ISAPI terminali uchun). `null` — filial filtrisiz (v2 `useLocations(null)`). */
export function turnstileLocationsQuery(branchId: number | null) {
  return queryOptions({
    queryKey: turnstilesKeys.locations(branchId),
    queryFn: () =>
      apiClient
        .get(LOCATIONS_LIST, { params: branchId ? { organization_branch_id: branchId } : {} })
        .then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    staleTime: 5 * 60_000,
  });
}

/** Filiallar — faqat ISAPI terminali formasida manzillarni saralash uchun (yengil `slim` ro'yxat). */
export function turnstileBranchesQuery() {
  return queryOptions({
    queryKey: turnstilesKeys.branches(),
    queryFn: () =>
      apiClient
        .get(ORGANIZATION_BRANCHES, { params: { slim: true } })
        .then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    staleTime: 10 * 60_000,
  });
}

/** Bitta turniketning eshiklari (`require_system_admin`). */
export function turnstileDoorsQuery(turnstileId: number) {
  return queryOptions({
    queryKey: turnstilesKeys.doors(turnstileId),
    queryFn: () =>
      apiClient
        .get(TURNSTILE_DOORS, { params: { turnstile_id: turnstileId } })
        .then((r) => unwrapList<TurnstileDoor>(r.data)),
  });
}

/** Ro'yxatga olingan ISAPI terminallari — login shu yerdan (turniket qatorida yo'q); parol hech qachon. */
export function isapiDevicesQuery() {
  return queryOptions({
    queryKey: turnstilesKeys.isapi(),
    queryFn: () => apiClient.get(ISAPI_DEVICES).then((r) => unwrapList<IsapiDevice>(r.data)),
  });
}

/** HikCentral ruxsat guruhlari — o'qish filial AKT iga ham ochiq (sinxron esa faqat global). */
export function accessListsQuery() {
  return queryOptions({
    queryKey: turnstilesKeys.accessLists(),
    queryFn: () => apiClient.get(HIK_SYNC_ACCESS_LISTS).then((r) => unwrapList<AccessList>(r.data)),
  });
}
