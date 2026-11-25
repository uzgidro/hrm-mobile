// Shapes of the "simplification" API (work queue, arrival wizard, route sheet, short actions).
// Everything the server may add later is optional so an older or newer server never crashes a screen.
import type { GuestType } from '../types';

export type QueueUrgency = 'overdue' | 'today' | 'soon';
export type QueueKind =
  | 'request_new' | 'waitlist_offered' | 'arrival_overdue' | 'arrival_today' | 'no_exam' | 'no_room'
  | 'service_request' | 'transfer_request' | 'departure_today' | 'overstay' | 'debt';
export type QueueAction =
  | 'accept' | 'convert' | 'arrive' | 'no_show' | 'assign_doctor' | 'choose_room' | 'confirm_service'
  | 'confirm_transfer' | 'check_out' | 'extend' | 'take_payment';
export type MissingPart = 'room' | 'doctor' | 'exam' | 'diet';

export type QueueMember = { stay_id: number; guest_id: number; full_name: string; room_number?: string | null };
export type QueueItem = {
  key: string;
  kind: QueueKind | string;
  urgency: QueueUrgency;
  title_params?: Record<string, unknown>;
  /** `id` is null for a request / waitlist entry that has no guest card yet. */
  guest: { id: number | null; full_name: string; phone?: string | null } | null;
  stay_id: number | null;
  request_id: number | null;
  waitlist_id?: number | null;
  transfer_id?: number | null;
  order_id?: number | null;
  group_key?: string | null;
  group_size?: number;
  members?: QueueMember[];
  room: { id: number; number: string; building?: string | null; floor?: number | null } | null;
  planned_from?: string | null;
  planned_to?: string | null;
  at?: string | null;
  debt?: string | null;
  missing?: MissingPart[];
  /** One action or a pair «arrive|no_show»; the first one is the main button. */
  action: string;
  /** Quiet second button (arrive -> no_show, extend -> check_out). */
  alt_action?: string | null;
};
export type TodayTotals = { arriving?: number; in_house?: number; leaving?: number; free_beds?: number };
export type TodayData = { date: string; counts: Record<string, number>; items: QueueItem[]; totals: TodayTotals; total?: number };

// ── Wizard options ──
export type OptionRoom = {
  held?: boolean;
  id: number; number: string; building?: string | null; floor?: number | null; room_type?: string | null;
  capacity: number; free_beds: number; price_per_day?: string; price_mode?: 'per_bed' | 'per_room';
  hk_status?: string | null; ready?: boolean; fits?: boolean; photo_thumb?: string | null; place?: string | null;
};
export type OptionDoctor = {
  staff_id: number; full_name: string; specialty_id?: number | null; specialty?: string | null;
  cabinet?: string | null; place?: string | null; load?: number; next_slots?: string[];
};
export type OptionNurse = { staff_id: number; full_name: string; load?: number };
export type OptionDiet = { id: number; code?: string | null; name: string };
export type OptionPackage = { id: number; name: string; price?: string | null; [k: string]: unknown };
export type ArrivalOptions = {
  rooms: OptionRoom[];
  suggested_room_id: number | null;
  doctors: OptionDoctor[];
  suggested_doctor_id: number | null;
  suggested_exam_at: string | null;
  nurses: OptionNurse[];
  suggested_nurse_id: number | null;
  diets: OptionDiet[];
  default_diet_id: number | null;
  packages: OptionPackage[];
  meals?: { breakfast?: string | null; lunch?: string | null; dinner?: string | null };
  has_exam?: boolean;
  /** True = every member already has a room that stays free: the room step may be skipped, each keeps their own. */
  rooms_assigned?: boolean;
  exam_required: boolean;
  warnings: string[];
  prefill?: Prefill | null;
};
/** start / end / people / guest_type may be left out when request_id or stay_id is given. */
export type OptionsParams = { start?: string; end?: string; people?: number; guest_type?: GuestType; request_id?: number; stay_id?: number; whole_group?: boolean };
export type PrefillMember = {
  stay_id: number | null; guest_id: number | null; full_name: string; birth_date?: string | null; phone?: string | null; passport?: string | null;
  gender?: string | null; organization_name?: string | null; relation?: string | null; is_child?: boolean; child_discount?: boolean | null;
  diet_id?: number | null; diet_note?: string | null; allergies?: string | null;
};
/** What the server already knows about a request or a booked group (GET /arrivals/options `prefill`). */
export type Prefill = {
  source: 'request' | 'stay'; request_id: number | null; stay_ids: number[]; group_key: string | null;
  start: string; end: string; guest_type: GuestType | null; party_size?: number;
  room_id: number | null; package_id: number | null; organization_id: number | null; with_meals: boolean;
  doctor_staff_id: number | null; nurse_staff_id: number | null; note: string | null;
  existing_guest_id?: number | null; existing_guest_matches?: boolean | null; members: PrefillMember[];
};

