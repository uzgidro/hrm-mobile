// Network side of the simplified flow. Request functions are pure (tested with a mocked client);
// `unavailable` reads return null on a server that does not have the endpoint yet, so screens fall
// back to the classic flow instead of showing an error.
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  SANATORIUM_APPOINTMENTS, SANATORIUM_ARRIVALS, SANATORIUM_ARRIVAL_OPTIONS, SANATORIUM_DOCTOR_SLOTS, SANATORIUM_GUESTS, SANATORIUM_MY_GUESTS, SANATORIUM_QUOTE, SANATORIUM_SETUP_STATUS, SANATORIUM_STAY,
  SANATORIUM_STAYS, SANATORIUM_STAY_EARLY_PREVIEW, SANATORIUM_STAYS_GROUP_CHECK_IN, SANATORIUM_STAYS_GROUP_CHECK_OUT, SANATORIUM_STAY_EXTEND, SANATORIUM_STAY_MOVE,
  SANATORIUM_STAY_NO_SHOW, SANATORIUM_STAY_PAYMENTS, SANATORIUM_STAY_ROUTE_SHEET, SANATORIUM_STAY_START_EXAM, SANATORIUM_TODAY,
} from '@/api/urls';
import type { Appointment, GuestLite, Stay, StayFull } from '../types';
import { sanKeys } from '../api/queries';
import { checkIn, checkOut, updatePayment, updateStay } from '../api/mutations';
import type { EarlyPreview, ArrivalBody, ArrivalOptions, ArrivalResult, MyGuest, OptionsParams, RouteSheet, SetupStatus, TodayData } from './types';
import { isMissingEndpoint, normalizeSlots, rejectsClientRef } from './utils';

export const simpleKeys = {
  today: () => [...sanKeys.all, 'today'] as const,
  options: (p: OptionsParams) => [...sanKeys.all, 'arrival-options', p] as const,
  routeSheet: (stayId: number) => [...sanKeys.all, 'route-sheet', stayId] as const,
  setup: () => [...sanKeys.all, 'setup-status'] as const,
  myGuests: () => [...sanKeys.all, 'my-guests'] as const,
  slots: (staffId: number, day: string, minutes: number) => [...sanKeys.all, 'slots', staffId, day, minutes] as const,
};

/** GET that maps «endpoint not on this server» to null. */
async function getOrNull<T>(url: string, params?: Record<string, unknown>): Promise<T | null> {
  try {
    return (await apiClient.get<T>(url, params ? { params } : undefined)).data ?? null;
  } catch (e) {
    if (isMissingEndpoint(e)) return null;
    throw e;
  }
}

export const fetchToday = () => getOrNull<TodayData>(SANATORIUM_TODAY);
export const fetchArrivalOptions = (p: OptionsParams) => apiClient.get<ArrivalOptions>(SANATORIUM_ARRIVAL_OPTIONS, { params: p }).then((r) => r.data);
export const fetchRouteSheet = (stayId: number) => getOrNull<RouteSheet>(SANATORIUM_STAY_ROUTE_SHEET(stayId));
/** Print-ready route sheet; the endpoint is newer than the JSON one. */
export const routeSheetFileUrl = (stayId: number) => `${SANATORIUM_STAY_ROUTE_SHEET(stayId)}/file`;
/**
 * Stays of one family / group in a given status. The server filters by `group_key`; an older one ignores the
 * parameter, which shows as a page of foreign rows: then the list is paged and filtered here.
 */
