// Write side of the sanatorium module. Bodies are STRICT on the server (unknown key -> 422).
// Credentials returned by `acceptRequest` are handed to the caller once and never cached:
// the mutation is `reset()` by the screen right after it has read the result.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  SANATORIUM_APPOINTMENT_FINISH,
  SANATORIUM_APPOINTMENT_NOTIFIED,
  SANATORIUM_APPOINTMENT_REFER,
  SANATORIUM_MENU,
  SANATORIUM_PROCEDURE,
  SANATORIUM_PROCEDURES,
  SANATORIUM_QR_RESOLVE,
  SANATORIUM_REQUEST_ACCEPT,
  SANATORIUM_REQUEST_REJECT,
  SANATORIUM_STAY_CHECK_IN,
  SANATORIUM_STAY_CHECK_OUT,
  SANATORIUM_STAY_EARLY_LEAVE,
} from '@/api/urls';
import type { Credentials, GuestType, Meal, Procedure, QrResolveResult, Stay } from '../types';
import { sanKeys } from './queries';

export type AcceptBody = {
  guest_type: GuestType;
  room_id: number | null;
  planned_from: string;
  planned_to: string;
  with_meals: boolean;
  child_discount: boolean;
};
export type ReferBody = {
  specialty_id?: number;
  doctor_staff_id?: number;
  scheduled_at: string;
  duration_min: number;
  referral_note?: string;
};
export type ProcedureBody = {
  stay_id: number;
  appointment_id?: number;
  name: string;
  sessions_total: number;
  start_date?: string;
  end_date?: string;
  time_text?: string;
  place?: string;
  notes?: string;
};
export type MenuItemBody = { menu_date: string; meal: Meal; dishes: string; diet_dishes: string | null };

export const checkIn = (id: number) => apiClient.post<Stay>(SANATORIUM_STAY_CHECK_IN(id)).then((r) => r.data);
export const checkOut = (id: number) => apiClient.post<Stay>(SANATORIUM_STAY_CHECK_OUT(id)).then((r) => r.data);
export const earlyLeave = ({ id, leave_date, reason }: { id: number; leave_date: string; reason: string }) =>
  apiClient.post<Stay>(SANATORIUM_STAY_EARLY_LEAVE(id), { leave_date, reason }).then((r) => r.data);
/** POST so the (secret) code stays out of URLs and access logs. */
export const resolveGuestQr = (code: string) =>
  apiClient.post<QrResolveResult>(SANATORIUM_QR_RESOLVE, { code: code.trim() }).then((r) => r.data);
export const finishAppointment = ({ id, ...body }: { id: number; complaint: string; diagnosis: string; recommendation: string }) =>
  apiClient.post(SANATORIUM_APPOINTMENT_FINISH(id), body).then((r) => r.data);
export const referAppointment = ({ id, body }: { id: number; body: ReferBody }) =>
  apiClient.post(SANATORIUM_APPOINTMENT_REFER(id), body).then((r) => r.data);
export const markNurseNotified = (id: number) => apiClient.post(SANATORIUM_APPOINTMENT_NOTIFIED(id)).then((r) => r.data);
export const createProcedure = (body: ProcedureBody) => apiClient.post<Procedure>(SANATORIUM_PROCEDURES, body).then((r) => r.data);
export const updateProcedure = ({ id, body }: { id: number; body: { sessions_done?: number; status?: string } }) =>
  apiClient.patch<Procedure>(SANATORIUM_PROCEDURE(id), body).then((r) => r.data);
export const putMenu = (items: MenuItemBody[]) => apiClient.put(SANATORIUM_MENU, { items }).then((r) => r.data);
export const acceptRequest = ({ id, body }: { id: number; body: AcceptBody }) =>
  apiClient
    .post<{ guest: { id: number; full_name: string }; stay: Stay; credentials: Credentials | null }>(SANATORIUM_REQUEST_ACCEPT(id), body)
    .then((r) => r.data);
export const rejectRequest = ({ id, reason }: { id: number; reason: string }) =>
  apiClient.post(SANATORIUM_REQUEST_REJECT(id), { reason }).then((r) => r.data);

const meta = { skipErrorToast: true };

/** Every sanatorium list/card goes stale after any write — one broad invalidation keeps it simple. */
function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sanKeys.all });
}

const hook = <V, R>(fn: (v: V) => Promise<R>) =>
  function useSanMutation() {
    const onSuccess = useInvalidate();
    return useMutation({ meta, mutationFn: fn, onSuccess });
  };

export const useCheckIn = hook(checkIn);
export const useCheckOut = hook(checkOut);
export const useEarlyLeave = hook(earlyLeave);
export const useFinishAppointment = hook(finishAppointment);
export const useReferAppointment = hook(referAppointment);
export const useNurseNotified = hook(markNurseNotified);
export const useCreateProcedure = hook(createProcedure);
export const useUpdateProcedure = hook(updateProcedure);
export const usePutMenu = hook(putMenu);
export const useAcceptRequest = hook(acceptRequest);
export const useRejectRequest = hook(rejectRequest);
export function useResolveGuestQr() {
  return useMutation({ meta, mutationFn: resolveGuestQr });
}
