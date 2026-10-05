import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  VEHICLE,
  VEHICLE_ACCESS,
  VEHICLE_DRIVER_SCOPES,
  VEHICLE_DRIVERS,
  VEHICLE_FUEL_LOGS,
  VEHICLE_FUEL_TYPES,
  VEHICLE_GPS_UNITS,
  VEHICLE_LIVE,
  VEHICLE_REQUESTS,
  VEHICLE_TRIPS,
  VEHICLE_VISITS,
  VEHICLES,
} from '@/api/urls';
import {
  visitParams,
  type DriverOption,
  type DriverScope,
  type FleetAccess,
  type FuelLog,
  type FuelType,
  type GpsUnit,
  type Page,
  type Vehicle,
  type VehicleFull,
  type VehicleLive,
  type VehicleRequest,
  type VehicleTrip,
  type VehicleVisit,
  type VisitFilters,
} from '../utils/vehicles';

/*
 * Avtopark — v2 `useVehicles` porti. v2 har so'rovga `organization_branch_id: null` qo'shadi,
 * chunki uning axios qatlami sarlavha filialini AVTOMATIK qo'shadi (mashinalar BFD da, so'rovchilar
 * bosh apparatda — filtr ro'yxatni bo'shatardi). Mobil `apiClient` filial qo'shmaydi — kerak emas.
 */
export const REQUESTS_PAGE_SIZE = 30;
export const VISITS_PAGE_SIZE = 30;
/** v2: provayder taxminan shu tezlikda yangilanadi; tezroq — faqat trafik. */
export const LIVE_REFRESH_MS = 20_000;

type Range = { from?: string | null; to?: string | null; excludeLetterId?: number | null };

export const vehicleKeys = {
  all: ['vehicles'] as const,
  access: () => [...vehicleKeys.all, 'access'] as const,
  list: (p: object) => [...vehicleKeys.all, 'list', p] as const,
  detail: (id: number) => [...vehicleKeys.all, 'detail', id] as const,
  trips: (id: number) => [...vehicleKeys.all, 'trips', id] as const,
  live: (id: number) => [...vehicleKeys.all, 'live', id] as const,
  requests: (p: object) => [...vehicleKeys.all, 'requests', p] as const,
  fuelTypes: () => [...vehicleKeys.all, 'fuel-types'] as const,
  fuelLogs: () => [...vehicleKeys.all, 'fuel-logs'] as const,
  drivers: (p: object) => [...vehicleKeys.all, 'drivers', p] as const,
  gpsUnits: () => [...vehicleKeys.all, 'gps-units'] as const,
  visits: (p: object) => [...vehicleKeys.all, 'visits', p] as const,
  driverScopes: () => [...vehicleKeys.all, 'driver-scopes'] as const,
};

/** v2 `useFleetAccess` — qaysi tab va tugma ko'rinishini SERVER hal qiladi. */
export function fleetAccessQuery() {
  return queryOptions({
    queryKey: vehicleKeys.access(),
    queryFn: () =>
      apiClient.get<Partial<FleetAccess>>(VEHICLE_ACCESS).then((r): FleetAccess => ({
        can_manage: !!r.data?.can_manage,
        can_approve: !!r.data?.can_approve,
        can_view: !!r.data?.can_view,
        can_request: !!r.data?.can_request,
        provider_branch_id: r.data?.provider_branch_id ?? null,
        managed_branch_ids: r.data?.managed_branch_ids ?? [],
        approver_branch_ids: r.data?.approver_branch_ids ?? [],
        requester_branch_ids: r.data?.requester_branch_ids ?? [],
      })),
    staleTime: 5 * 60_000,
  });
}

/**
 * v2 `useVehicles`. Sana oralig'i berilsa server har mashina uchun `is_busy` / `has_pending`
 * ni hisoblaydi; `exclude_letter_id` — safarning O'Z bandligi o'ziga qarshi sanalmasin.
 */
