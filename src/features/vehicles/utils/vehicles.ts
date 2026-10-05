// Avtopark — sof mantiq (web v2 `VehiclesPage` + `VehicleProfilePage` + `useVehicles` + `FleetBits`).
// Holat KODLARI (pending | awaiting_approval | approved | rejected | cancelled; approval_status;
// yoqilg'i `approval_status`) serverniki — tarjima qilinmaydi, faqat yorliq. Huquqlar
// `vehicles/access` va so'rov qatorining `can_*` bayroqlaridan — mijoz taxmin qilmaydi.
import dayjs from 'dayjs';
import type { Tone } from '@/ui';
import type { User } from '@/types';
import { isSiteMasterAdmin } from '@/utils/roles';

// ── Turlar (server sxemalari: schemas/vehicle.py) ──────────────────────────

export interface FleetAccess {
  can_manage: boolean;
  can_approve: boolean;
  can_view: boolean;
  can_request: boolean;
  provider_branch_id: number | null;
  managed_branch_ids: number[];
  approver_branch_ids: number[];
  requester_branch_ids: number[];
}

export interface PersonShort {
  id?: number;
  legal_name?: string | null;
  photo_path?: string | null;
  photo_thumb_path?: string | null;
}

export interface Vehicle {
  id: number;
  organization_branch_id?: number | null;
  model_name?: string | null;
  plate_number?: string | null;
  color?: string | null;
  year?: number | null;
  seats?: number | null;
  fuel_type_id?: number | null;
  fuel_type_name?: string | null;
  fuel_unit?: string | null;
  fuel_consumption?: number | null;
  gps_device_id?: string | null;
  driver_employee_id?: number | null;
  driver?: PersonShort | null;
  driver_available?: boolean;
  driver_block_reason?: string | null;
  driver_position?: string | null;
  driver_phone?: string | null;
  driver_health?: { label?: string | null; status?: string | null; blocking?: boolean } | null;
  leader?: PersonShort | null;
  leader_position?: string | null;
  is_active?: boolean | null;
  is_busy?: boolean;
  has_pending?: boolean;
  busy_periods?: {
    letter_id: number;
    start_date?: string | null;
    end_date?: string | null;
    employee_name?: string | null;
  }[];
  fuel_price?: number | null;
  fuel_price_pending?: boolean | null;
}

export interface VehicleStats {
  trip_count: number;
  finalized_count: number;
  total_distance_km?: number | null;
  total_fuel_liters?: number | null;
  total_fuel_cost?: number | null;
  last_trip_date?: string | null;
}

export type VehicleFull = Vehicle & { stats?: VehicleStats | null };

export interface VehicleTrip {
  request_id: number;
  letter_id: number;
  letter_number?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  employee_name?: string | null;
  driver_name?: string | null;
  regions?: string[];
  destination_names?: string[];
  distance_km?: number | null;
  fuel_cost?: number | null;
  actual_distance_km?: number | null;
  actual_fuel_cost?: number | null;
}

export interface VehicleLive {
  lat?: number | null;
  lon?: number | null;
  speed?: number | null;
  at?: string | null;
  age_seconds?: number | null;
  sats?: number | null;
  mileage?: number | null;
}

export interface SharedCandidate {
  request_id: number;
  employee_name?: string | null;
  employee_position?: string | null;
}

export interface VehicleRequest {
  id: number;
  status?: string | null;
  approval_status?: string | null;
  can_respond?: boolean;
  can_approve?: boolean;
  can_finalize?: boolean;
  letter_id?: number | null;
  letter_number?: string | null;
  employee_name?: string | null;
  employee_photo_thumb_path?: string | null;
  employee_photo_path?: string | null;
  employee_position?: string | null;
  department_name?: string | null;
  purpose?: string | null;
  regions?: string[];
  destination_names?: string[];
  start_date?: string | null;
  end_date?: string | null;
  vehicle?: Vehicle | null;
  assigned_driver?: PersonShort | null;
  request_note?: string | null;
  approval_note?: string | null;
  response_text?: string | null;
  finalized_at?: string | null;
  distance_km?: number | null;
  fuel_cost?: number | null;
  actual_distance_km?: number | null;
  actual_fuel_cost?: number | null;
  shared_candidates?: SharedCandidate[];
}

