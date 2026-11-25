// Sanatorium "sections" API (part 2): packages, seasonal prices, quote, paid services + orders,
// organizations + invoice, document templates and stay documents, procedure schedule, diet,
// feedback, analytics. Types mirror the backend schemas; money is a string with 2 decimals.
// Query keys live under `sanKeys.all`, so every write below invalidates them via the shared prefix.
import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { appendFile } from '@/api/formFile';
import { unwrapList } from '@/api/response';
import {
  SANATORIUM_ANALYTICS,
  SANATORIUM_DIET,
  SANATORIUM_DIETS,
  SANATORIUM_DOC_TEMPLATE,
  SANATORIUM_DOC_TEMPLATES,
  SANATORIUM_FEEDBACK,
  SANATORIUM_FEEDBACK_MINE,
  SANATORIUM_FEEDBACK_SUMMARY,
  SANATORIUM_KITCHEN_DIET_COUNTS,
  SANATORIUM_KITCHEN_DIET_DAY,
  SANATORIUM_ME,
  SANATORIUM_ORGANIZATION,
  SANATORIUM_ORGANIZATIONS,
  SANATORIUM_ORG_INVOICE,
  SANATORIUM_PACKAGE,
  SANATORIUM_PACKAGE_PHOTO,
  SANATORIUM_PACKAGES,
  SANATORIUM_PACKAGES_REORDER,
  SANATORIUM_PROCEDURE_ROOM,
  SANATORIUM_PROCEDURE_ROOMS,
  SANATORIUM_PROCEDURE_SCHEDULE,
  SANATORIUM_PROCEDURE_SESSION,
  SANATORIUM_QUOTE,
  SANATORIUM_SEASON,
  SANATORIUM_SEASONS,
  SANATORIUM_SERVICE,
  SANATORIUM_SERVICE_ORDER,
  SANATORIUM_SERVICE_ORDERS,
  SANATORIUM_SERVICE_PHOTO,
  SANATORIUM_SERVICE_SLOTS,
  SANATORIUM_SERVICES,
  SANATORIUM_SERVICES_REORDER,
  SANATORIUM_SESSION_BOARD,
  SANATORIUM_SESSION_CANCEL,
  SANATORIUM_SESSION_MARK,
  SANATORIUM_STAY_DIET,
} from '@/api/urls';
import type { GuestLite } from '../types';
import type { OrderStatus, ServiceUnit } from '../utils/sections2';
import { sanKeys, PAGE_SIZE, type Page } from './queries';

export type Json = Record<string, unknown>;
type Photo = { url: string; thumb_url: string } | null;

// ── Types ──
export type SanPackage = {
  id: number;
  name_uz: string; name_ru: string | null; name_en: string | null;
  description_uz: string | null; description_ru: string | null; description_en: string | null;
  nights: number;
  /** Hidden from non-registrar roles. */
  price?: string;
  price_mode: 'per_person' | 'per_room';
  guest_types: string[];
  items: { service_id: number | null; quantity: number; text: string | null; service?: { id: number; name_uz: string; name_ru?: string | null; name_en?: string | null } | null }[];
  child_discount: boolean;
  is_active: boolean;
  sort_order: number;
  photo: Photo;
};
export type DeleteResult = { deleted: boolean; deactivated: boolean; used_by?: number };

export type SeasonRule = {
  id: number; name: string; date_from: string; date_to: string;
  scope: 'all' | 'room_type' | 'rooms' | 'packages'; scope_values: string[];
  mode: 'percent' | 'fixed'; value: string; priority: number; is_active: boolean;
};

export type SanService = {
  id: number;
  name_uz: string; name_ru: string | null; name_en: string | null;
  description_uz: string | null; description_ru: string | null; description_en: string | null;
  category: string | null; price?: string; unit: ServiceUnit; duration_min: number | null; capacity: number;
  needs_booking: boolean; work_from: string | null; work_to: string | null; weekdays: number[];
  is_active: boolean; sort_order: number; photo: Photo;
};
export type Slot = { at: string; capacity: number; free: number; available: boolean };
export type ServiceOrder = {
  id: number; stay_id: number; guest_id: number;
  service: { id: number; name_uz: string; name_ru?: string | null; name_en?: string | null; unit: ServiceUnit; needs_booking: boolean; category: string | null };
  quantity: number; scheduled_at: string | null; unit_price: string; total: string; status: OrderStatus;
  source: 'staff' | 'guest'; note: string | null; created_at: string;
  guest?: { id: number; full_name: string } | null; room_number?: string | null;
};
export type OrderFilter = { stay_id?: number; status?: OrderStatus; service_id?: number; day?: string };

