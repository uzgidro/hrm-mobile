import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  VEHICLE,
  VEHICLE_DRIVER_SCOPE,
  VEHICLE_DRIVER_SCOPES,
  VEHICLE_FUEL_TYPE,
  VEHICLE_FUEL_TYPE_APPROVE,
  VEHICLE_FUEL_TYPES,
  VEHICLE_REQUEST_APPROVE,
  VEHICLE_REQUEST_FINALIZE,
  VEHICLE_REQUEST_RESPOND,
  VEHICLES,
} from '@/api/urls';
import type {
  approveBody,
  buildFuelBody,
  buildVehicleBody,
  finalizeBody,
  fuelDecisionBody,
  respondBody,
  ScopeKind,
  Vehicle,
} from '../utils/vehicles';
import { vehicleKeys } from './queries';

type BodyOf<F extends (...a: never[]) => unknown> =
  Extract<ReturnType<F>, { ok: true }> extends { body: infer B } ? B : never;
export type VehicleBody = BodyOf<typeof buildVehicleBody>;
export type RespondBody = BodyOf<typeof respondBody>;
export type ApproveBody = BodyOf<typeof approveBody>;
export type FinalizeBody = BodyOf<typeof finalizeBody>;
export type FuelBody = BodyOf<typeof buildFuelBody>;
export type FuelDecisionBody = BodyOf<typeof fuelDecisionBody>;

export const createVehicle = (body: VehicleBody) => apiClient.post<Vehicle>(VEHICLES, body).then((r) => r.data);

export const updateVehicle = ({ id, body }: { id: number; body: VehicleBody }) =>
  apiClient.patch<Vehicle>(VEHICLE(id), body).then((r) => r.data);

export const removeVehicle = (id: number) => apiClient.delete(VEHICLE(id)).then((r) => r.data);

/** Avtopark javobi: MASHINA SHU YERDA biriktiriladi (yoki rad). Birga ketadiganlar — `also_request_ids`. */
export const respondRequest = ({ id, body }: { id: number; body: RespondBody }) =>
  apiClient.post(VEHICLE_REQUEST_RESPOND(id), body).then((r) => r.data);

/** Bosh apparat tasdiqlovchisi: avtoparkka o'tkazadi yoki rad etadi (izoh majburiy). */
export const approveRequest = ({ id, body }: { id: number; body: ApproveBody }) =>
  apiClient.post(VEHICLE_REQUEST_APPROVE(id), body).then((r) => r.data);

/** Safardan keyin ANIQ xarajat — GPS bo'lsa server o'zi oladi, aks holda km kiritiladi. */
export const finalizeRequest = ({ id, body }: { id: number; body: FinalizeBody }) =>
  apiClient.post(VEHICLE_REQUEST_FINALIZE(id), body).then((r) => r.data);

export const saveFuelType = ({ id, body }: { id?: number; body: FuelBody }) =>
  (id ? apiClient.patch(VEHICLE_FUEL_TYPE(id), body) : apiClient.post(VEHICLE_FUEL_TYPES, body)).then((r) => r.data);

/** `FuelTypeApprove` — `approved` majburiy (bo'sh tana 422 edi), rad etishda izoh majburiy. */
export const approveFuelType = ({ id, body }: { id: number; body: FuelDecisionBody }) =>
  apiClient.post(VEHICLE_FUEL_TYPE_APPROVE(id), body).then((r) => r.data);

export const removeFuelType = (id: number) => apiClient.delete(VEHICLE_FUEL_TYPE(id)).then((r) => r.data);

export const addDriverScope = (body: { scope_type: ScopeKind; scope_id: number }) =>
  apiClient.post(VEHICLE_DRIVER_SCOPES, body).then((r) => r.data);

export const removeDriverScope = (id: number) => apiClient.delete(VEHICLE_DRIVER_SCOPE(id)).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: vehicleKeys.all });
}

const meta = { skipErrorToast: true };

export function useCreateVehicle() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: createVehicle, onSuccess });
}
export function useUpdateVehicle() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: updateVehicle, onSuccess });
}
export function useRemoveVehicle() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: removeVehicle, onSuccess });
}
export function useRespondRequest() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: respondRequest, onSuccess });
}
export function useApproveRequest() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: approveRequest, onSuccess });
}
export function useFinalizeRequest() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: finalizeRequest, onSuccess });
}
export function useSaveFuelType() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: saveFuelType, onSuccess });
}
export function useApproveFuelType() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: approveFuelType, onSuccess });
}
export function useRemoveFuelType() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: removeFuelType, onSuccess });
}
export function useAddDriverScope() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: addDriverScope, onSuccess });
}
export function useRemoveDriverScope() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: removeDriverScope, onSuccess });
}
