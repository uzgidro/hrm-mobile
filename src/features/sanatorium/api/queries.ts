// Read side of the sanatorium module. Request functions are pure; screens wrap them in useQuery.
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  SANATORIUM_APPOINTMENTS,
  SANATORIUM_AVAILABILITY,
  SANATORIUM_DASHBOARD,
  SANATORIUM_GUEST,
  SANATORIUM_GUESTS,
  SANATORIUM_KITCHEN_COUNTS,
  SANATORIUM_KITCHEN_DAY,
  SANATORIUM_MENU,
  SANATORIUM_PROCEDURES,
  SANATORIUM_REQUESTS,
  SANATORIUM_SPECIALTIES,
  SANATORIUM_STAFF,
} from '@/api/urls';
import type {
  Appointment,
  Availability,
  Dashboard,
  GuestLite,
  GuestProfile,
  KitchenCounts,
  KitchenPerson,
  MenuDay,
  Procedure,
  RequestStatus,
  SanRequest,
  Specialty,
  StaffRow,
} from '../types';

export const sanKeys = {
  all: ['sanatorium'] as const,
  dashboard: () => [...sanKeys.all, 'dashboard'] as const,
  availability: (start: string, days: number) => [...sanKeys.all, 'availability', start, days] as const,
  appointments: (day: string) => [...sanKeys.all, 'appointments', day] as const,
  procedures: () => [...sanKeys.all, 'procedures'] as const,
  guest: (id: number) => [...sanKeys.all, 'guest', id] as const,
  guests: (q: string) => [...sanKeys.all, 'guests', q] as const,
  requests: (status: RequestStatus) => [...sanKeys.all, 'requests', status] as const,
  menu: (start: string, days: number) => [...sanKeys.all, 'menu', start, days] as const,
  counts: (start: string, days: number) => [...sanKeys.all, 'counts', start, days] as const,
  kitchenDay: (day: string) => [...sanKeys.all, 'kitchen-day', day] as const,
  specialties: () => [...sanKeys.all, 'specialties'] as const,
  doctors: () => [...sanKeys.all, 'doctors'] as const,
};

export const fetchDashboard = () => apiClient.get<Dashboard>(SANATORIUM_DASHBOARD).then((r) => r.data);
export const fetchAvailability = (start: string, days: number) =>
  apiClient.get<Availability>(SANATORIUM_AVAILABILITY, { params: { start, days } }).then((r) => r.data);
/** `mine` keeps a doctor's list to their own patients (a nurse is scoped by the server anyway). */
export const fetchAppointments = (day: string, mine: boolean) =>
  apiClient.get(SANATORIUM_APPOINTMENTS, { params: { day, mine } }).then((r) => unwrapList<Appointment>(r.data));
export const fetchProcedures = () =>
  apiClient.get(SANATORIUM_PROCEDURES, { params: { active_only: true } }).then((r) => unwrapList<Procedure>(r.data));
export const fetchGuest = (id: number) => apiClient.get<GuestProfile>(SANATORIUM_GUEST(id)).then((r) => r.data);
export const fetchGuests = (q: string) =>
  apiClient.get(SANATORIUM_GUESTS, { params: { q: q.trim(), size: 30 } }).then((r) => unwrapList<GuestLite & { active_stay?: unknown }>(r.data));
export const fetchRequests = (status: RequestStatus) =>
  apiClient.get(SANATORIUM_REQUESTS, { params: { status, size: 50 } }).then((r) => unwrapList<SanRequest>(r.data));
export const fetchMenu = (start: string, days: number) =>
  apiClient.get<MenuDay[]>(SANATORIUM_MENU, { params: { start, days } }).then((r) => r.data ?? []);
export const fetchCounts = (start: string, days: number) =>
  apiClient.get<KitchenCounts>(SANATORIUM_KITCHEN_COUNTS, { params: { start, days } }).then((r) => r.data);
export const fetchKitchenDay = (day: string) =>
  apiClient.get(SANATORIUM_KITCHEN_DAY, { params: { day } }).then((r) => unwrapList<KitchenPerson>(r.data));
export const fetchSpecialties = () => apiClient.get(SANATORIUM_SPECIALTIES).then((r) => unwrapList<Specialty>(r.data));
export const fetchDoctors = () =>
  apiClient.get(SANATORIUM_STAFF, { params: { role: 'doctor', active_only: true } }).then((r) => unwrapList<StaffRow>(r.data));

export const dashboardQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.dashboard(), queryFn: fetchDashboard, enabled });
export const availabilityQuery = (start: string, days: number, enabled = true) =>
  queryOptions({ queryKey: sanKeys.availability(start, days), queryFn: () => fetchAvailability(start, days), enabled });
export const appointmentsQuery = (day: string, mine: boolean, enabled = true) =>
  queryOptions({ queryKey: [...sanKeys.appointments(day), mine], queryFn: () => fetchAppointments(day, mine), enabled });
export const proceduresQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.procedures(), queryFn: fetchProcedures, enabled });
export const guestQuery = (id: number) => queryOptions({ queryKey: sanKeys.guest(id), queryFn: () => fetchGuest(id), enabled: id > 0 });
export const guestsQuery = (q: string) =>
  queryOptions({ queryKey: sanKeys.guests(q.trim()), queryFn: () => fetchGuests(q), enabled: q.trim().length >= 2 });
export const requestsQuery = (status: RequestStatus, enabled = true) =>
  queryOptions({ queryKey: sanKeys.requests(status), queryFn: () => fetchRequests(status), enabled });
export const menuQuery = (start: string, days: number, enabled = true) =>
  queryOptions({ queryKey: sanKeys.menu(start, days), queryFn: () => fetchMenu(start, days), enabled });
export const countsQuery = (start: string, days: number, enabled = true) =>
  queryOptions({ queryKey: sanKeys.counts(start, days), queryFn: () => fetchCounts(start, days), enabled });
export const kitchenDayQuery = (day: string, enabled = true) =>
  queryOptions({ queryKey: sanKeys.kitchenDay(day), queryFn: () => fetchKitchenDay(day), enabled });
export const specialtiesQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.specialties(), queryFn: fetchSpecialties, enabled });
export const doctorsQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.doctors(), queryFn: fetchDoctors, enabled });