export type Organization = {
  id: number; name: string; tin: string | null; address: string | null; bank_name: string | null; bank_account: string | null;
  bank_mfo: string | null; contact_person: string | null; contact_phone: string | null; contract_no: string | null;
  contract_date: string | null; note: string | null; is_active: boolean;
};
export type OrgInvoice = {
  organization: Organization; period_from: string; period_to: string;
  rows: { no: number; stay_id: number; guest: string; room: string | null; planned_from: string; planned_to: string; nights: number; accommodation: string; services: string; total: string; paid: string }[];
  accommodation_total: string; services_total: string; grand_total: string; paid_amount: string; debt: string;
};

export type DocKind = 'contract' | 'invoice' | 'act' | 'epikriz' | 'org_invoice';
export type DocTemplate = {
  kind: DocKind; is_default: boolean; filename: string | null; updated_at: string | null;
  placeholders: { key: string; description: string }[]; rows?: Record<string, string[]>;
};

export type QuoteResult = {
  start: string; end: string; nights: number; adults: number; children: number; children_discounted: number;
  room: { id: number; number: string; price_per_day: string; price_mode: string } | null;
  package: { id: number; name_uz: string; name_ru?: string | null; name_en?: string | null; nights: number; price_mode: string; amount: string } | null;
  night_lines: { date: string; unit_price: string; persons_charged: number; amount: string; season: string | { name: string } | null }[];
  child_discount: { percent: number; amount: string };
  services: { service_id: number; name_uz: string; name_ru?: string | null; name_en?: string | null; unit: string; quantity: number; unit_price: string; amount: string }[];
  accommodation_total: string; services_total: string; total: string;
};

export type ProcRoom = {
  id: number; name: string; specialty: { id: number; name: string } | null; specialty_id: number | null; capacity: number;
  slot_minutes: number; work_from: string; work_to: string; weekdays: number[]; description: string | null; is_active: boolean;
};
export type SessionStatus = 'planned' | 'done' | 'missed' | 'cancelled';
export type ProcSession = {
  id: number; procedure_id: number; procedure_name: string; sessions_total: number; sessions_done: number; stay_id: number; guest_id: number;
  room: { id: number; name: string } | null; starts_at: string; ends_at: string; duration_min: number; status: SessionStatus;
  note: string | null; done_at: string | null; guest?: { id: number; full_name: string; phone?: string | null } | null;
};
export type SessionBoard = {
  date: string;
  rooms: { room: ProcRoom; sessions: ProcSession[]; counts: { planned: number; done: number; missed: number }; capacity_slots: number; free_slots: number }[];
  unassigned: ProcSession[];
};
export type ScheduleResult = { scheduled: ProcSession[]; unscheduled: number };

export type Diet = { id: number; code: string; name_uz: string; name_ru: string | null; name_en: string | null; description: string | null; sort_order: number; is_active: boolean; stays_count?: number };
export type DietDay = {
  date: string; total: number; by_diet: { diet: Diet | null; count: number }[]; allergy_count: number;
  allergic_guests: { stay_id: number; guest: { id: number; full_name: string }; room: string | { number?: string } | null; allergies: string | null }[];
  guests: { stay_id: number; guest: { id: number; full_name: string }; room: string | { number?: string } | null; diet: Diet | null; diet_note: string | null; allergies: string | null; status: string }[];
};
export type DietCounts = { days: { date: string; total: number; by_diet: Record<string, number>; with_allergies: number }[] };
export type StayDietResult = { stay_id: number; diet: Diet | null; diet_note: string | null; allergies: string | null };

