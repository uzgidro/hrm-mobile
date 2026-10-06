// Telefondan «Keldim / Ketdim» — backend `schemas/mobile_checkin.py` shartnomasi (2026-10-06).

export type CheckinDirection = 'entrance' | 'exit';

export interface BranchRef {
  id: number;
  name?: string | null;
}

export interface MobileCheckin {
  id: number;
  employee_id: number;
  work_leave_id?: number | null;
  destination_branch?: BranchRef | null;
  /** Server qiymati — `entrance` | `exit`. */
  direction_type: string;
  /** Telefonda olingan payt (oflayn navbatdan kelsa ham o'z vaqti). */
  happen_time: string;
  received_at: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  /** Safar manzili nuqtasigacha; `null` — manzil koordinatasi yo'q. */
  distance_m?: number | null;
  is_far: boolean;
  map_url: string;
  status: 'active' | 'cancelled' | string;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: { id: number; legal_name?: string | null } | null;
  event_id?: number | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
  /** Faqat kadr ro'yxati / tafsilotida. */
  employee?: {
    id: number;
    legal_name?: string | null;
    photo_path?: string | null;
    photo_thumb_path?: string | null;
    job_position?: { name?: string | null } | null;
  } | null;
}

export interface TripLocation {
  id: number;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ActiveTrip {
  work_leave_id: number;
  start_date: string;
  end_date: string;
  description?: string | null;
  destination_branch?: BranchRef | null;
  destination_locations: TripLocation[];
}

export interface CheckinStatus {
  day: string;
  can_check_in: boolean;
  /** `no_active_business_trip` | `no_employee` | null */
  reason?: string | null;
  trip?: ActiveTrip | null;
  far_distance_m: number;
  today: MobileCheckin[];
}

/** POST /mobile-checkins tanasi — server `extra='forbid'`: boshqa kalit 422. */
export interface CheckinCreateBody {
  photo_base64: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  captured_at?: string;
  direction: CheckinDirection;
  client_uuid: string;
}
