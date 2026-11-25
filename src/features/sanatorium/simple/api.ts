// Network side of the simplified flow. Request functions are pure (tested with a mocked client);
// `unavailable` reads return null on a server that does not have the endpoint yet, so screens fall
// back to the classic flow instead of showing an error.
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  SANATORIUM_ARRIVALS, SANATORIUM_ARRIVAL_OPTIONS, SANATORIUM_DOCTOR_SLOTS, SANATORIUM_MY_GUESTS, SANATORIUM_SETUP_STATUS,
  SANATORIUM_STAYS_GROUP_CHECK_IN, SANATORIUM_STAYS_GROUP_CHECK_OUT, SANATORIUM_STAY_EXTEND, SANATORIUM_STAY_MOVE,
  SANATORIUM_STAY_NO_SHOW, SANATORIUM_STAY_PAYMENTS, SANATORIUM_STAY_ROUTE_SHEET, SANATORIUM_STAY_START_EXAM, SANATORIUM_TODAY,
} from '@/api/urls';
import type { Appointment, Stay, StayFull } from '../types';
import { sanKeys } from '../api/queries';
import { checkOut, updatePayment, updateStay } from '../api/mutations';
import type { ArrivalBody, ArrivalOptions, ArrivalResult, MyGuest, OptionsParams, RouteSheet, SetupStatus, TodayData } from './types';
import { isMissingEndpoint, normalizeSlots } from './utils';

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
export const fetchSetupStatus = () => getOrNull<SetupStatus>(SANATORIUM_SETUP_STATUS);
export const fetchMyGuests = async () => {
  const data = await getOrNull<unknown>(SANATORIUM_MY_GUESTS);
  return data == null ? null : unwrapList<MyGuest>(data);
};
export const fetchSlots = async (staffId: number, day: string, minutes: number) =>
  normalizeSlots(await getOrNull<unknown>(SANATORIUM_DOCTOR_SLOTS(staffId), { day, minutes }));

export const todayQuery = (enabled = true) =>
  queryOptions({ queryKey: simpleKeys.today(), queryFn: fetchToday, enabled, staleTime: 30_000, retry: false });
export const optionsQuery = (p: OptionsParams, enabled = true) =>
  queryOptions({ queryKey: simpleKeys.options(p), queryFn: () => fetchArrivalOptions(p), enabled, staleTime: 15_000, retry: false });
export const routeSheetQuery = (stayId: number, enabled = true) =>
  queryOptions({ queryKey: simpleKeys.routeSheet(stayId), queryFn: () => fetchRouteSheet(stayId), enabled: enabled && stayId > 0, retry: false });
export const setupStatusQuery = (enabled = true) => queryOptions({ queryKey: simpleKeys.setup(), queryFn: fetchSetupStatus, enabled, retry: false });
export const myGuestsQuery = (enabled = true) => queryOptions({ queryKey: simpleKeys.myGuests(), queryFn: fetchMyGuests, enabled, retry: false });
export const slotsQuery = (staffId: number, day: string, minutes: number, enabled = true) =>
  queryOptions({ queryKey: simpleKeys.slots(staffId, day, minutes), queryFn: () => fetchSlots(staffId, day, minutes), enabled: enabled && staffId > 0, retry: false });

// ── Writes ──
export const createArrival = (body: ArrivalBody) => apiClient.post<ArrivalResult>(SANATORIUM_ARRIVALS, body).then((r) => r.data);

export type ShortResult = { warnings?: unknown[] } | undefined;

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
export async function addPayment({ id, amount, note, paid_before, whole_group }: { id: number; amount: string; note?: string; paid_before?: string | null; whole_group?: boolean }) {
  try {
    return await apiClient.post<ShortResult>(SANATORIUM_STAY_PAYMENTS(id), { amount, ...(note ? { note } : {}), ...(whole_group ? { whole_group: true } : {}) }).then((r) => r.data);
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
    const total = (Number(paid_before ?? 0) + Number(amount)).toFixed(2);
    return updatePayment({ id, body: { paid_amount: total } });
  }
}
export const markNoShow = ({ id, reason, whole_group }: { id: number; reason?: string; whole_group?: boolean }) =>
  apiClient.post(SANATORIUM_STAY_NO_SHOW(id), { ...(reason ? { reason } : {}), ...(whole_group ? { whole_group: true } : {}) }).then((r) => r.data);
export const groupCheckIn = (stay_ids: number[]) => apiClient.post<{ stays?: Stay[] }>(SANATORIUM_STAYS_GROUP_CHECK_IN, { stay_ids }).then((r) => r.data);
export const groupCheckOut = ({ stay_ids, allow_debt }: { stay_ids: number[]; allow_debt?: boolean }) =>
  apiClient.post<{ stays?: Stay[]; warnings?: unknown[] }>(SANATORIUM_STAYS_GROUP_CHECK_OUT, { stay_ids, ...(allow_debt ? { allow_debt: true } : {}) }).then((r) => r.data);
/** One stay checks out through the classic endpoint, a group through the all-or-nothing one. */
export const checkOutStays = ({ ids, allow_debt }: { ids: number[]; allow_debt?: boolean }): Promise<unknown> =>
  ids.length > 1 ? groupCheckOut({ stay_ids: ids, allow_debt }) : checkOut(ids[0]!);
export const startExam = (stayId: number) => apiClient.post<Appointment>(SANATORIUM_STAY_START_EXAM(stayId)).then((r) => r.data);

const meta = { skipErrorToast: true };
function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sanKeys.all });
}
const hook = <V, R>(fn: (v: V) => Promise<R>) =>
  function useSimpleMutation() {
    const onSuccess = useInvalidate();
    return useMutation({ meta, mutationFn: fn, onSuccess });
  };
export const useCreateArrival = hook(createArrival);
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
