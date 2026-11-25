// Pure helpers of the sanatorium "sections" screens (packages, seasons, services, organizations,
// procedure rooms, diets, quote, analytics): validation + request bodies, reorder maths, chart scaling.
// Every body builder returns `{ ok: true, body }` or `{ ok: false, error }` (an i18n key) so the
// forms never send a request the strict server schema would reject.

import dayjs from 'dayjs';
import type { User } from '@/types';
import { hasSanRole } from './sanatorium';

export type Built<T> = { ok: true; body: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Text in the app language: `name_uz` / `name_ru` / `name_en` with an Uzbek fallback. */
export function pickText(o: Record<string, unknown> | null | undefined, field: string, lang: string): string {
  if (!o) return '';
  const l = lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uz';
  const v = o[`${field}_${l}`];
  if (typeof v === 'string' && v.trim()) return v;
  const uz = o[`${field}_uz`];
  return typeof uz === 'string' ? uz : '';
}

const trimOrNull = (s: string): string | null => (s.trim() ? s.trim() : null);

/** `"1 500 000,5"` -> `"1500000.50"`; null when negative / not a number / above `max`. */
export function parseMoney(text: string, max = 1e12): string | null {
  const n = Number(text.replace(/\s/g, '').replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= max ? n.toFixed(2) : null;
}

/** Whole number inside [min, max] or null. */
export function parseIntIn(text: string, min: number, max: number): number | null {
  const s = text.trim();
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

export const isHhmm = (s: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(s.trim());
const hhmm = (s: string | null | undefined): string => (s ?? '').slice(0, 5);

/** Adds / removes `v` keeping the list sorted (weekday and id pickers). */
export function toggleValue<T extends string | number>(list: T[], v: T): T[] {
  return (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Ids in the new order after moving `id` by `delta` places (clamped); unchanged when unknown. */
export function reorderIds(ids: number[], id: number, delta: number): number[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const out = ids.slice();
  const to = Math.min(out.length - 1, Math.max(0, from + delta));
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x!);
  return out;
}

/** `[0,1,2,3,4,5,6]` -> «every day»; otherwise the short names joined (`names` index 0 = Monday). */
export function weekdaysLabel(days: number[], names: string[], allLabel: string): string {
  if (days.length === 0 || days.length === 7) return allLabel;
  return days.slice().sort((a, b) => a - b).map((d) => names[d] ?? '').join(', ');
}

// ── Packages ──
export type PackageItemDraft = { serviceId: number | null; quantity: string; text: string };
export type PackageDraft = {
  nameUz: string; nameRu: string; nameEn: string;
  descUz: string; descRu: string; descEn: string;
  nights: string; price: string; mode: 'per_person' | 'per_room';
  guestTypes: string[]; items: PackageItemDraft[];
  childDiscount: boolean; active: boolean;
};
export const emptyPackageDraft = (): PackageDraft => ({
  nameUz: '', nameRu: '', nameEn: '', descUz: '', descRu: '', descEn: '',
  nights: '7', price: '', mode: 'per_person', guestTypes: [], items: [], childDiscount: true, active: true,
});

export function packageBody(d: PackageDraft): Built<Record<string, unknown>> {
  if (d.nameUz.trim().length < 2) return fail('sanatorium.nameShort');
  const nights = parseIntIn(d.nights, 1, 365);
  if (nights == null) return fail('sanatorium.s2.nightsRange');
  const price = parseMoney(d.price);
  if (price == null) return fail('sanatorium.priceInvalid');
  const items: Record<string, unknown>[] = [];
  for (const it of d.items) {
    const qty = parseIntIn(it.quantity || '1', 1, 1000);
    if (qty == null) return fail('sanatorium.s2.qtyRange');
    if (it.serviceId == null && !it.text.trim()) continue;
    items.push({ ...(it.serviceId != null ? { service_id: it.serviceId } : {}), quantity: qty, ...(it.text.trim() ? { text: it.text.trim() } : {}) });
  }
  return {
    ok: true,
    body: {
      name_uz: d.nameUz.trim(), name_ru: trimOrNull(d.nameRu), name_en: trimOrNull(d.nameEn),
      description_uz: trimOrNull(d.descUz), description_ru: trimOrNull(d.descRu), description_en: trimOrNull(d.descEn),
      nights, price, price_mode: d.mode, guest_types: d.guestTypes, items, child_discount: d.childDiscount, is_active: d.active,
    },
  };
}

// ── Seasonal price rules ──
export type SeasonScope = 'all' | 'room_type' | 'rooms' | 'packages';
export const SEASON_SCOPES: SeasonScope[] = ['all', 'room_type', 'rooms', 'packages'];
export type SeasonDraft = {
  name: string; from: string; to: string; scope: SeasonScope; values: string[];
  mode: 'percent' | 'fixed'; value: string; priority: string; active: boolean;
};
export const emptySeasonDraft = (today: string): SeasonDraft => ({
  name: '', from: today, to: today, scope: 'all', values: [], mode: 'percent', value: '', priority: '0', active: true,
});

export function seasonBody(d: SeasonDraft): Built<Record<string, unknown>> {
  if (d.name.trim().length < 2) return fail('sanatorium.nameShort');
  if (d.to < d.from) return fail('sanatorium.errors.invalid_period');
  if (d.scope !== 'all' && d.values.length === 0) return fail('sanatorium.s2.pickScopeValues');
  if (d.mode === 'fixed' && d.scope === 'packages') return fail('sanatorium.s2.fixedNotForPackages');
  const n = Number(d.value.replace(/\s/g, '').replace(',', '.'));
  if (d.value.trim() === '' || !Number.isFinite(n)) return fail('sanatorium.priceInvalid');
  if (d.mode === 'percent' ? n < -100 || n > 1000 : n < 0) return fail('sanatorium.priceInvalid');
  const priority = parseIntIn(d.priority || '0', 0, 1000);
  if (priority == null) return fail('sanatorium.s2.priorityRange');
  return {
    ok: true,
    body: {
      name: d.name.trim(), date_from: d.from, date_to: d.to, scope: d.scope,
      scope_values: d.scope === 'all' ? [] : d.values, mode: d.mode, value: n.toFixed(2), priority, is_active: d.active,
    },
  };
}

// ── Paid services ──
export type ServiceUnit = 'per_session' | 'per_hour' | 'per_day' | 'per_item';
export const SERVICE_UNITS: ServiceUnit[] = ['per_session', 'per_hour', 'per_day', 'per_item'];
export type ServiceDraft = {
  nameUz: string; nameRu: string; nameEn: string;
  descUz: string; descRu: string; descEn: string;
  category: string; price: string; unit: ServiceUnit; duration: string; capacity: string;
  needsBooking: boolean; workFrom: string; workTo: string; weekdays: number[]; active: boolean;
};
export const emptyServiceDraft = (): ServiceDraft => ({
  nameUz: '', nameRu: '', nameEn: '', descUz: '', descRu: '', descEn: '', category: '', price: '',
  unit: 'per_session', duration: '', capacity: '1', needsBooking: false, workFrom: '', workTo: '', weekdays: [], active: true,
});

export function serviceBody(d: ServiceDraft): Built<Record<string, unknown>> {
  if (d.nameUz.trim().length < 2) return fail('sanatorium.nameShort');
  const price = parseMoney(d.price);
  if (price == null) return fail('sanatorium.priceInvalid');
  const capacity = parseIntIn(d.capacity || '1', 1, 500);
  if (capacity == null) return fail('sanatorium.s2.capacityRange');
  let duration: number | null = null;
  if (d.duration.trim()) {
    duration = parseIntIn(d.duration, 5, 1440);
    if (duration == null) return fail('sanatorium.s2.durationRange');
  }
  if (d.needsBooking && duration == null) return fail('sanatorium.s2.durationRequired');
  const hasFrom = !!d.workFrom.trim();
  const hasTo = !!d.workTo.trim();
  if (hasFrom !== hasTo) return fail('sanatorium.s2.hoursBoth');
  if (hasFrom && (!isHhmm(d.workFrom) || !isHhmm(d.workTo) || d.workFrom >= d.workTo)) return fail('sanatorium.s2.hoursInvalid');
  return {
    ok: true,
    body: {
      name_uz: d.nameUz.trim(), name_ru: trimOrNull(d.nameRu), name_en: trimOrNull(d.nameEn),
      description_uz: trimOrNull(d.descUz), description_ru: trimOrNull(d.descRu), description_en: trimOrNull(d.descEn),
      category: trimOrNull(d.category), price, unit: d.unit, duration_min: duration, capacity,
      needs_booking: d.needsBooking, work_from: hasFrom ? d.workFrom.trim() : null, work_to: hasTo ? d.workTo.trim() : null,
      weekdays: d.weekdays, is_active: d.active,
    },
  };
}
export const draftFromService = (s: {
  name_uz: string; name_ru?: string | null; name_en?: string | null;
  description_uz?: string | null; description_ru?: string | null; description_en?: string | null;
  category?: string | null; price?: string; unit: ServiceUnit; duration_min: number | null; capacity: number;
  needs_booking: boolean; work_from: string | null; work_to: string | null; weekdays: number[]; is_active: boolean;
}): ServiceDraft => ({
  nameUz: s.name_uz, nameRu: s.name_ru ?? '', nameEn: s.name_en ?? '',
  descUz: s.description_uz ?? '', descRu: s.description_ru ?? '', descEn: s.description_en ?? '',
  category: s.category ?? '', price: s.price ? String(Number(s.price)) : '', unit: s.unit,
  duration: s.duration_min ? String(s.duration_min) : '', capacity: String(s.capacity), needsBooking: s.needs_booking,
  workFrom: hhmm(s.work_from), workTo: hhmm(s.work_to), weekdays: s.weekdays ?? [], active: s.is_active,
});

// ── Organizations ──
export type OrgDraft = {
  name: string; tin: string; address: string; bankName: string; bankAccount: string; bankMfo: string;
  contactPerson: string; contactPhone: string; contractNo: string; contractDate: string | null; note: string; active: boolean;
};
export const emptyOrgDraft = (): OrgDraft => ({
  name: '', tin: '', address: '', bankName: '', bankAccount: '', bankMfo: '', contactPerson: '', contactPhone: '',
  contractNo: '', contractDate: null, note: '', active: true,
});
export function orgBody(d: OrgDraft): Built<Record<string, unknown>> {
  if (d.name.trim().length < 2) return fail('sanatorium.nameShort');
  if (d.tin.trim() && !/^\d{9}$/.test(d.tin.trim())) return fail('sanatorium.s2.tinInvalid');
  return {
    ok: true,
    body: {
      name: d.name.trim(), tin: trimOrNull(d.tin), address: trimOrNull(d.address), bank_name: trimOrNull(d.bankName),
      bank_account: trimOrNull(d.bankAccount), bank_mfo: trimOrNull(d.bankMfo), contact_person: trimOrNull(d.contactPerson),
      contact_phone: trimOrNull(d.contactPhone), contract_no: trimOrNull(d.contractNo), contract_date: d.contractDate,
      note: trimOrNull(d.note), is_active: d.active,
    },
  };
}

// ── Procedure rooms ──
export type ProcRoomDraft = {
  name: string; specialtyId: number | null; capacity: string; slot: string;
  workFrom: string; workTo: string; weekdays: number[]; description: string; active: boolean;
};
export const emptyProcRoomDraft = (): ProcRoomDraft => ({
  name: '', specialtyId: null, capacity: '1', slot: '20', workFrom: '09:00', workTo: '18:00', weekdays: [0, 1, 2, 3, 4, 5], description: '', active: true,
});
export function procRoomBody(d: ProcRoomDraft): Built<Record<string, unknown>> {
  if (d.name.trim().length < 2) return fail('sanatorium.nameShort');
  const capacity = parseIntIn(d.capacity, 1, 50);
  if (capacity == null) return fail('sanatorium.s2.capacityRange50');
  const slot = parseIntIn(d.slot, 5, 240);
  if (slot == null) return fail('sanatorium.s2.slotRange');
  if (!isHhmm(d.workFrom) || !isHhmm(d.workTo) || d.workFrom >= d.workTo) return fail('sanatorium.s2.hoursInvalid');
  if (d.weekdays.length === 0) return fail('sanatorium.s2.pickWeekdays');
  return {
    ok: true,
    body: {
      name: d.name.trim(), specialty_id: d.specialtyId, capacity, slot_minutes: slot, work_from: d.workFrom.trim(),
      work_to: d.workTo.trim(), weekdays: d.weekdays, description: trimOrNull(d.description), is_active: d.active,
    },
  };
}

// ── Diets ──
export type DietDraft = { code: string; nameUz: string; nameRu: string; nameEn: string; description: string; sort: string; active: boolean };
export const emptyDietDraft = (): DietDraft => ({ code: '', nameUz: '', nameRu: '', nameEn: '', description: '', sort: '0', active: true });
export function dietBody(d: DietDraft): Built<Record<string, unknown>> {
  if (!d.code.trim()) return fail('sanatorium.s2.codeRequired');
  if (d.nameUz.trim().length < 2) return fail('sanatorium.nameShort');
  const sort = parseIntIn(d.sort || '0', 0, 100000);
  if (sort == null) return fail('sanatorium.s2.priorityRange');
  return {
    ok: true,
    body: {
      code: d.code.trim(), name_uz: d.nameUz.trim(), name_ru: trimOrNull(d.nameRu), name_en: trimOrNull(d.nameEn),
      description: trimOrNull(d.description), sort_order: sort, is_active: d.active,
    },
  };
}

// ── Quote calculator ──
export type QuoteDraft = {
  start: string; end: string; adults: string; children: number[]; roomId: number | null; packageId: number | null;
  guestType: string | null; services: { serviceId: number; quantity: number }[];
};
export function quoteBody(d: QuoteDraft): Built<Record<string, unknown>> {
  if (!(d.end > d.start)) return fail('sanatorium.errors.invalid_period');
  const adults = parseIntIn(d.adults || '0', 0, 20);
  if (adults == null) return fail('sanatorium.s2.adultsRange');
  if (adults + d.children.length < 1) return fail('sanatorium.s2.needGuests');
  return {
    ok: true,
    body: {
      start: d.start, end: d.end, adults, children: d.children,
      ...(d.roomId ? { room_id: d.roomId } : {}), ...(d.packageId ? { package_id: d.packageId } : {}),
      ...(d.guestType ? { guest_type: d.guestType } : {}),
      services: d.services.map((s) => ({ service_id: s.serviceId, quantity: s.quantity })),
    },
  };
}

/** Child ages from free text (`"3, 7 10"`); invalid / out of range ages are dropped, max 20. */
export function parseAges(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 120)
    .slice(0, 20);
}

// ── Service orders / slots ──
export type OrderStatus = 'requested' | 'confirmed' | 'done' | 'cancelled';
export const ORDER_STATUSES: OrderStatus[] = ['requested', 'confirmed', 'done', 'cancelled'];
/** Status changes the server allows (requested -> confirmed|cancelled|done, confirmed -> done|cancelled, done -> cancelled). */
export function nextOrderStatuses(s: OrderStatus): OrderStatus[] {
  return ({ requested: ['confirmed', 'done', 'cancelled'], confirmed: ['done', 'cancelled'], done: ['cancelled'], cancelled: [] } as Record<OrderStatus, OrderStatus[]>)[s];
}
/** Only a cancelled or a requested order may be deleted. */
export const canDeleteOrder = (s: OrderStatus): boolean => s === 'cancelled' || s === 'requested';
/** Quantity and time are frozen on done / cancelled orders. */
export const canEditOrder = (s: OrderStatus): boolean => s === 'requested' || s === 'confirmed';

// ── Analytics ──
/** Bar height in percent of the tallest value (at least 2 when the value is above 0, so it stays visible). */
export function barPercents(values: number[], max?: number): number[] {
  const top = max ?? Math.max(0, ...values);
  if (top <= 0) return values.map(() => 0);
  return values.map((v) => (v <= 0 ? 0 : Math.max(2, Math.min(100, Math.round((v / top) * 100)))));
}
/** Thins a long daily series to at most `n` points by averaging buckets (chart stays readable). */
export function downsample(values: number[], n: number): number[] {
  if (values.length <= n || n < 1) return values;
  const size = values.length / n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * size);
    const b = Math.max(a + 1, Math.floor((i + 1) * size));
    const slice = values.slice(a, b);
    out.push(slice.reduce((s, x) => s + x, 0) / slice.length);
  }
  return out;
}

/** File name of a downloaded stay document / invoice. */
export const docFileName = (kind: string, id: number, format: 'pdf' | 'docx'): string => `${kind}-${id}.${format}`;
export const DOC_MIME: Record<'pdf' | 'docx', string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// ── Feedback (paper form entry + list filters) ──
export type FeedbackItemDraft = { kind: 'doctor' | 'service'; refId: number | null; name: string; rating: number; comment: string };
export type FeedbackDraft = {
  stayId: number | null; overall: number; room: number; food: number; staff: number; comment: string; items: FeedbackItemDraft[];
};
export const emptyFeedbackDraft = (): FeedbackDraft => ({ stayId: null, overall: 0, room: 0, food: 0, staff: 0, comment: '', items: [] });
export const emptyFeedbackItem = (): FeedbackItemDraft => ({ kind: 'doctor', refId: null, name: '', rating: 0, comment: '' });

/** Body of `POST /sanatorium/feedback` for a paper form; ratings 1..5, optional ones left out when 0. */
export function feedbackBody(d: FeedbackDraft): Built<Record<string, unknown>> {
  if (d.stayId == null) return fail('sanCatalog.fb.pickStay');
  if (d.overall < 1) return fail('sanCatalog.fb.overallRequired');
  const items: Record<string, unknown>[] = [];
  for (const it of d.items) {
    if (it.rating < 1 || (it.kind === 'doctor' ? it.refId == null : !it.name.trim())) return fail('sanCatalog.fb.itemInvalid');
    items.push(
      it.kind === 'doctor'
        ? { kind: 'doctor', ref_id: it.refId, rating: it.rating, comment: trimOrNull(it.comment) }
        : { kind: 'service', name: it.name.trim(), rating: it.rating, comment: trimOrNull(it.comment) },
    );
  }
  return {
    ok: true,
    body: {
      stay_id: d.stayId, overall: d.overall, room_rating: d.room || null, food_rating: d.food || null, staff_rating: d.staff || null,
      comment: trimOrNull(d.comment), items,
    },
  };
}

/** Stay statuses a paper feedback form may be entered for. */
export const FEEDBACK_STAY_STATUSES = ['checked_in', 'checked_out', 'early_left'];
export const FEEDBACK_SOURCES = ['portal', 'telegram', 'registrar'] as const;
export const ratingTone = (n: number): 'success' | 'warning' | 'danger' => (n >= 4 ? 'success' : n === 3 ? 'warning' : 'danger');

export type FeedbackFilterDraft = { from: string; to: string; min: number | null; max: number | null; doctor: number | null; source: string | null; q: string };
/** Query params of the feedback list: unset filters are left out; min is never above max. */
export function feedbackParams(f: FeedbackFilterDraft): Record<string, unknown> {
  const p: Record<string, unknown> = { from: f.from, to: f.to };
  if (f.min != null) p.min_overall = f.min;
  if (f.max != null) p.max_overall = f.max;
  if (f.doctor != null) p.doctor_staff_id = f.doctor;
  if (f.source) p.source = f.source;
  if (f.q.trim()) p.q = f.q.trim();
  return p;
}
export const feedbackFilterCount = (f: FeedbackFilterDraft): number =>
  [f.min != null, f.max != null, f.doctor != null, !!f.source, !!f.q.trim()].filter(Boolean).length;

// ── Analytics ──
export const ANALYTICS_PRESETS = [7, 30, 90] as const;
/** «Last N days» ends today and starts N-1 days earlier (so 30 days = 30 calendar days). */
export const presetRange = (n: number, today: string): { from: string; to: string } => ({ from: dayjs(today).subtract(n - 1, 'day').format('YYYY-MM-DD'), to: today });
/** The server and the Excel export refuse periods longer than a year. */
export const rangeTooLong = (from: string, to: string): boolean => dayjs(to).diff(dayjs(from), 'day') > 365;

/** Thins a daily series to at most `n` buckets (sum or average); each bucket keeps its first date as label. */
export function bucketSeries(values: number[], labels: string[], n: number, mode: 'sum' | 'avg'): { values: number[]; labels: string[] } {
  if (values.length <= n || n < 1) return { values, labels };
  const size = values.length / n;
  const outV: number[] = [];
  const outL: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * size);
    const b = Math.max(a + 1, Math.floor((i + 1) * size));
    const part = values.slice(a, b);
    const sum = part.reduce((s, x) => s + x, 0);
    outV.push(mode === 'sum' ? sum : sum / part.length);
    outL.push(labels[a] ?? '');
  }
  return { values: outV, labels: outL };
}
/** Round-number top for a count axis (1, 2, 5, 10, 20, 50 ...). */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}
/** Segment widths (percent of `max`) of a stacked bar; zero parts stay zero. */
export const stackPercents = (parts: number[], max: number): number[] => (max <= 0 ? parts.map(() => 0) : parts.map((v) => (v > 0 ? Math.max(1, (v / max) * 100) : 0)));
/** Top rows of a ranking (web shows the first 12 procedures). */
export const topRows = <T,>(rows: T[], n: number): T[] => rows.slice(0, n);
export type ProcRoomUsage = { name: string; done: number; planned: number; missed: number; percent: number };
/** Reads the loosely typed `procedures.rooms` rows of the analytics payload. */
export function procRoomUsage(rows: unknown[] | null | undefined): ProcRoomUsage[] {
  return (rows ?? []).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return { name: String(o.name ?? ''), done: Number(o.done ?? 0), planned: Number(o.planned ?? 0), missed: Number(o.missed ?? 0), percent: Number(o.utilization_percent ?? 0) };
  });
}