export type FeedbackItem = {
  id: number; stay_id: number; overall: number; room_rating: number | null; food_rating: number | null; staff_rating: number | null;
  comment: string | null; source: string; submitted_at: string | null;
  items: { kind: string; ref_id: number | null; name: string; rating: number; comment: string | null }[];
  stay?: { planned_from: string; planned_to: string; room: string | null } | null; guest?: { id: number; full_name: string; phone?: string | null } | null;
};
export type FeedbackSummary = {
  count: number; average_overall: number | null; average_room: number | null; average_food: number | null; average_staff: number | null;
  distribution: Record<string, number>; doctors: { ref_id: number; name: string; count: number; average: number }[];
  services: { name: string; count: number; average: number }[]; prompted: number;
};
export type FeedbackMine = { count: number; average: number | null; distribution: Record<string, number>; comments: { rating: number; comment: string | null; month: string }[] };

export type Analytics = {
  occupancy: { beds: number; daily: { date: string; occupied: number; beds: number; percent: number }[]; average_percent: number; peak_percent: number };
  arrivals: { total: number; daily: { date: string; count?: number }[] };
  departures: { total: number; daily: { date: string; count?: number }[] };
  stays_ended: number; average_length_of_stay: number | null;
  requests: { total: number; accepted: number; conversion_percent: number; by_source: { source: string; total: number; accepted: number; conversion_percent: number }[] };
  early_leave: { count: number; rate_percent: number; reasons: { reason: string; count: number }[] };
  revenue: { accommodation: string; accommodation_paid: string; accommodation_debt: string; services?: string; total?: string };
  doctors: { staff_id: number; name: string; specialty: string | null; total: number; done: number; scheduled: number; missed: number; cancelled: number; guests: number; per_day: number }[];
  procedures: { prescribed: { name: string; count: number; sessions_total: number; sessions_done: number }[]; rooms?: unknown[] | null };
  feedback: FeedbackSummary | null;
  waitlist: { waiting_now: number; offered_now: number; joined: number; converted: number } | null;
};

export type StayInvoiceRef = { id: number; guest?: GuestLite | null };

// ── Keys ──
const k = (...p: unknown[]) => [...sanKeys.all, 's2', ...p] as const;
export const s2Keys = {
  packages: (all: boolean) => k('packages', all),
  seasons: () => k('seasons'),
  services: (all: boolean) => k('services', all),
  slots: (id: number, day: string) => k('slots', id, day),
  orders: (f: OrderFilter) => k('orders', JSON.stringify(f)),
  orgs: (q: string, all: boolean) => k('orgs', q, all),
  invoice: (id: number, a: string, b: string) => k('invoice', id, a, b),
  templates: () => k('templates'),
  procRooms: (all: boolean) => k('proc-rooms', all),
  board: (day: string, roomId?: number | null) => k('board', day, roomId ?? 0),
  diets: (all: boolean) => k('diets', all),
  dietDay: (day: string) => k('diet-day', day),
  dietCounts: (start: string, days: number) => k('diet-counts', start, days),
  feedback: (f: string) => k('feedback', f),
  feedbackSummary: (a: string, b: string) => k('feedback-summary', a, b),
  feedbackMine: (a: string, b: string) => k('feedback-mine', a, b),
  analytics: (a: string, b: string) => k('analytics', a, b),
  me: () => k('me'),
};

// ── Reads ──
const get = <T,>(url: string, params?: Json) => apiClient.get<T>(url, { params }).then((r) => r.data);
const list = <T,>(url: string, params?: Json) => apiClient.get(url, { params }).then((r) => unwrapList<T>(r.data));

export const packagesQuery = (all: boolean, enabled = true) =>
  queryOptions({ queryKey: s2Keys.packages(all), queryFn: () => list<SanPackage>(SANATORIUM_PACKAGES, { include_inactive: all }), enabled });
export const seasonsQuery = (enabled = true) => queryOptions({ queryKey: s2Keys.seasons(), queryFn: () => list<SeasonRule>(SANATORIUM_SEASONS), enabled });
export const servicesQuery = (all: boolean, enabled = true) =>
  queryOptions({ queryKey: s2Keys.services(all), queryFn: () => list<SanService>(SANATORIUM_SERVICES, { include_inactive: all }), enabled });
export const slotsQuery = (id: number, day: string, enabled = true) =>
  queryOptions({ queryKey: s2Keys.slots(id, day), queryFn: () => list<Slot>(SANATORIUM_SERVICE_SLOTS(id), { day }), enabled: enabled && id > 0, staleTime: 0 });
