// Pure helpers of the sanatorium "sections" screens (packages, seasons, services, organizations,
// procedure rooms, diets, quote, analytics): validation + request bodies, reorder maths, chart scaling.
// Every body builder returns `{ ok: true, body }` or `{ ok: false, error }` (an i18n key) so the
// forms never send a request the strict server schema would reject.

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