// ── Diet ──
export const NO_DIET = '-';
type DietGuestLike = { guest: { full_name: string }; diet: { id: number } | null };
/** Kitchen day list filtered by guest name and by diet (`NO_DIET` = guests without a diet). */
export function filterDietGuests<T extends DietGuestLike>(guests: T[], search: string, diet: string | null): T[] {
  const q = search.trim().toLowerCase();
  return guests.filter((g) => (!q || g.guest.full_name.toLowerCase().includes(q)) && (diet == null || (diet === NO_DIET ? !g.diet : String(g.diet?.id) === diet)));
}
/** Room number of a diet-day row: the server sends a string, older builds an object. */
export const dietRoomNumber = (room: string | { number?: string } | null | undefined): string | null => (typeof room === 'string' ? room : room?.number ?? null);
/** Diet codes present in a counts payload, the «no diet» column last. */
export function dietCodes(days: { by_diet: Record<string, number> }[]): string[] {
  const set = new Set<string>();
  for (const d of days) Object.keys(d.by_diet).forEach((c) => set.add(c));
  return [...set].sort((a, b) => (a === NO_DIET ? 1 : b === NO_DIET ? -1 : a.localeCompare(b)));
}
export const DIET_COUNT_DAYS = [7, 14, 30] as const;

/** Registrar, or the doctor the stay is assigned to, may change the stay's diet and allergies. */
export function canEditStayDiet(
  user: User | null | undefined,
  me: { staff_id: number | null } | null | undefined,
  stay: { doctor?: { id: number } | null } | null | undefined,
): boolean {
  if (!user || user.sanatorium_read_only === true) return false;
  if (hasSanRole(user, 'registrar')) return true;
  return hasSanRole(user, 'doctor') && me?.staff_id != null && stay?.doctor?.id === me.staff_id;
}