export const orgsQuery = (q: string, all: boolean, enabled = true) =>
  queryOptions({ queryKey: s2Keys.orgs(q.trim(), all), queryFn: () => list<Organization>(SANATORIUM_ORGANIZATIONS, { ...(q.trim() ? { q: q.trim() } : {}), include_inactive: all }), enabled });
export const invoiceQuery = (id: number, start: string, end: string, enabled = true) =>
  queryOptions({ queryKey: s2Keys.invoice(id, start, end), queryFn: () => get<OrgInvoice>(SANATORIUM_ORG_INVOICE(id), { start, end }), enabled: enabled && id > 0 && end >= start, staleTime: 0 });
export const templatesQuery = (enabled = true) => queryOptions({ queryKey: s2Keys.templates(), queryFn: () => list<DocTemplate>(SANATORIUM_DOC_TEMPLATES), enabled });
export const procRoomsQuery = (all: boolean, enabled = true) =>
  queryOptions({ queryKey: s2Keys.procRooms(all), queryFn: () => list<ProcRoom>(SANATORIUM_PROCEDURE_ROOMS, { include_inactive: all }), enabled });
export const boardQuery = (day: string, enabled = true, roomId?: number | null) =>
  queryOptions({ queryKey: s2Keys.board(day, roomId), queryFn: () => get<SessionBoard>(SANATORIUM_SESSION_BOARD, { day, ...(roomId ? { room_id: roomId } : {}) }), enabled });
export const dietsQuery = (all: boolean, enabled = true) =>
  queryOptions({ queryKey: s2Keys.diets(all), queryFn: () => list<Diet>(SANATORIUM_DIETS, { include_inactive: all }), enabled });
export const dietDayQuery = (day: string, enabled = true) =>
  queryOptions({ queryKey: s2Keys.dietDay(day), queryFn: () => get<DietDay>(SANATORIUM_KITCHEN_DIET_DAY, { day }), enabled });
export const dietCountsQuery = (start: string, days: number, enabled = true) =>
  queryOptions({ queryKey: s2Keys.dietCounts(start, days), queryFn: () => get<DietCounts>(SANATORIUM_KITCHEN_DIET_COUNTS, { start, days }), enabled });
export const feedbackSummaryQuery = (from: string, to: string, enabled = true) =>
  queryOptions({ queryKey: s2Keys.feedbackSummary(from, to), queryFn: () => get<FeedbackSummary>(SANATORIUM_FEEDBACK_SUMMARY, { from, to }), enabled });
export const feedbackMineQuery = (from: string, to: string, enabled = true) =>
  queryOptions({ queryKey: s2Keys.feedbackMine(from, to), queryFn: () => get<FeedbackMine>(SANATORIUM_FEEDBACK_MINE, { from, to }), enabled });
export const analyticsQuery = (from: string, to: string, enabled = true) =>
  queryOptions({ queryKey: s2Keys.analytics(from, to), queryFn: () => get<Analytics>(SANATORIUM_ANALYTICS, { from, to }), enabled });
/** Staff id of the signed-in user (to tell whether a stay's attending doctor is me). */
export const sanMeQuery = (enabled = true) =>
  queryOptions({ queryKey: s2Keys.me(), queryFn: () => get<{ staff_id: number | null; roles: string[] }>(SANATORIUM_ME), enabled, staleTime: 5 * 60_000 });

const nextPage = <T,>(last: Page<T>, all: Page<T>[]) => (all.reduce((n, p) => n + p.items.length, 0) < last.total && last.items.length > 0 ? last.page + 1 : undefined);
const pageOf = <T,>(url: string, params: Json, page: number) =>
  apiClient.get(url, { params: { ...params, page, size: PAGE_SIZE } }).then((r): Page<T> => {
    const d = r.data as { items?: T[]; total?: number } | T[];
    const items = unwrapList<T>(d);
    return { items, total: Array.isArray(d) ? items.length : (d?.total ?? items.length), page };
  });