export async function fetchGroupStays(groupKey: string, status: string): Promise<StayFull[]> {
  const found: StayFull[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const rows = unwrapList<StayFull>((await apiClient.get(SANATORIUM_STAYS, { params: { group_key: groupKey, status, size: 100, page } })).data);
    const mine = rows.filter((s) => s.group_key === groupKey);
    found.push(...mine);
    if (mine.length === rows.length || rows.length < 100) break;
  }
  return found;
}
/** What a repeated submit (`duplicate_submit`) had already created: the same screen without the one-time passwords. */
export async function fetchCreated(ids: number[]): Promise<ArrivalResult> {
  const [stays, sheets] = await Promise.all([
    Promise.all(ids.map((id) => apiClient.get<StayFull>(SANATORIUM_STAY(id)).then((r) => r.data))),
    Promise.all(ids.map((id) => fetchRouteSheet(id).catch(() => null))),
  ]);
  const route_sheets = sheets.filter((x): x is RouteSheet => !!x);
  return { stays, group_key: stays[0]?.group_key ?? null, credentials: [], warnings: [], route_sheet: route_sheets[0] ?? null, route_sheets };
}
export const fetchSetupStatus = () => getOrNull<SetupStatus>(SANATORIUM_SETUP_STATUS);
export const fetchMyGuests = async () => {
  const data = await getOrNull<unknown>(SANATORIUM_MY_GUESTS);
  return data == null ? null : unwrapList<MyGuest>(data);
};
export const fetchSlots = async (staffId: number, day: string, minutes: number) =>
  normalizeSlots(await getOrNull<unknown>(SANATORIUM_DOCTOR_SLOTS(staffId), { day, minutes }));

export const todayQuery = (enabled = true) =>
  queryOptions({ queryKey: simpleKeys.today(), queryFn: fetchToday, enabled, staleTime: 30_000, refetchInterval: (q) => (q.state.data ? 45_000 : false), retry: false });
export const optionsQuery = (p: OptionsParams, enabled = true) =>
  queryOptions({ queryKey: simpleKeys.options(p), queryFn: () => fetchArrivalOptions(p), enabled, staleTime: 15_000, retry: false, placeholderData: keepPreviousData, meta: { skipErrorToast: true } });
/** People already on file with a similar name (the wizard asks «maybe they have been here before?»). */
export const guestMatchesQuery = (q: string) =>
  queryOptions({
    queryKey: [...sanKeys.all, 'guest-matches', q.trim()],
    queryFn: () => apiClient.get(SANATORIUM_GUESTS, { params: { q: q.trim(), size: 6 } }).then((r) => unwrapList<GuestLite>(r.data)),
    enabled: q.trim().length >= 3,
    retry: false,
    meta: { skipErrorToast: true },
  });
/** Relatives of a guest. An older server ignores `family_id`: rows of other families are dropped. */
export const familyGuestsQuery = (familyId: number) =>
  queryOptions({
    queryKey: [...sanKeys.all, 'family-guests', familyId],
    queryFn: () => apiClient.get(SANATORIUM_GUESTS, { params: { family_id: familyId, size: 20 } }).then((r) => unwrapList<GuestLite>(r.data).filter((g) => g.family_id === familyId)),
    enabled: familyId > 0,
    retry: false,
    meta: { skipErrorToast: true },
  });
/** Rough total by the server's own calculator; silent when it is not available. */
export const estimateQuery = (body: Record<string, unknown>, enabled: boolean) =>
  queryOptions({
    queryKey: [...sanKeys.all, 'arrival-quote', body],
    queryFn: () => apiClient.post<{ total?: string | null }>(SANATORIUM_QUOTE, body).then((r) => r.data),
    enabled,
    retry: false,
    staleTime: 30_000,
    meta: { skipErrorToast: true },
  });
export const groupStaysQuery = (groupKey: string | null | undefined, status: string, enabled = true) =>
  queryOptions({ queryKey: [...sanKeys.all, 'group-stays', groupKey, status], queryFn: () => fetchGroupStays(groupKey!, status), enabled: enabled && !!groupKey, retry: false });
export const routeSheetQuery = (stayId: number, enabled = true) =>
  queryOptions({ queryKey: simpleKeys.routeSheet(stayId), queryFn: () => fetchRouteSheet(stayId), enabled: enabled && stayId > 0, retry: false });