// ── Procedure schedule ──
/** Sessions of a procedure still to place (at least 1, so the form is never empty). */
export const remainingSessions = (p: { sessions_total: number; sessions_done: number }): number => Math.max(1, p.sessions_total - p.sessions_done);
/** Start of the form: the procedure's own start date when it is in the future, otherwise today. */
export const scheduleStart = (p: { start_date?: string | null }, today: string): string => (p.start_date && p.start_date > today ? p.start_date : today);
export type ScheduleDraft = { roomId: number | null; start: string | null; time: string; count: string };
export function scheduleBody(d: ScheduleDraft, remaining: number, today: string): Built<Record<string, unknown>> {
  if (!d.roomId) return fail('sanatorium.s2.pickProcRoom');
  if (d.start && d.start < today) return fail('sanCatalog.sched.startPast');
  if (d.time.trim() && !isHhmm(d.time)) return fail('sanatorium.s2.hoursInvalid');
  const n = d.count.trim() ? parseIntIn(d.count, 1, remaining) : null;
  if (d.count.trim() && n == null) return fail('sanCatalog.sched.countRange');
  return {
    ok: true,
    body: { room_id: d.roomId, ...(d.start ? { start_date: d.start } : {}), ...(d.time.trim() ? { preferred_time: d.time.trim() } : {}), ...(n ? { sessions: n } : {}) },
  };
}
/** Body of a session move: the room is sent only when the user picked another one («no change» = null). */
export const moveBody = (startsAt: string, roomId: number | null): Record<string, unknown> => ({ starts_at: startsAt, ...(roomId ? { room_id: roomId } : {}) });
/** Share of a room's slots in use (0..1). */
export const slotUsage = (capacity: number, free: number): number => (capacity > 0 ? Math.min(1, Math.max(0, (capacity - free) / capacity)) : 0);