export const ordersInfinite = (f: OrderFilter, enabled = true) =>
  infiniteQueryOptions({
    queryKey: s2Keys.orders(f),
    queryFn: ({ pageParam }) => pageOf<ServiceOrder>(SANATORIUM_SERVICE_ORDERS, f, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  });
export type FeedbackFilter = {
  from?: string; to?: string; min_overall?: number; max_overall?: number; doctor_staff_id?: number; source?: string; q?: string;
};
export const feedbackInfinite = (f: FeedbackFilter | Json, enabled = true) =>
  infiniteQueryOptions({
    queryKey: s2Keys.feedback(JSON.stringify(f)),
    queryFn: ({ pageParam }) => pageOf<FeedbackItem>(SANATORIUM_FEEDBACK, f, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled,
  });

// ── Writes ──
export const quote = (body: Json) => apiClient.post<QuoteResult>(SANATORIUM_QUOTE, body).then((r) => r.data);
const save = <T,>(base: string, one: (id: number) => string) => ({ id, body }: { id?: number; body: Json }) =>
  (id ? apiClient.put<T>(one(id), body) : apiClient.post<T>(base, body)).then((r) => r.data);
export const savePackage = save<SanPackage>(SANATORIUM_PACKAGES, SANATORIUM_PACKAGE);
export const saveSeason = save<SeasonRule>(SANATORIUM_SEASONS, SANATORIUM_SEASON);
export const saveService = save<SanService>(SANATORIUM_SERVICES, SANATORIUM_SERVICE);
export const saveOrganization = save<Organization>(SANATORIUM_ORGANIZATIONS, SANATORIUM_ORGANIZATION);
export const saveProcRoom = save<ProcRoom>(SANATORIUM_PROCEDURE_ROOMS, SANATORIUM_PROCEDURE_ROOM);
export const saveDiet = save<Diet>(SANATORIUM_DIETS, SANATORIUM_DIET);

const del = (url: string) => apiClient.delete<DeleteResult | undefined>(url).then((r) => r.data);
export const deletePackage = (id: number) => del(SANATORIUM_PACKAGE(id));
export const deleteSeason = (id: number) => del(SANATORIUM_SEASON(id));
export const deleteService = (id: number) => del(SANATORIUM_SERVICE(id));
export const deleteOrganization = (id: number) => del(SANATORIUM_ORGANIZATION(id));
export const deleteProcRoom = (id: number) => del(SANATORIUM_PROCEDURE_ROOM(id));
export const deleteDiet = (id: number) => del(SANATORIUM_DIET(id));
export const deleteServiceOrder = (id: number) => del(SANATORIUM_SERVICE_ORDER(id));

export const reorderPackages = (ids: number[]) => apiClient.post<SanPackage[]>(SANATORIUM_PACKAGES_REORDER, { ids }).then((r) => r.data);
export const reorderServices = (ids: number[]) => apiClient.post<SanService[]>(SANATORIUM_SERVICES_REORDER, { ids }).then((r) => r.data);

export type PickedFile = { uri: string; name: string; mimeType: string };
async function upload<T>(url: string, f: PickedFile, method: 'post' | 'put' = 'post'): Promise<T> {
  const fd = new FormData();
  await appendFile(fd, 'file', f);
  const config = { headers: { 'Content-Type': 'multipart/form-data' } };
  return (method === 'put' ? apiClient.put<T>(url, fd, config) : apiClient.post<T>(url, fd, config)).then((r) => r.data);
}
export const uploadPackagePhoto = ({ id, file }: { id: number; file: PickedFile }) => upload<SanPackage>(SANATORIUM_PACKAGE_PHOTO(id), file);
export const deletePackagePhoto = (id: number) => apiClient.delete<SanPackage>(SANATORIUM_PACKAGE_PHOTO(id)).then((r) => r.data);
export const uploadServicePhoto = ({ id, file }: { id: number; file: PickedFile }) => upload<SanService>(SANATORIUM_SERVICE_PHOTO(id), file);
export const deleteServicePhoto = (id: number) => apiClient.delete<SanService>(SANATORIUM_SERVICE_PHOTO(id)).then((r) => r.data);

export const createServiceOrder = (body: Json) => apiClient.post<ServiceOrder>(SANATORIUM_SERVICE_ORDERS, body).then((r) => r.data);
/** Registrar paper feedback form (`stay_id` is required for staff). */
export const createFeedback = (body: Json) => apiClient.post<FeedbackItem>(SANATORIUM_FEEDBACK, body).then((r) => r.data);
export const patchServiceOrder = ({ id, body }: { id: number; body: Json }) => apiClient.patch<ServiceOrder>(SANATORIUM_SERVICE_ORDER(id), body).then((r) => r.data);
/** requested -> confirmed (the server re-checks the slot). */
export const confirmOrder = (id: number) => patchServiceOrder({ id, body: { status: 'confirmed' } });

/** DOCX template upload (multipart `file`, max 5 MB); the server test-renders it first. */
export const uploadTemplate = ({ kind, file }: { kind: DocKind; file: PickedFile }) => upload<DocTemplate>(SANATORIUM_DOC_TEMPLATE(kind), file, 'put');
export const resetTemplate = (kind: DocKind) => apiClient.delete(SANATORIUM_DOC_TEMPLATE(kind)).then((r) => r.data);

export const scheduleProcedure = ({ procedureId, body }: { procedureId: number; body: Json }) =>
  apiClient.post<ScheduleResult>(SANATORIUM_PROCEDURE_SCHEDULE(procedureId), body).then((r) => r.data);
export const rescheduleSession = ({ id, body }: { id: number; body: Json }) => apiClient.patch<ProcSession>(SANATORIUM_PROCEDURE_SESSION(id), body).then((r) => r.data);
export const cancelSession = ({ id, note }: { id: number; note?: string }) => apiClient.post(SANATORIUM_SESSION_CANCEL(id), note ? { note } : {}).then((r) => r.data);
export const markSession = ({ id, status, note }: { id: number; status: 'done' | 'missed' | 'planned'; note?: string }) =>
  apiClient.post<ProcSession>(SANATORIUM_SESSION_MARK(id), { status, ...(note ? { note } : {}) }).then((r) => r.data);

export const saveStayDiet = ({ id, body }: { id: number; body: Json }) => apiClient.patch<StayDietResult>(SANATORIUM_STAY_DIET(id), body).then((r) => r.data);

// ── Hooks ──
const meta = { skipErrorToast: true };
const hook = <V, R>(fn: (v: V) => Promise<R>) =>
  function useS2Mutation() {
    const qc = useQueryClient();
    return useMutation({ meta, networkMode: 'always', mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: sanKeys.all }) });
  };
