// Read side of the sanatorium module. Request functions are pure; screens wrap them in useQuery.
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  SANATORIUM_APPOINTMENTS,
  SANATORIUM_AVAILABILITY,
  SANATORIUM_DASHBOARD,
  SANATORIUM_FAMILIES,
  SANATORIUM_ROOMS,
  SANATORIUM_SETTINGS,
  SANATORIUM_STAFF_CANDIDATES,
  SANATORIUM_STAYS,
  SANATORIUM_STAY,
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
  Family,
  KitchenCounts,
  KitchenPerson,
  MenuDay,
  Procedure,
  Room,
  SanSettings,
  StaffCandidate,
  StaffMember,
  StayFull,
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
  settings: () => [...sanKeys.all, 'settings'] as const,
  rooms: () => [...sanKeys.all, 'rooms'] as const,
  staff: (role: string) => [...sanKeys.all, 'staff', role] as const,
  candidates: (q: string) => [...sanKeys.all, 'candidates', q] as const,
  families: (q: string) => [...sanKeys.all, 'families', q] as const,
  stays: (f: string) => [...sanKeys.all, 'stays', f] as const,
  stay: (id: number) => [...sanKeys.all, 'stay', id] as const,
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
  apiClient.get(SANATORIUM_GUESTS, { params: { ...(q.trim() ? { q: q.trim() } : {}), size: 30 } }).then((r) => unwrapList<GuestLite & { active_stay?: unknown }>(r.data));
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

// ── Registrar-side reads ──
export type StayFilter = { status?: string; q?: string; left_early?: boolean; size?: number };
export const fetchSettings = () => apiClient.get<SanSettings>(SANATORIUM_SETTINGS).then((r) => r.data);
export const fetchRooms = () => apiClient.get(SANATORIUM_ROOMS, { params: { include_inactive: true } }).then((r) => unwrapList<Room>(r.data));
export const fetchAllSpecialties = () =>
  apiClient.get(SANATORIUM_SPECIALTIES, { params: { include_inactive: true } }).then((r) => unwrapList<Specialty>(r.data));
export const fetchStaff = () => apiClient.get(SANATORIUM_STAFF).then((r) => unwrapList<StaffMember>(r.data));
export const fetchCandidates = (q: string) =>
  apiClient.get(SANATORIUM_STAFF_CANDIDATES, { params: { q: q.trim() } }).then((r) => unwrapList<StaffCandidate>(r.data));
export const fetchFamilies = (q: string) =>
  apiClient.get(SANATORIUM_FAMILIES, { params: q.trim() ? { q: q.trim() } : {} }).then((r) => unwrapList<Family>(r.data));
export const fetchStays = (f: StayFilter) =>
  apiClient.get(SANATORIUM_STAYS, { params: { size: 30, ...f } }).then((r) => unwrapList<StayFull>(r.data));
export const fetchStay = (id: number) => apiClient.get<StayFull>(SANATORIUM_STAY(id)).then((r) => r.data);

export const settingsQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.settings(), queryFn: fetchSettings, enabled });
export const roomsQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.rooms(), queryFn: fetchRooms, enabled });
export const allSpecialtiesQuery = (enabled = true) =>
  queryOptions({ queryKey: [...sanKeys.specialties(), 'all'], queryFn: fetchAllSpecialties, enabled });
export const staffQuery = (enabled = true) => queryOptions({ queryKey: sanKeys.staff('all'), queryFn: fetchStaff, enabled });
export const candidatesQuery = (q: string) =>
  queryOptions({ queryKey: sanKeys.candidates(q.trim()), queryFn: () => fetchCandidates(q), enabled: q.trim().length >= 2 });
export const familiesQuery = (q: string, enabled = true) =>
  queryOptions({ queryKey: sanKeys.families(q.trim()), queryFn: () => fetchFamilies(q), enabled });
export const staysQuery = (f: StayFilter, enabled = true) =>
  queryOptions({ queryKey: sanKeys.stays(JSON.stringify(f)), queryFn: () => fetchStays(f), enabled });
export const stayQuery = (id: number, enabled = true) =>
  queryOptions({ queryKey: sanKeys.stay(id), queryFn: () => fetchStay(id), enabled: enabled && id > 0 });

/** Active staff holding one clinical role (doctors / nurses for pickers). */
export const fetchStaffByRole = (role: string) =>
  apiClient.get(SANATORIUM_STAFF, { params: { role, active_only: true } }).then((r) => unwrapList<StaffMember>(r.data));
export const staffRoleQuery = (role: string, enabled = true) =>
  queryOptions({ queryKey: sanKeys.staff(role), queryFn: () => fetchStaffByRole(role), enabled });
