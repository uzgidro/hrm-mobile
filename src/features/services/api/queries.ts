import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { SERVICE_REQUEST, SERVICE_REQUESTS, SERVICE_REQUESTS_CATALOG, SERVICE_REQUESTS_MY } from '@/api/urls';
import type { ServiceStatus } from '../utils/services';

export interface ServiceRequestRow {
  id: number;
  number: string;
  service_type: string;
  status: ServiceStatus;
  purpose?: string | null;
  employee_id?: number | null;
  applicant_name?: string | null;
  applicant_photo_thumb_path?: string | null;
  assignee_name?: string | null;
  submitted_at?: string | null;
  payload?: Record<string, unknown> | null;
  due_date?: string | null;
  resolution?: string | null;
  has_document: boolean;
}

export interface ServiceEvent {
  id: number;
  actor_name?: string | null;
  from_status?: string | null;
  to_status: string;
  comment?: string | null;
  created_at?: string | null;
}

export interface ServiceRequestDetail extends ServiceRequestRow {
  events: ServiceEvent[];
}

export interface ServiceCatalogItem {
  type: string;
  label: string;
  available: boolean;
  reason?: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  pages: number;
}

export const SERVICES_PAGE_SIZE = 20;
export const serviceKeys = {
  all: ['services'] as const,
  catalog: () => [...serviceKeys.all, 'catalog'] as const,
  mine: (p: object) => [...serviceKeys.all, 'mine', p] as const,
  inbox: (p: object) => [...serviceKeys.all, 'inbox', p] as const,
  detail: (id: number) => [...serviceKeys.all, 'detail', id] as const,
};

function toPage<T>(data: unknown): Page<T> {
  const d = (data ?? {}) as { items?: T[]; total?: number; pages?: number };
  const items = Array.isArray(data) ? (data as T[]) : (d.items ?? []);
  return { items, total: d.total ?? items.length, pages: d.pages ?? 1 };
}

export function serviceCatalogQuery() {
  return queryOptions({
    queryKey: serviceKeys.catalog(),
    queryFn: () => apiClient.get(SERVICE_REQUESTS_CATALOG).then((r) => unwrapList<ServiceCatalogItem>(r.data)),
    staleTime: 10 * 60 * 1000,
  });
}

export function myServiceRequestsQuery(f: { status: string; page: number }) {
  const params: Record<string, string | number> = { page: f.page, size: SERVICES_PAGE_SIZE };
  if (f.status) params.status = f.status;
  return queryOptions({
    queryKey: serviceKeys.mine(params),
    queryFn: () => apiClient.get(SERVICE_REQUESTS_MY, { params }).then((r) => toPage<ServiceRequestRow>(r.data)),
    placeholderData: keepPreviousData,
  });
}

/** Faqat reviewer (HR / bosh admin); boshqalarga 403 — «bo'sh» emas, xato. */
export function serviceInboxQuery(f: { status: string; page: number }, enabled: boolean) {
  const params: Record<string, string | number> = { page: f.page, size: SERVICES_PAGE_SIZE };
  if (f.status) params.status = f.status;
  return queryOptions({
    queryKey: serviceKeys.inbox(params),
    queryFn: () => apiClient.get(SERVICE_REQUESTS, { params }).then((r) => toPage<ServiceRequestRow>(r.data)),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

export function serviceRequestQuery(id: number) {
  return queryOptions({
    queryKey: serviceKeys.detail(id),
    queryFn: () => apiClient.get<ServiceRequestDetail>(SERVICE_REQUEST(id)).then((r) => r.data),
  });
}