export function vehiclesQuery(search: string, onlyActive: boolean, range?: Range, enabled = true) {
  const params: Record<string, string | number | boolean> = {};
  if (search.trim()) params.search = search.trim();
  if (onlyActive) params.only_active = true;
  if (range?.from) params.date_from = range.from;
  if (range?.to) params.date_to = range.to;
  if (range?.excludeLetterId) params.exclude_letter_id = range.excludeLetterId;
  return queryOptions({
    queryKey: vehicleKeys.list(params),
    queryFn: () => apiClient.get(VEHICLES, { params }).then((r) => unwrapList<Vehicle>(r.data)),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Mashina profili: tavsif + statistika (v2 `useVehicleProfile`). */
export function vehicleDetailQuery(id: number) {
  return queryOptions({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => apiClient.get<VehicleFull>(VEHICLE(id)).then((r) => r.data),
    enabled: id > 0,
  });
}

export function vehicleTripsQuery(id: number) {
  return queryOptions({
    queryKey: vehicleKeys.trips(id),
    queryFn: () => apiClient.get(VEHICLE_TRIPS(id)).then((r) => unwrapList<VehicleTrip>(r.data)),
    enabled: id > 0,
  });
}

/**
 * Jonli holat — faqat operator/tasdiqlovchiga va trekker ulangan mashinaga (aks holda 403).
 * `retry: false` — o'chiq trekker JAVOB, tashqi xizmatga qayta urinish sababi emas (v2).
 */
export function vehicleLiveQuery(id: number, enabled: boolean) {
  return queryOptions({
    queryKey: vehicleKeys.live(id),
    queryFn: () => apiClient.get<VehicleLive | null>(VEHICLE_LIVE(id)).then((r) => r.data ?? null),
    enabled: enabled && id > 0,
    refetchInterval: LIVE_REFRESH_MS,
    retry: false,
  });
}

export interface RequestFilters {
  status: string;
  vehicleId: number | null;
  from: string;
  to: string;
  search: string;
}

/** v2 `useVehicleRequestsPaged`: qidiruv va sahifalash SERVERDA (30 talik). */
export function vehicleRequestsQuery(f: RequestFilters, page: number, enabled = true) {
  const params: Record<string, string | number> = { status: f.status, page, size: REQUESTS_PAGE_SIZE };
  if (f.vehicleId != null) params.vehicle_id = f.vehicleId;
  if (f.from) params.date_from = f.from;
  if (f.to) params.date_to = f.to;
  if (f.search.trim()) params.search = f.search.trim();
  return queryOptions({
    queryKey: vehicleKeys.requests(params),
    queryFn: () =>
      apiClient.get<Page<VehicleRequest>>(VEHICLE_REQUESTS, { params }).then((r): Page<VehicleRequest> => ({
        items: r.data?.items ?? [],
        total: r.data?.total ?? 0,
        page: r.data?.page ?? page,
        pages: r.data?.pages ?? 1,
      })),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * «Navbatda» plitkasi — v2 ikki navbatni (pending + awaiting_approval) to'liq yuklab sanardi;
 * mobil faqat serverning `total` ini oladi (`size=1`).
 */
export function requestsCountQuery(status: string, enabled: boolean) {
  const params = { status, page: 1, size: 1 };
  return queryOptions({
    queryKey: vehicleKeys.requests({ ...params, count: true }),
    queryFn: () => apiClient.get<Page<VehicleRequest>>(VEHICLE_REQUESTS, { params }).then((r) => r.data?.total ?? 0),
    enabled,
  });
}

export function fuelTypesQuery(enabled = true) {
  return queryOptions({
    queryKey: vehicleKeys.fuelTypes(),
    queryFn: () => apiClient.get(VEHICLE_FUEL_TYPES).then((r) => unwrapList<FuelType>(r.data)),
    enabled,
  });
}

/** Narx tarixi — faqat varaq ochilganda. */
export function fuelLogsQuery(enabled: boolean) {
  return queryOptions({
    queryKey: vehicleKeys.fuelLogs(),
    queryFn: () => apiClient.get(VEHICLE_FUEL_LOGS).then((r) => unwrapList<FuelLog>(r.data)),
    enabled,
    staleTime: 60_000,
  });
}

/** Haydovchilar — serverning shu sanalar uchun yaroqlilik hukmi bilan (v2 `useDriverOptions`). */
export function driversQuery(range: Range | undefined, enabled: boolean) {
  const params: Record<string, string | number> = {};
  if (range?.from) params.date_from = range.from;
  if (range?.to) params.date_to = range.to;
  if (range?.excludeLetterId) params.exclude_letter_id = range.excludeLetterId;
  return queryOptions({
    queryKey: vehicleKeys.drivers(params),
    queryFn: () => apiClient.get(VEHICLE_DRIVERS, { params }).then((r) => unwrapList<DriverOption>(r.data)),
    enabled,
  });
}

/** Kuzatuv provayderi (Wialon) obyektlari — TASHQI xizmat: faqat forma ochiqda, qayta urinishsiz. */
export function gpsUnitsQuery(enabled: boolean) {
  return queryOptions({
    queryKey: vehicleKeys.gpsUnits(),
    queryFn: () => apiClient.get(VEHICLE_GPS_UNITS).then((r) => unwrapList<GpsUnit>(r.data)),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Tashriflar hisoboti — faqat SAQLANGAN kunlar ustida (v2 `useVehicleVisits`). */
export function visitsQuery(f: VisitFilters, page: number, enabled: boolean) {
  const params = visitParams(f, page, VISITS_PAGE_SIZE);
  return queryOptions({
    queryKey: vehicleKeys.visits(params),
    queryFn: () =>
      apiClient.get<Page<VehicleVisit>>(VEHICLE_VISITS, { params }).then((r): Page<VehicleVisit> => ({
        items: r.data?.items ?? [],
        total: r.data?.total ?? 0,
        page: r.data?.page ?? page,
        pages: r.data?.pages ?? 1,
      })),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

export function driverScopesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: vehicleKeys.driverScopes(),
    queryFn: () => apiClient.get(VEHICLE_DRIVER_SCOPES).then((r) => unwrapList<DriverScope>(r.data)),
    enabled,
  });
}