export const stayAppointmentsQuery = (stayId: number, enabled = true) =>
  queryOptions({
    queryKey: [...sanKeys.all, 'stay-appointments', stayId],
    queryFn: () => apiClient.get(SANATORIUM_APPOINTMENTS, { params: { stay_id: stayId } }).then((r) => unwrapList<Appointment>(r.data)),
    enabled: enabled && stayId > 0,
    retry: false,
    meta: { skipErrorToast: true },
  });
/** Money after an early departure on `date`; null where the server cannot tell yet (no money line then). */
export const earlyPreviewQuery = (stayId: number, date: string, whole: boolean, enabled = true) =>
  queryOptions({
    queryKey: [...sanKeys.all, 'early-preview', stayId, date, whole],
    queryFn: () => apiClient.get<EarlyPreview>(SANATORIUM_STAY_EARLY_PREVIEW(stayId), { params: { date, whole_group: whole } }).then((r) => r.data ?? null).catch(() => null),
    enabled: enabled && stayId > 0,
    retry: false,
    staleTime: 0,
    meta: { skipErrorToast: true },
  });
export const setupStatusQuery = (enabled = true) => queryOptions({ queryKey: simpleKeys.setup(), queryFn: fetchSetupStatus, enabled, retry: false });
export const myGuestsQuery = (enabled = true) => queryOptions({ queryKey: simpleKeys.myGuests(), queryFn: fetchMyGuests, enabled, retry: false });
export const slotsQuery = (staffId: number, day: string, minutes: number, enabled = true) =>
  queryOptions({ queryKey: simpleKeys.slots(staffId, day, minutes), queryFn: () => fetchSlots(staffId, day, minutes), enabled: enabled && staffId > 0, retry: false });

// ── Writes ──
/** An in-between server that rejects `client_ref` (strict body) gets the same request without it. */
async function postWithRef<T>(url: string, body: Record<string, unknown>): Promise<T> {
  try {
    return (await apiClient.post<T>(url, body)).data;
  } catch (e) {
    if (!rejectsClientRef(e)) throw e;
    const { client_ref: _ref, ...rest } = body;
    return (await apiClient.post<T>(url, rest)).data;
  }
}
export const createArrival = (body: ArrivalBody) => postWithRef<ArrivalResult>(SANATORIUM_ARRIVALS, body);

export type ShortResult = { stay?: StayFull; stays?: StayFull[]; warnings?: unknown[]; replayed?: boolean } | undefined;

/** Extend the stay; an older server without /extend gets the classic PATCH (single stay only). */
export async function extendStay({ id, planned_to, whole_group }: { id: number; planned_to: string; whole_group?: boolean }) {
  try {
    return await apiClient.post<ShortResult>(SANATORIUM_STAY_EXTEND(id), { planned_to, ...(whole_group ? { whole_group: true } : {}) }).then((r) => r.data);
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    return updateStay({ id, body: { planned_to } });
  }
}
export async function moveStay({ id, room_id, from_date, whole_group }: { id: number; room_id: number; from_date?: string; whole_group?: boolean }) {
  try {
    return await apiClient.post<ShortResult>(SANATORIUM_STAY_MOVE(id), { room_id, ...(from_date ? { from_date } : {}), ...(whole_group ? { whole_group: true } : {}) }).then((r) => r.data);
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    return updateStay({ id, body: { room_id } });
  }
}
/** ADDS to the paid amount. Old servers only know «set the total», so the previous amount is added client-side. */
export async function addPayment({ id, amount, note, paid_before, whole_group, client_ref }: { id: number; amount: string; note?: string; paid_before?: string | null; whole_group?: boolean; client_ref?: string }) {
  try {
    return await postWithRef<ShortResult>(SANATORIUM_STAY_PAYMENTS(id), { amount, ...(note ? { note } : {}), ...(whole_group ? { whole_group: true } : {}), ...(client_ref ? { client_ref } : {}) });
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    const total = (Number(paid_before ?? 0) + Number(amount)).toFixed(2);
    return updatePayment({ id, body: { paid_amount: total } });
  }
}
export const markNoShow = ({ id, reason, whole_group }: { id: number; reason?: string; whole_group?: boolean }) =>
  apiClient.post<ShortResult>(SANATORIUM_STAY_NO_SHOW(id), { ...(reason ? { reason } : {}), ...(whole_group ? { whole_group: true } : {}) }).then((r) => r.data);