export const useQuote = () => useMutation({ meta, networkMode: 'always', mutationFn: quote });
export const useSavePackage = hook(savePackage);
export const useSaveSeason = hook(saveSeason);
export const useSaveService = hook(saveService);
export const useSaveOrganization = hook(saveOrganization);
export const useSaveProcRoom = hook(saveProcRoom);
export const useSaveDiet = hook(saveDiet);
export const useDeletePackage = hook(deletePackage);
export const useDeleteSeason = hook(deleteSeason);
export const useDeleteService = hook(deleteService);
export const useDeleteOrganization = hook(deleteOrganization);
export const useDeleteProcRoom = hook(deleteProcRoom);
export const useDeleteDiet = hook(deleteDiet);
export const useDeleteServiceOrder = hook(deleteServiceOrder);
export const useReorderPackages = hook(reorderPackages);
export const useReorderServices = hook(reorderServices);
export const useUploadPackagePhoto = hook(uploadPackagePhoto);
export const useDeletePackagePhoto = hook(deletePackagePhoto);
export const useUploadServicePhoto = hook(uploadServicePhoto);
export const useDeleteServicePhoto = hook(deleteServicePhoto);
export const useCreateServiceOrder = hook(createServiceOrder);
export const usePatchServiceOrder = hook(patchServiceOrder);
export const useUploadTemplate = hook(uploadTemplate);
export const useResetTemplate = hook(resetTemplate);
export const useScheduleProcedure = hook(scheduleProcedure);
export const useRescheduleSession = hook(rescheduleSession);
export const useCancelSession = hook(cancelSession);
export const useMarkSession = hook(markSession);
export const useSaveStayDiet = hook(saveStayDiet);
export const useCreateFeedback = hook(createFeedback);
export const useConfirmOrder = hook(confirmOrder);

/** Diet is set per stay (not part of the create body): applied after the stays exist. Failures are returned, not thrown. */
export async function applyDietToStays(stayIds: number[], dietId: number | null): Promise<unknown | null> {
  if (dietId == null) return null;
  try {
    await Promise.all(stayIds.map((id) => saveStayDiet({ id, body: { diet_id: dietId } })));
    return null;
  } catch (e) {
    return e;
  }
}
