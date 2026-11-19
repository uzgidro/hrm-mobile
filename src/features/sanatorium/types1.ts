// Shapes of the sanatorium "sections" API, part 1 (see backend schemas/sanatorium_journey.py,
// sanatorium_places.py, sanatorium_content.py, sanatorium_ops.py). Written from the API reports.
import type { GuestLite } from './types';

export type FeatureRow = { key: string; enabled: boolean; default: boolean; label_uz: string; label_ru: string };

// ── Journey ──
export const JOURNEY_TRIGGERS = [
  'request_new', 'request_accepted', 'booked', 'pre_arrival', 'checked_in',
  'first_exam', 'treatment', 'final_exam', 'checked_out', 'feedback',
] as const;
export type JourneyTrigger = (typeof JOURNEY_TRIGGERS)[number];
export type JourneyStage = {
  id: number;
  key: string;
  name_uz: string;
  name_ru: string | null;
  name_en: string | null;
  name: string;
  sort_order: number;
  responsible_role: string | null;
  trigger: JourneyTrigger | null;
  notify_guest: boolean;
  message_uz: string | null;
  message_ru: string | null;
  message_en: string | null;
  is_active: boolean;
};
export type JourneyCardData = {
  stay_id: number;
  guest: Pick<GuestLite, 'id' | 'full_name' | 'phone'> | null;
  room: { id: number; number: string } | null;
  planned_from: string;
  planned_to: string;
  status: string;
  entered_at: string | null;
  inferred: boolean;
};
export type JourneyBoard = { stages: (JourneyStage & { stays: JourneyCardData[] })[]; unassigned: JourneyCardData[] };
export type JourneySettings = { pre_arrival_days: number; final_exam_days: number };
export type JourneyStayInfo = {
  stay_id: number;
  current: JourneyStage | null;
  entered_at: string | null;
  inferred: boolean;
  history: { id: number; stage: JourneyStage | null; entered_at: string; auto: boolean; note: string | null; by: string | null }[];
};

// ── Location & territory ──
export type SanLocation = {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  zoom: number | null;
  directions_note_uz: string | null;
  directions_note_ru: string | null;
  directions_note_en: string | null;
};
export const POI_KINDS = ['building', 'cabinet', 'dining', 'pool', 'procedure', 'entrance', 'parking', 'reception', 'other'] as const;
export type PoiKind = (typeof POI_KINDS)[number];
export type Poi = {
  id: number;
  name_uz: string;
  name_ru: string | null;
  name_en: string | null;
  kind: PoiKind;
  x_pct: number;
  y_pct: number;
  floor: string | number | null;
  description_uz: string | null;
  description_ru: string | null;
  description_en: string | null;
  sort_order: number;
  is_active?: boolean;
};
export type TerritoryPlan = { url: string; thumb_url: string; width: number; height: number } | null;
export type Territory = { plan: TerritoryPlan; pois: Poi[] };

// ── Info sections ──
export type InfoSection = {
  id: number;
  title_uz: string;
  title_ru: string | null;
  title_en: string | null;
  body_uz: string | null;
  body_ru: string | null;
  body_en: string | null;
  title: string;
  body: string | null;
  emoji: string | null;
  sort_order: number;
  show_in_bot: boolean;
  show_in_cabinet: boolean;
  photo: { url: string; thumb_url: string } | null;
  is_active: boolean;
};

// ── Broadcasts ──
export const BROADCAST_AUDIENCES = ['in_house', 'arriving_in_7_days', 'all_linked_guests', 'new_requests'] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];
export type AudienceCount = { total: number; reachable: number; skipped: number };
export type Broadcast = {
  id: number;
  audience: BroadcastAudience;
  text_uz: string;
  text_ru: string | null;
  text_en: string | null;
  photo_url: string | null;
  status: 'queued' | 'sending' | 'done';
  total_count: number;
  skipped_count: number;
  queued_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
};

// ── Waitlist ──
export type WaitlistStatus = 'waiting' | 'offered' | 'converted' | 'cancelled';
export const WAITLIST_STATUSES: WaitlistStatus[] = ['waiting', 'offered', 'converted', 'cancelled'];
export type WaitlistItem = {
  id: number;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  passport: string | null;
  organization_name: string | null;
  period_from: string;
  period_to: string;
  party_size: number;
  room_type: string | null;
  lang: 'uz' | 'ru' | 'en';
  source: 'web' | 'telegram' | 'registrar';
  status: WaitlistStatus;
  note: string | null;
  telegram: boolean;
  offered_at: string | null;
  offer_count: number;
  request_id: number | null;
  created_at: string | null;
};
export type WaitlistPage = { items: WaitlistItem[]; total: number; page: number; counts?: Partial<Record<WaitlistStatus, number>> };

// ── Housekeeping ──
export const HK_STATUSES = ['clean', 'dirty', 'cleaning', 'inspected', 'maintenance'] as const;
export type HkStatus = (typeof HK_STATUSES)[number];
export const HK_KINDS = ['cleaning', 'linen', 'maintenance', 'inspection'] as const;
export type HkKind = (typeof HK_KINDS)[number];
export type HkTaskStatus = 'open' | 'in_progress' | 'done';
export type HkRoom = {
  id: number;
  number: string;
  building: string | null;
  floor: number | null;
  room_type: string | null;
  capacity: number;
  out_of_service: boolean;
  hk_status: HkStatus;
  hk_changed_at: string | null;
  in_house: boolean;
  arriving_today: boolean;
  ready: boolean;
  open_tasks: { id: number; kind: HkKind; status: HkTaskStatus; due_date: string | null }[];
};
export type HkBoard = { date: string; counts: Partial<Record<HkStatus, number>>; rooms: HkRoom[] };
export type HkTask = {
  id: number;
  room: { id: number; number: string; building: string | null; floor: number | null; hk_status: HkStatus };
  kind: HkKind;
  due_date: string | null;
  status: HkTaskStatus;
  note: string | null;
  auto: boolean;
  overdue: boolean;
  assignee: { id: number; full_name?: string | null } | null;
  assignee_staff_id: number | null;
};
export type HkTasksPage = { items: HkTask[]; total: number; page: number };
export type HkMyTasks = { open: HkTask[]; done_today: HkTask[] };
export type CheckInWarning = { code: string; room_id?: number; room_number?: string; hk_status?: string };

// ── Transfers ──
export type TransferStatus = 'requested' | 'confirmed' | 'assigned' | 'done' | 'cancelled';
export const TRANSFER_STATUSES: TransferStatus[] = ['requested', 'confirmed', 'assigned', 'done', 'cancelled'];
export type TransferDirection = 'arrival' | 'departure';
export type TransferVehicle = { id: number; plate_number: string; model_name: string | null; seats: number | null };
export type Transfer = {
  id: number;
  stay_id: number | null;
  guest_id: number;
  guest: { id: number; full_name: string; phone?: string | null } | null;
  direction: TransferDirection;
  pickup_point: string;
  scheduled_at: string;
  people: number;
  transport_no: string | null;
  contact_phone: string | null;
  status: TransferStatus;
  vehicle: TransferVehicle | null;
  driver_name: string | null;
  driver_phone: string | null;
  price: string | null;
  note: string | null;
  source: string;
  cancel_reason: string | null;
};
export type TransfersPage = { items: Transfer[]; total: number; page: number; counts?: Partial<Record<TransferStatus, number>> };