// ── Services catalog / orders ──
export type ServiceFilter = { q: string; category: string | null; active: boolean | null };
type ServiceLike = { name_uz: string; name_ru?: string | null; name_en?: string | null; category: string | null; is_active: boolean };
export function filterServices<T extends ServiceLike>(list: T[], f: ServiceFilter): T[] {
  const q = f.q.trim().toLowerCase();
  return list.filter(
    (s) =>
      (!q || [s.name_uz, s.name_ru, s.name_en].some((n) => n?.toLowerCase().includes(q))) &&
      (!f.category || s.category === f.category) &&
      (f.active == null || f.active === s.is_active),
  );
}
export const serviceCategories = (list: { category: string | null }[]): string[] => [...new Set(list.map((s) => s.category).filter((c): c is string => !!c))].sort();
export const serviceFilterOn = (f: ServiceFilter): boolean => !!f.q.trim() || !!f.category || f.active != null;
/** New order quantity: whole number 1..1000 (server limit). */
export const orderQuantity = (text: string): number | null => parseIntIn(text, 1, 1000);
/** A slot's label: time + free / capacity. */
export const slotCaption = (s: { free: number; capacity: number }): string => `${s.free}/${s.capacity}`;
export const isPastDay = (day: string, today: string): boolean => day < today;

// ── Seasons / organizations / packages ──
export type SeasonLike = { scope: string };
export const filterSeasons = <T extends SeasonLike>(list: T[], scope: string | null): T[] => (scope ? list.filter((r) => r.scope === scope) : list);
/** Text of what a season rule applies to; `lookup` maps an id (rooms / packages) to a label. */
export function seasonScopeText(r: { scope: string; scope_values: string[] }, lookup: (id: string) => string): string {
  if (r.scope === 'room_type') return r.scope_values.join(', ');
  if (r.scope === 'rooms' || r.scope === 'packages') return r.scope_values.map(lookup).join(', ');
  return '';
}
export const filterOrgs = <T extends { is_active: boolean }>(list: T[], active: boolean | null): T[] => (active == null ? list : list.filter((o) => o.is_active === active));
/** First `n` rows plus how many were cut («+N more»). */
export function limitRows<T>(rows: T[], n: number): { shown: T[]; more: number } {
  return { shown: rows.slice(0, n), more: Math.max(0, rows.length - n) };
}