export interface FuelType {
  id: number;
  name?: string | null;
  unit?: string | null;
  price?: number | null;
  /** 'pending' | 'approved' | 'rejected' — mantiqiy qiymat EMAS (v2 izohi). */
  approval_status?: string | null;
}

export interface FuelLog {
  id: number;
  fuel_name?: string | null;
  action?: string | null;
  action_label?: string | null;
  old_price?: number | null;
  new_price?: number | null;
  created_at?: string | null;
  actor_name?: string | null;
}

export interface DriverOption {
  id: number;
  legal_name?: string | null;
  position?: string | null;
  photo_path?: string | null;
  available?: boolean;
  block_reason?: string | null;
  health?: { status?: string | null; label?: string | null } | null;
}

export interface GpsUnit {
  id: number;
  name?: string | null;
  plate?: string | null;
  vehicle_id?: number | null;
  vehicle_plate?: string | null;
}

export interface VehicleVisit {
  id: number;
  day: string;
  start_at: string;
  end_at: string;
  duration_s: number;
  place_name?: string | null;
  place_kind?: string | null;
  place_category?: string | null;
  place_distance_m?: number | null;
  is_habitual?: boolean;
  vehicle_id: number;
  vehicle_name?: string | null;
  plate_number?: string | null;
  driver_name?: string | null;
  on_trip?: boolean;
}