type GroupWarning = { code: string; room_number?: string; hk_status?: string };
/** Whole family at once; an older server has no group endpoints, so the classic single calls run one by one. */
export async function groupCheckIn(stay_ids: number[]) {
  try {
    return await apiClient.post<{ stays?: Stay[]; warnings?: GroupWarning[] }>(SANATORIUM_STAYS_GROUP_CHECK_IN, { stay_ids }).then((r) => r.data);
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    const stays: Stay[] = [];
    for (const id of stay_ids) stays.push(await checkIn(id));
    return { stays, warnings: [] as GroupWarning[] };
  }
}
export async function groupCheckOut({ stay_ids, allow_debt }: { stay_ids: number[]; allow_debt?: boolean }) {
  try {
    return await apiClient.post<{ stays?: Stay[]; warnings?: unknown[] }>(SANATORIUM_STAYS_GROUP_CHECK_OUT, { stay_ids, ...(allow_debt ? { allow_debt: true } : {}) }).then((r) => r.data);
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    const stays: Stay[] = [];
    for (const id of stay_ids) stays.push(await checkOut(id));
    return { stays, warnings: [] as unknown[] };
  }
}
/** `group`: the all-or-nothing endpoint that also checks the debt (falls back to the classic calls on an older server). */
export const checkOutStays = ({ ids, allow_debt, group }: { ids: number[]; allow_debt?: boolean; group?: boolean }): Promise<unknown> =>
  group || ids.length > 1 ? groupCheckOut({ stay_ids: ids, allow_debt }) : checkOut(ids[0]!);
export const startExam = (stayId: number) => apiClient.post<Appointment>(SANATORIUM_STAY_START_EXAM(stayId)).then((r) => r.data);

const meta = { skipErrorToast: true };
function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sanKeys.all });
}
const hook = <V, R>(fn: (v: V) => Promise<R>) =>
  function useSimpleMutation() {
    const onSuccess = useInvalidate();
    // Without a connection the press answers at once («check the internet») instead of spinning until it comes back.
    return useMutation({ meta, mutationFn: fn, networkMode: 'always', onSuccess });
  };
/** A placed request / booking is gone for good: refetching its options would only answer 409 request_handled. */
export function useCreateArrival() {
  const qc = useQueryClient();
  return useMutation({
    meta,
    mutationFn: createArrival,
    networkMode: 'always',
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sanKeys.all, predicate: (q) => q.queryKey[1] !== 'arrival-options' });
      void qc.invalidateQueries({ queryKey: [...sanKeys.all, 'arrival-options'], refetchType: 'none' });
      // The queue and its counters are fresh when the registrar comes back, even if that screen is asleep.
      void qc.refetchQueries({ queryKey: simpleKeys.today(), type: 'all' });
    },
  });
}
export const useExtendStay = hook(extendStay);
export const useMoveStay = hook(moveStay);
export const useAddPayment = hook(addPayment);
export const useNoShow = hook(markNoShow);
export const useCheckOutStays = hook(checkOutStays);
export const useGroupCheckIn = hook(groupCheckIn);
export const useStartExam = hook(startExam);

/** Server `debt` warnings of a check-out / short action response. */
export function debtFromWarnings(res: unknown): number {
  const w = (res as { warnings?: unknown[] } | null | undefined)?.warnings;
  return (Array.isArray(w) ? w : [])
    .filter((x): x is { code: string; amount?: string | number } => !!x && typeof x === 'object' && (x as { code?: string }).code === 'debt')
    .reduce((sum, x) => sum + (Number(x.amount ?? 0) || 0), 0);
}
export type { StayFull };
