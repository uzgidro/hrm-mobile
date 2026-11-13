// Shapes of the sanatorium staff API (see backend `schemas/sanatorium.py`). Everything the
// server may omit for a role (phone, passport, money, medical text) is optional.

export type SanRole = 'registrar' | 'kitchen' | 'room_keeper' | 'doctor' | 'nurse';
export type GuestType = 'hotel' | 'rest' | 'treatment' | 'contract';
export type StayStatus = 'booked' | 'checked_in' | 'checked_out' | 'early_left' | 'cancelled';
export type RequestStatus = 'new' | 'accepted' | 'rejected';
export type ApptStatus = 'scheduled' | 'done' | 'cancelled' | 'missed';
export type ProcStatus = 'active' | 'done' | 'cancelled';
export type Meal = 'breakfast' | 'lunch' | 'dinner';

export const GUEST_TYPES: GuestType[] = ['hotel', 'rest', 'treatment', 'contract'];
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner'];

export type GuestLite = {
  id: number;
  full_name: string;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  birth_date?: string | null;
  passport?: string | null;
  organization_name?: string | null;
  address?: string | null;
  note?: string | null;
  family_name?: string | null;
  login_code?: string | null;
  relation?: string | null;
};

export type StaffLite = { id: number; full_name?: string | null; specialty?: string | null };

export type Stay = {
  id: number;
  guest: GuestLite | null;
  guest_type: GuestType;
  room: { id: number; number: string; building?: string | null; floor?: number | null } | null;
  planned_from: string;
  planned_to: string;
  nights: number;
  days_left: number | null;
  status: StayStatus;
  left_early: boolean;
  early_leave_date: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  with_meals: boolean;
  diet_note: string | null;
  doctor: StaffLite | null;
  nurse: StaffLite | null;
};

export type Appointment = {
  id: number;
  stay_id: number;
  guest_id: number;
  specialty: string | null;
  specialty_kind: string | null;
  doctor: StaffLite | null;
  scheduled_at: string;
  duration_min: number;
  status: ApptStatus;
  nurse_notified_at: string | null;
  finished_at: string | null;
  guest?: GuestLite | null;
  room_number?: string | null;
  referral_note?: string | null;
  complaint?: string | null;
  diagnosis?: string | null;
  recommendation?: string | null;
};

export type Procedure = {
  id: number;
  stay_id: number;
  guest_id: number;
  appointment_id: number | null;
  name: string;
  sessions_total: number;
  sessions_done: number;
  start_date: string | null;
  end_date: string | null;
  time_text: string | null;
  place: string | null;
  notes: string | null;
  status: ProcStatus;
  prescribed_by?: string | null;
  guest?: GuestLite | null;
};

export type GuestEvent = {
  id: number;
  kind: string;
  title: string;
  details?: string | null;
  created_at: string | null;
  actor_name?: string | null;
};

export type GuestProfile = {
  guest: GuestLite;
  stays: Stay[];
  appointments?: Appointment[];
  procedures?: Procedure[];
  events?: GuestEvent[];
  family_members?: GuestLite[];
};

export type MenuMeal = { meal: Meal; dishes: string; diet_dishes: string | null };
export type MenuDay = { date: string; meals: MenuMeal[] };
export type KitchenDay = {
  date: string;
  total: number;
  children: number;
  adults: number;
  diet: number;
  arrivals: number;
  checked_in: number;
};
export type KitchenCounts = { start: string; days: KitchenDay[]; early_leaves?: { guest: GuestLite; date: string; planned_to: string }[] };
export type KitchenPerson = {
  stay_id: number;
  guest: { id: number; full_name: string };
  room: string | null;
  diet_note: string | null;
  status: StayStatus;
  is_child?: boolean;
};

export type Dashboard = {
  roles: SanRole[];
  today: string;
  stats: Record<string, number | undefined>;
  occupancy_week?: { date: string; occupied: number }[];
  menu_today?: MenuMeal[];
  arrivals?: Stay[];
  departures?: Stay[];
  rooms_out_of_service?: unknown[];
  appointments_today?: Appointment[];
  kitchen_week?: KitchenDay[];
};

export type AvailabilityRoom = {
  id: number;
  number: string;
  building?: string | null;
  floor?: number | null;
  capacity: number;
  out_of_service: boolean;
  occupancy: number[];
  used_today: number;
  free_today: number;
  free_from: string | null;
  stays: { stay_id: number; guest: GuestLite; planned_from: string; planned_to: string; status: StayStatus }[];
};
export type Availability = { start: string; days: number; rooms: AvailabilityRoom[] };

export type SanRequest = {
  id: number;
  source: string;
  status: RequestStatus;
  full_name: string;
  birth_date: string | null;
  passport: string | null;
  phone: string | null;
  organization_name: string | null;
  referral_from: string | null;
  referral_to: string | null;
  guest_type: GuestType | null;
  note: string | null;
  reject_reason: string | null;
  guest_id: number | null;
  existing_guest_id?: number | null;
  /** false = the passport is registered under a different name / birth date. */
  existing_guest_matches?: boolean | null;
  /** Another request carries the same passport. */
  duplicate_passport?: boolean;
  created_at: string | null;
};

export type Specialty = { id: number; name: string; kind: string; is_active: boolean };
export type StaffRow = { id: number; full_name?: string | null; specialty_id?: number | null; specialty?: string | null };
export type Credentials = { login_code: string; password: string; qr_code: string };
export type QrResolveResult = { guest: GuestLite; active_stay: Stay | null };