export interface DriverScope {
  id: number;
  scope_type?: string | null;
  scope_id?: number | null;
  label?: string | null;
  sub_label?: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// ── Formatlash ─────────────────────────────────────────────────────────────

/** v2 `toLocaleString('ru-RU')` — qurilma Intl'iga bog'lanmasdan: minglar bo'shliq bilan. */
export function fmtMoney(v?: number | null): string {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const [int, frac] = Math.abs(n).toFixed(2).split('.') as [string, string];
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const f = frac.replace(/0+$/, '');
  return `${n < 0 ? '-' : ''}${grouped}${f ? `,${f}` : ''}`;
}

/** ISO sana/vaqt satridan kesib DD.MM.YYYY — qurilma TZ'iga bog'liq emas. */
/**
 * Sarf — server modeli bo'yicha AYNAN km/l (`models/vehicle.py`: «1 litr yoqilg'iga necha km»).
 * Yoqilg'i turining `fuel_unit` i (litr, m³) bu yerga tegishli emas. Ro'yxat va profil bir xil.
 */
export function fmtConsumption(v: number | null | undefined, unitKmL: string): string | null {
  return v ? `${fmtMoney(v)} ${unitKmL}` : null;
}

export function fmtDate(s?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '—';
}

/** Serverning mintaqasiz Toshkent satri — kesiladi, qayta zonalanmaydi (v2 `slice(11, 16)`). */
export function fmtDateTime(s?: string | null): string {
  if (!s) return '—';
  const hm = /T(\d{2}:\d{2})/.exec(s);
  return hm ? `${fmtDate(s)} ${hm[1]}` : fmtDate(s);
}

export function dateRangeText(from?: string | null, to?: string | null): string {
  return `${fmtDate(from)}${to ? ` — ${fmtDate(to)}` : ''}`;
}

/** v2 `durationLabel`. */
export function durationMinutes(sec: number): { h: number; m: number } {
  const total = Math.round(sec / 60);
  return { h: Math.floor(total / 60), m: total % 60 };
}

export const today = () => dayjs().format('YYYY-MM-DD');

/** v2 `isInvalidRange`: ikkalasi berilgan va tugash boshlanishdan oldin. */
export function isInvalidRange(from?: string | null, to?: string | null): boolean {
  return !!from && !!to && to < from;
}

// ── Davlat raqami (v2 `PlateChip`) ─────────────────────────────────────────

/** "01A123BC" → { region: '01', rest: 'A 123 BC' } — harf va raqam guruhlari alohida o'qiladi. */
export function plateParts(plate?: string | null): { region: string; rest: string } | null {
  if (!plate) return null;
  const region = /^\d{2}/.test(plate) ? plate.slice(0, 2) : '';
  const body = region ? plate.slice(2) : plate;
  const rest = (body.match(/\d+|[A-Za-z]+/g) ?? [body]).join(' ');
  return { region, rest: rest.toUpperCase() };
}

// ── Mavjudlik (v2 `AvailabilityChip`) ──────────────────────────────────────

export type Availability = {
  key: 'inactive' | 'onTrip' | 'requested' | 'free';
  tone: Tone;
  until?: string;
  who?: string;
};

export function availability(v: Vehicle): Availability {
  if (v.is_active === false) return { key: 'inactive', tone: 'neutral' };
  if (v.is_busy) {
    const p = v.busy_periods?.[0];
    const m = /^\d{4}-(\d{2})-(\d{2})/.exec(p?.end_date ?? '');
    return {
      key: 'onTrip',
      tone: 'info',
      until: m ? `${m[2]}.${m[1]}` : undefined,
      who: p?.employee_name ?? undefined,
    };
  }
  if (v.has_pending) return { key: 'requested', tone: 'warning' };
  return { key: 'free', tone: 'success' };
}

// ── Mashinalar filtri (v2 FleetTab — o'nlab mashina, toraytirish mijozda) ──

export interface FleetFilters {
  state: '' | 'active' | 'inactive';
  avail: '' | 'free' | 'busy' | 'pending';
  fuel: number | null;
  gps: '' | '1' | '0';
  drv: '' | '1' | '0';
}

export const EMPTY_FLEET_FILTERS: FleetFilters = { state: '', avail: '', fuel: null, gps: '', drv: '' };

export function fleetFilterCount(f: FleetFilters): number {
  return [f.state, f.avail, f.fuel != null ? 'x' : '', f.gps, f.drv].filter(Boolean).length;
}

export function filterVehicles(all: Vehicle[], f: FleetFilters): Vehicle[] {
  return all.filter((v) => {
    if (f.state === 'active' && v.is_active === false) return false;
    if (f.state === 'inactive' && v.is_active !== false) return false;
    if (f.avail === 'free' && (v.is_busy || v.has_pending || v.is_active === false)) return false;
    if (f.avail === 'busy' && !v.is_busy) return false;
    if (f.avail === 'pending' && !(v.has_pending && !v.is_busy)) return false;
    if (f.fuel != null && (v.fuel_type_id ?? null) !== f.fuel) return false;
    if (f.gps === '1' && !v.gps_device_id) return false;
    if (f.gps === '0' && v.gps_device_id) return false;
    if (f.drv === '1' && !v.driver_employee_id) return false;
    if (f.drv === '0' && v.driver_employee_id) return false;
    return true;
  });
}

/** v2 `useFleetOverview` — bugungi oraliq bilan olingan BIR ro'yxatdan. */
export function fleetOverview(rows: Vehicle[]) {
  const active = rows.filter((v) => v.is_active !== false);
  return {
    total: rows.length,
    free: active.filter((v) => !v.is_busy && !v.has_pending).length,
    onTrip: active.filter((v) => v.is_busy).length,
    requested: active.filter((v) => v.has_pending && !v.is_busy).length,
    inactive: rows.length - active.length,
    gps: rows.filter((v) => !!v.gps_device_id).length,
  };
}

// ── Tablar (v2 `VehiclesPage` tabs) ────────────────────────────────────────

export type FleetTab = 'fleet' | 'requests' | 'fuel' | 'visits' | 'drivers';

/** GPS ma'lumoti (tashriflar, jonli holat) — operator va tasdiqlovchi (server `can_view_fleet`). */
export const canSeeGps = (a?: FleetAccess | null) => !!(a?.can_manage || a?.can_approve);

/**
 * Mashinani YOZISH huquqi — server `VehicleService._assert_manager` ning aynan o'zi: sayt bosh admini
 * har doim, boshqalar faqat o'sha filialning transport mas'uli (`managed_branch_ids`). `can_manage`
 * yetarli EMAS: u «biror filialda mas'ul» degani, server esa mashina FILIALI bo'yicha tekshiradi
 * (1-filial mas'uli 29-filial mashinasini qo'shsa → 403). v2 `can_manage` ga qaraydi — bu v2/server
 * nomuvofiqligi; mobil server rad etadigan tugmani ko'rsatmaydi.
 */
export function canManageFleetBranch(
  a: FleetAccess | null | undefined,
  branchId: number | null | undefined,
  user: User | null | undefined,
): boolean {
  if (!a?.can_manage) return false;
  if (isSiteMasterAdmin(user)) return true;
  if (branchId == null) return false;
  return a.managed_branch_ids.some((id) => Number(id) === Number(branchId));
}

/** Yangi mashina — forma filial yubormaydi, server avtopark (BFD) filialiga yozadi (`create_vehicle`). */
export const canAddVehicle = (a: FleetAccess | null | undefined, user: User | null | undefined) =>
  canManageFleetBranch(a, a?.provider_branch_id, user);

/** Tahrir/o'chirish — mashinaning o'z filiali (`update_vehicle` / `delete_vehicle`). */
export const canEditVehicle = (
  a: FleetAccess | null | undefined,
  v: Pick<Vehicle, 'organization_branch_id'>,
  user: User | null | undefined,
) => canManageFleetBranch(a, v.organization_branch_id ?? a?.provider_branch_id, user);

export function tabsFor(access: FleetAccess | null | undefined, user: User | null | undefined): FleetTab[] {
  const tabs: FleetTab[] = ['fleet', 'requests'];
  if (canSeeGps(access)) tabs.push('fuel', 'visits');
  // Haydovchi doirasi — bitta global sozlama, faqat sayt bosh admini (v2 `isSiteMasterAdmin`).
  if (isSiteMasterAdmin(user)) tabs.push('drivers');
  return tabs;
}

/** URL `?tab=` (bildirishnoma) — ruxsat etilmagan bo'lsa «Mashinalar». */
export function resolveTab(raw: unknown, allowed: FleetTab[]): FleetTab {
  return typeof raw === 'string' && (allowed as string[]).includes(raw) ? (raw as FleetTab) : 'fleet';
}

// ── So'rovlar navbati ──────────────────────────────────────────────────────

export const REQ_TONE: Record<string, Tone> = {
  pending: 'warning',
  awaiting_approval: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const reqTone = (s?: string | null): Tone => REQ_TONE[s ?? ''] ?? 'neutral';

/** v2: tasdiqlovchi uchun «Tasdiqlash kerak» birinchi va standart; qolganlarga «Biriktirish kerak». */
export function requestStatuses(canApprove: boolean): string[] {
  return [...(canApprove ? ['awaiting_approval'] : []), 'pending', 'approved', 'rejected'];
}

export const defaultRequestStatus = (canApprove: boolean) => (canApprove ? 'awaiting_approval' : 'pending');

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  awaiting_approval: 'vehicles.reqAwaiting',
  pending: 'vehicles.reqPending',
  approved: 'vehicles.reqApproved',
  rejected: 'vehicles.reqRejected',
};

export type StepState = 'done' | 'current' | 'pending' | 'rejected';
export interface FlowStep {
  key: 'approve' | 'attach' | 'trip' | 'close';
  state: StepState;
  hint?: string;
}

/**
 * v2 `requestSteps`: bosh apparat tasdig'i → avtopark mashina biriktiradi → safar → aniq
 * xarajat bilan yopiladi. Rad etish o'lgan bosqichni bo'yaydi; tasdiqlovchisiz filial
 * birinchi bosqichni o'tkazib yuboradi.
 */
export function requestSteps(r: VehicleRequest): FlowStep[] {
  const st = r.status ?? 'pending';
  const needsApproval = !!r.approval_status && r.approval_status !== 'not_required';
  const rejectedAtApproval = st === 'rejected' && r.approval_status === 'rejected';
  const steps: FlowStep[] = [];
  if (needsApproval) {
    steps.push({
      key: 'approve',
      state: rejectedAtApproval ? 'rejected' : st === 'awaiting_approval' ? 'current' : 'done',
    });
  }
  steps.push({
    key: 'attach',
    state:
      st === 'rejected' && !rejectedAtApproval
        ? 'rejected'
        : st === 'pending'
          ? 'current'
          : st === 'approved'
            ? 'done'
            : 'pending',
  });
  steps.push({
    key: 'trip',
    hint: r.vehicle?.plate_number ?? undefined,
    state: st === 'approved' ? (r.finalized_at ? 'done' : 'current') : 'pending',
  });
  steps.push({ key: 'close', state: r.finalized_at ? 'done' : 'pending' });
  return steps;
}

export const STEP_TONE: Record<StepState, Tone> = {
  done: 'success',
  current: 'brand',
  pending: 'neutral',
  rejected: 'danger',
};

/** v2 `RequestRow` tugmalari — QATOR bayroqlaridan (ro'yxat darajasidagi `access` dan emas). */
export function requestActions(r: VehicleRequest) {
  return {
    decide: !!r.can_approve,
    attach: !!r.can_respond && r.status === 'pending',
    finalize: !!r.can_finalize && !!r.vehicle,
  };
}

/** Haqiqiy raqamlar bo'lsa ular, aks holda taxminiy (v2). */
export function requestFigures(r: VehicleRequest): { km: number | null; cost: number | null } {
  return { km: r.actual_distance_km ?? r.distance_km ?? null, cost: r.actual_fuel_cost ?? r.fuel_cost ?? null };
}

/** Izoh MAJBURIY (tasdiq/rad, javob) — server bo'sh izohni 400 qiladi. */
export function approveBody(approved: boolean, note: string) {
  const n = note.trim();
  if (!n) return { ok: false as const, error: 'vehicles.noteRequired' as const };
  return { ok: true as const, body: { approved, note: n } };
}

export function respondBody(p: {
  approved: boolean;
  vehicleId: number | null;
  driverId: number | null;
  note: string;
  alsoIds: number[];
}) {
  const n = p.note.trim();
  if (!n) return { ok: false as const, error: 'vehicles.noteRequired' as const };
  if (p.approved && p.vehicleId == null) return { ok: false as const, error: 'vehicles.vehicleRequired' as const };
  const body: {
    approved: boolean;
    vehicle_id: number | null;
    assigned_driver_employee_id: number | null;
    response_text: string;
    also_request_ids?: number[];
  } = {
    approved: p.approved,
    vehicle_id: p.approved ? p.vehicleId : null,
    assigned_driver_employee_id: p.driverId,
    response_text: n,
  };
  if (p.approved && p.alsoIds.length) body.also_request_ids = p.alsoIds;
  return { ok: true as const, body };
}

/** Musbat son yoki bo'sh; vergul ham qabul qilinadi. `undefined` — noto'g'ri. */
export function parseNumber(s: string): number | null | undefined {
  const v = s.trim().replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function finalizeBody(km: string, note: string) {
  const d = parseNumber(km);
  if (d === undefined) return { ok: false as const, error: 'vehicles.invalidNumber' as const };
  return { ok: true as const, body: { actual_distance_km: d, note: note.trim() || null } };
}

/** Mashina tanlagichi (v2 RequestActionModal): band — tanlab bo'lmaydi; rahbar mashinasi — ogohlantirish. */
export function vehiclePickerOptions(rows: Vehicle[], t: (k: string) => string) {
  return rows.map((v) => ({
    value: v.id,
    label: `${v.plate_number ?? ''} · ${v.model_name ?? ''}`,
    disabled: !!v.is_busy,
    subLabel: v.is_busy
      ? t('vehicles.busyOnDates')
      : [
          v.driver?.legal_name ?? null,
          v.leader?.legal_name ? `⚠ ${t('vehicles.leaderCar')}: ${v.leader.legal_name}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
  }));
}

/** v2 `useDriverOptions`: serverning hukmi — band/kasal/ko'rikdan o'tmagan tanlatilmaydi. */
export function driverPickerOptions(rows: DriverOption[]) {
  return rows.map((d) => {
    const blocked = d.available === false;
    const warn = d.health?.status && d.health.status !== 'good' ? `⚠ ${d.health.label ?? ''}` : null;
    return {
      value: d.id,
      label: d.legal_name ?? '—',
      photo: d.photo_path ?? null,
      disabled: blocked,
      subLabel: blocked
        ? `⛔ ${d.block_reason ?? ''}`.trim()
        : [d.position, warn].filter(Boolean).join(' · ') || undefined,
    };
  });
}

// ── Jonli holat (v2 VehicleMap holat paneli; xaritasiz) ────────────────────

export function liveStatus(live?: VehicleLive | null) {
  if (!live || live.lat == null) return { key: 'vehicles.gpsNoSignal', fresh: false } as const;
  const fresh = live.age_seconds != null && live.age_seconds < 300;
  const moving = (live.speed || 0) > 3;
  return {
    key: moving ? 'vehicles.gpsMoving' : fresh ? 'vehicles.gpsStopped' : 'vehicles.gpsStale',
    fresh,
    speed: Math.round(live.speed || 0),
    agoMin: live.age_seconds != null ? Math.round(live.age_seconds / 60) : null,
  } as const;
}

// ── Mashina formasi (v2 VehicleModal) ──────────────────────────────────────

export interface VehicleForm {
  plate_number: string;
  model_name: string;
  color: string;
  year: string;
  seats: string;
  fuel_type_id: number | null;
  fuel_consumption: string;
  gps_device_id: string;
  driver_employee_id: number | null;
}

export function seedVehicleForm(v?: Vehicle | null): VehicleForm {
  return {
    plate_number: v?.plate_number ?? '',
    model_name: v?.model_name ?? '',
    color: v?.color ?? '',
    year: v?.year ? String(v.year) : '',
    seats: v?.seats ? String(v.seats) : '',
    fuel_type_id: v?.fuel_type_id ?? null,
    fuel_consumption: v?.fuel_consumption ? String(v.fuel_consumption) : '',
    gps_device_id: v?.gps_device_id ?? '',
    driver_employee_id: v?.driver_employee_id ?? null,
  };
}

export function buildVehicleBody(f: VehicleForm) {
  if (!f.plate_number.trim()) return { ok: false as const, error: 'vehicles.plateRequired' as const };
  if (!f.model_name.trim()) return { ok: false as const, error: 'vehicles.modelRequired' as const };
  const year = parseNumber(f.year);
  const seats = parseNumber(f.seats);
  const cons = parseNumber(f.fuel_consumption);
  // Yil va o'rinlar soni — butun son (server `int`); sarf — kasr bo'lishi mumkin.
  const notInt = (n: number | null | undefined) => n != null && !Number.isInteger(n);
  if (year === undefined || seats === undefined || cons === undefined || notInt(year) || notInt(seats)) {
    return { ok: false as const, error: 'vehicles.invalidNumber' as const };
  }
  return {
    ok: true as const,
    body: {
      model_name: f.model_name.trim(),
      plate_number: f.plate_number.trim().toUpperCase(),
      color: f.color.trim() || null,
      year,
      seats,
      fuel_type_id: f.fuel_type_id,
      fuel_consumption: cons,
      gps_device_id: f.gps_device_id.trim() || null,
      driver_employee_id: f.driver_employee_id,
    },
  };
}

// ── Yoqilg'i turlari ───────────────────────────────────────────────────────

/** Server faqat shularni qabul qiladi (`core/vehicle_types.FUEL_UNITS`). */
export const FUEL_UNITS = ['litr', 'm³', 'kVt·soat'] as const;

/** Narx faqat tasdiqlovchi imzolagach hisobga kiradi. */
export function isFuelApproved(f: FuelType): boolean {
  return (f.approval_status ?? '') === 'approved';
}

export type FuelFilter = '' | 'approved' | 'pending' | 'rejected';

export function filterFuel(all: FuelType[], search: string, only: FuelFilter): FuelType[] {
  const q = search.trim().toLowerCase();
  return all.filter((f) => {
    if (q && !(f.name ?? '').toLowerCase().includes(q)) return false;
    if (only === 'approved' && !isFuelApproved(f)) return false;
    if (only === 'pending' && (isFuelApproved(f) || f.approval_status === 'rejected')) return false;
    if (only === 'rejected' && f.approval_status !== 'rejected') return false;
    return true;
  });
}

export function pendingFuelCount(all: FuelType[]): number {
  return all.filter((f) => !isFuelApproved(f) && f.approval_status !== 'rejected' && f.price != null).length;
}

/** v2 qator nishoni: rad etilgan — qizil; tasdiqlanmagan — sariq; tasdiqlangan — nishonsiz. */
export function fuelBadge(f: FuelType): { key: string; tone: Tone } | null {
  if (f.approval_status === 'rejected') return { key: 'vehicles.priceRejected', tone: 'danger' };
  if (!isFuelApproved(f)) return { key: 'vehicles.notApproved', tone: 'warning' };
  return null;
}

export function buildFuelBody(name: string, unit: string, price: string) {
  if (!name.trim()) return { ok: false as const, error: 'vehicles.fuelNameRequired' as const };
  const p = parseNumber(price);
  if (p === undefined) return { ok: false as const, error: 'vehicles.invalidNumber' as const };
  return { ok: true as const, body: { name: name.trim(), unit: unit.trim() || 'litr', price: p } };
}

/** `FuelTypeApprove`: rad etishda izoh majburiy; tasdiqlovchi narxni to'g'rilab tasdiqlay oladi. */
export function fuelDecisionBody(approved: boolean, price: string, note: string) {
  if (!approved && !note.trim()) return { ok: false as const, error: 'vehicles.rejectNoteRequired' as const };
  const p = parseNumber(price);
  if (approved && p === undefined) return { ok: false as const, error: 'vehicles.invalidNumber' as const };
  return { ok: true as const, body: { approved, note: note.trim() || null, price: approved && p != null ? p : null } };
}

// ── Tashriflar (v2 VisitsTab + places.ts) ──────────────────────────────────

export const PLACE_CATEGORIES = ['food', 'hotel', 'entertainment', 'attraction'] as const;
export const MIN_OPTIONS = [5, 10, 20, 30, 60] as const;

const KIND_KEYS: Record<string, string> = {
  cafe: 'placeCafe',
  restaurant: 'placeRestaurant',
  fast_food: 'placeFastFood',
  food_court: 'placeFoodCourt',
  bar: 'placeBar',
  pub: 'placeBar',
  nightclub: 'placeNightclub',
  hookah_lounge: 'placeHookah',
  cinema: 'placeCinema',
  theatre: 'placeTheatre',
  sauna: 'placeSauna',
  water_park: 'placeWaterPark',
  bowling_alley: 'placeBowling',
  amusement_arcade: 'placeArcade',
  hotel: 'placeHotel',
  guest_house: 'placeGuestHouse',
  hostel: 'placeHostel',
  motel: 'placeHotel',
  resort: 'placeResort',
  attraction: 'placeAttraction',
  branch: 'placeBranch',
  location: 'placeLocation',
};

const CATEGORY_KEYS: Record<string, string> = {
  food: 'catFood',
  hotel: 'catHotel',
  entertainment: 'catEntertainment',
  attraction: 'catAttraction',
  own: 'catOwn',
};

/** i18n kaliti yoki xom qiymat (noma'lum tur/toifa) — `t` chaqiruvchida. */
export function categoryLabelKey(category?: string | null): string | null {
  const k = CATEGORY_KEYS[category ?? ''];
  return k ? `vehicles.${k}` : null;
}

export function placeLabelKey(kind?: string | null, category?: string | null): string | null {
  const k = KIND_KEYS[kind ?? ''];
  return k ? `vehicles.${k}` : categoryLabelKey(category);
}

export interface VisitFilters {
  from: string;
  to: string;
  vehicleId: number | null;
  category: string;
  minMinutes: number;
  includeHabitual: boolean;
}

/** v2: standart — oxirgi 7 kun, 10 daqiqadan uzoq, doimiy joylarsiz. */
export function defaultVisitFilters(): VisitFilters {
  return {
    from: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    to: today(),
    vehicleId: null,
    category: '',
    minMinutes: 10,
    includeHabitual: false,
  };
}

export function visitParams(f: VisitFilters, page: number, size: number) {
  const p: Record<string, string | number | boolean> = {
    page,
    size,
    date_from: f.from,
    date_to: f.to || f.from,
    min_minutes: f.minMinutes,
  };
  if (f.vehicleId != null) p.vehicle_id = f.vehicleId;
  if (f.category) p.category = f.category;
  if (f.includeHabitual) p.include_habitual = true;
  return p;
}

// ── Haydovchi doirasi ──────────────────────────────────────────────────────

export type ScopeKind = 'department' | 'job_position' | 'employee';
export const SCOPE_KINDS: ScopeKind[] = ['department', 'job_position', 'employee'];

export function scopeKindKey(type?: string | null): string {
  return type === 'employee'
    ? 'vehicles.scopeEmployee'
    : type === 'job_position'
      ? 'vehicles.scopePosition'
      : 'vehicles.scopeDepartment';
}