// ── POST /arrivals ──
export type ArrivalMember = {
  guest_id?: number; full_name?: string; birth_date?: string; phone?: string; passport?: string;
  gender?: string; relation?: string; child_discount?: boolean;
};
export type ArrivalBody = {
  request_id?: number;
  stay_ids?: number[];
  start: string;
  end: string;
  guest_type: GuestType;
  room_id?: number;
  with_meals: boolean;
  package_id?: number;
  organization_id?: number;
  members?: ArrivalMember[];
  contract_note?: string;
  doctor_staff_id?: number;
  nurse_staff_id?: number;
  exam?: { specialty_id?: number; doctor_staff_id?: number; at: string; minutes?: number } | null;
  diet?: { diet_id?: number; diet_note?: string };
  allergies?: string;
  payment?: { amount: string; note?: string };
  note?: string;
  check_in: boolean;
  /** One UUID per press of the button, the same value on a retry (server answers 409 duplicate_submit on a replay). */
  client_ref?: string;
};
export type RouteStep = {
  key: 'reception' | 'room' | 'doctor' | 'kitchen' | 'procedures' | 'departure' | string;
  done: boolean;
  /** `title` / `text` are in the sheet's language (the guest's unless `lang` is passed). */
  title?: string; text?: string;
  title_uz?: string; title_ru?: string; title_en?: string;
  text_uz?: string; text_ru?: string; text_en?: string;
  place?: string | null;
  at?: string | null;
  person?: string | null;
};
export type RouteSheet = {
  stay_id?: number;
  lang?: string;
  guest?: { full_name: string; login_code?: string | null };
  /** The rest of the group (without this guest). */
  members?: { full_name: string; room_number?: string | null; is_child?: boolean }[];
  period?: { from: string; to: string; nights: number };
  steps: RouteStep[];
  meals?: { breakfast?: string | null; lunch?: string | null; dinner?: string | null };
  contacts?: string | null;
  qr?: string | null;
};
export type NewCredential = { guest_id: number; full_name: string; login_code: string; password: string };
export type ActionWarning = { code: string; amount?: string | number; [k: string]: unknown };
export type ArrivalResult = {
  stays: { id: number; guest?: { id: number; full_name: string } | null }[];
  group_key?: string | null;
  credentials?: NewCredential[];
  appointment_ids?: number[];
  warnings?: ActionWarning[];
  route_sheet?: RouteSheet;
};

// ── Setup status, my guests, short actions ──
export type SetupItem = { key: string; ok: boolean; count?: number; severity: 'required' | 'recommended'; path?: string };
export type SetupStatus = { done: number; total: number; items: SetupItem[] };
export type MyGuest = {
  stay_id: number;
  guest: { id: number; full_name: string; phone?: string | null };
  room?: { id: number; number: string; building?: string | null } | null;
  planned_from?: string | null;
  planned_to?: string | null;
  guest_type?: string;
  diet?: { id: number; name: string; note?: string | null } | null;
  next_appointment?: { id: number; scheduled_at: string } | null;
  has_exam?: boolean;
  can_start_exam?: boolean;
};
export type DebtWarning = { code: 'debt'; amount?: string | number };
