import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { MEDICAL_EMPLOYEE, MEDICAL_EMPLOYEES, MEDICAL_SPECIALTIES, ORGANIZATION_BRANCHES } from '@/api/urls';
import {
  medicalParams,
  type MedicalDetail,
  type MedicalFilters,
  type MedicalPage,
  type Specialty,
} from '../utils/medical';

/** Mobil `apiClient` global filial qo'shmaydi — filial faqat foydalanuvchi filtri bo'lsa ketadi. */
export const MEDICAL_PAGE_SIZE = 20;

export const medicalKeys = {
  all: ['medical'] as const,
  list: (p: object) => [...medicalKeys.all, 'list', p] as const,
  count: (p: object) => [...medicalKeys.all, 'count', p] as const,
  detail: (id: number) => [...medicalKeys.all, 'detail', id] as const,
  specialties: () => [...medicalKeys.all, 'specialties'] as const,
  branches: () => [...medicalKeys.all, 'branches'] as const,
};

/**
 * v2 `useMedicalEmployees`: server sahifalaydi va qidiradi. `PaginatedList` da `pages`
 * YO'Q — sahifalar soni `total / size` dan (v2 izohi).
 */
export function medicalEmployeesQuery(f: MedicalFilters, page: number, enabled = true) {
  const params = { page, size: MEDICAL_PAGE_SIZE, ...medicalParams(f) };
  return queryOptions({
    queryKey: medicalKeys.list(params),
    queryFn: () =>
      apiClient
        .get<Partial<MedicalPage>>(MEDICAL_EMPLOYEES, { params })
        .then((r): MedicalPage => ({ items: r.data?.items ?? [], total: r.data?.total ?? 0 })),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/**
 * Holat plitkasi soni: xuddi shu toraytirish, bitta qator (`size=1`) — ro'yxat serverda
 * sahifalanadi, sahifani sanash yolg'on bo'lardi (v2 `countArgs`). `status` — '' = hammasi.
 */
export function medicalCountQuery(f: MedicalFilters, status: string, enabled = true) {
  const params = { page: 1, size: 1, ...medicalParams({ ...f, status }) };
  return queryOptions({
    queryKey: medicalKeys.count(params),
    queryFn: () => apiClient.get<Partial<MedicalPage>>(MEDICAL_EMPLOYEES, { params }).then((r) => r.data?.total ?? 0),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Xodimning tibbiy kartasi: barcha doktorlar yozuvi + yillik indekslar + huquq bayroqlari. */
export function medicalDetailQuery(id: number) {
  return queryOptions({
    queryKey: medicalKeys.detail(id),
    queryFn: () => apiClient.get<MedicalDetail>(MEDICAL_EMPLOYEE(id)).then((r) => r.data),
  });
}

/** Doktor turlari katalogi — faqat o'z turi bo'lmagan yozuvchiga kerak (v2 `useSpecialties(enabled)`). */
export function specialtiesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: medicalKeys.specialties(),
    queryFn: () => apiClient.get(MEDICAL_SPECIALTIES).then((r) => unwrapList<Specialty>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}

/** Filial filtri ro'yxati — tanlagich ochilganda. */
export function medicalBranchesQuery(enabled: boolean) {
  return queryOptions({
    queryKey: medicalKeys.branches(),
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<{ id: number; name?: string | null }>(r.data)),
    enabled,
    staleTime: 10 * 60_000,
  });
}
