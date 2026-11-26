// Pure helpers of the sanatorium "sections" screens (part 1): switches, reorder maths,
// map / plan coordinates, localized names, status flows.
import type { SanFeatureKey } from './features';
import type { CheckInWarning, FeatureRow, HkKind, HkStatus, HkTaskStatus, SanLocation, TransferStatus } from '../types1';

/** Uzbekistan bounding box the server validates coordinates against. */
export const UZ_BBOX = { latMin: 37.0, latMax: 45.7, lngMin: 55.9, lngMax: 73.2 } as const;

export const inUzbekistan = (lat: number, lng: number): boolean =>
  lat >= UZ_BBOX.latMin && lat <= UZ_BBOX.latMax && lng >= UZ_BBOX.lngMin && lng <= UZ_BBOX.lngMax;

/** Section switches grouped for the settings screen (same groups as the web); unknown keys fall into «other». */
export const FEATURE_GROUPS: { id: string; keys: SanFeatureKey[] }[] = [
  { id: 'existing', keys: ['telegram_bot', 'public_form', 'room_choice', 'kitchen_menu', 'guest_cabinet'] },
  { id: 'content', keys: ['journey', 'location_map', 'territory_map', 'info_sections', 'broadcasts'] },
  { id: 'catalog', keys: ['packages', 'seasonal_pricing', 'paid_services', 'documents'] },
  { id: 'ops', keys: ['waitlist', 'procedure_schedule', 'housekeeping', 'transfer', 'diet', 'feedback', 'analytics'] },
];

export function groupFeatures(rows: FeatureRow[]): { id: string; rows: FeatureRow[] }[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const seen = new Set<string>();
  const out = FEATURE_GROUPS.map((g) => ({
    id: g.id,
    rows: g.keys.flatMap((k) => {
      const r = byKey.get(k);
      if (!r) return [];
      seen.add(k);
      return [r];
    }),
  }));
  const rest = rows.filter((r) => !seen.has(r.key));
  if (rest.length) out.push({ id: 'other', rows: rest });
  return out.filter((g) => g.rows.length > 0);
}

/** Only the switches that differ from the server state (the PATCH body is a diff). */
export function featureDiff(rows: FeatureRow[], draft: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const r of rows) if (r.key in draft && draft[r.key] !== r.enabled) out[r.key] = draft[r.key]!;
  return out;
}

/** Label of a switch in the app language (Russian for ru, Uzbek otherwise). */
export const featureLabel = (r: Pick<FeatureRow, 'label_uz' | 'label_ru'>, lang: string): string =>
  lang === 'ru' ? r.label_ru || r.label_uz : r.label_uz || r.label_ru;

/** uz / ru / en texts → the one for `lang`, falling back to Uzbek. Cyrillic Uzbek shows Uzbek text. */
export function pickLang(lang: string, v: { uz?: string | null; ru?: string | null; en?: string | null }): string {
  const l = lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uz';
  return (v[l] || v.uz || v.ru || v.en || '').trim();
}

/** Ids in the new order after moving `id` by `delta` places (clamped). */
export function moveId(ids: number[], id: number, delta: number): number[] {
  const out = [...ids];
  const from = out.indexOf(id);
  if (from < 0) return out;
  const to = Math.min(out.length - 1, Math.max(0, from + delta));
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x!);
  return out;
}

const clampPct = (v: number) => Math.min(100, Math.max(0, Math.round(v * 100) / 100));

/** A tap at (x, y) inside a w × h image box → percent coordinates (what the server stores). */
export function planPoint(x: number, y: number, w: number, h: number): { x_pct: number; y_pct: number } | null {
  if (!(w > 0) || !(h > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x_pct: clampPct((x / w) * 100), y_pct: clampPct((y / h) * 100) };
}

/** Parses the tileserver viewer fragment `#zoom/lat/lng[/bearing/pitch]`. */
export function parseMapHash(hash: string): { zoom: number; lat: number; lng: number } | null {
  const m = hash.replace(/^#/, '').split('/');
  if (m.length < 3) return null;
  const [zoom, lat, lng] = m.slice(0, 3).map(Number);
  if (![zoom, lat, lng].every((n) => Number.isFinite(n))) return null;
  if (Math.abs(lat!) > 90 || Math.abs(lng!) > 180) return null;
  return { zoom: zoom!, lat: lat!, lng: lng! };
}

/** Number text («41.3, 69.28») with a comma or a dot → number, null when blank or not a number. */
export function parseCoord(text: string): number | null {
  const s = text.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Body for PUT /location: lat and lng go together, both null clears the point. */
export function locationBody(f: { lat: string; lng: string; zoom: string; address: string; uz: string; ru: string; en: string }):
  { ok: true; body: SanLocation } | { ok: false; error: 'pair' | 'range' | 'zoom' } {
  const lat = parseCoord(f.lat);
  const lng = parseCoord(f.lng);
  if ((lat == null) !== (lng == null)) return { ok: false, error: 'pair' };
  if (lat != null && lng != null && !inUzbekistan(lat, lng)) return { ok: false, error: 'range' };
  const zoomN = f.zoom.trim() ? Number.parseInt(f.zoom, 10) : 15;
  if (!Number.isFinite(zoomN) || zoomN < 1 || zoomN > 19) return { ok: false, error: 'zoom' };
  const n = (s: string) => (s.trim() ? s.trim() : null);
  return {
    ok: true,
    body: {
      latitude: lat != null ? Math.round(lat * 1e6) / 1e6 : null,
      longitude: lng != null ? Math.round(lng * 1e6) / 1e6 : null,
      address: n(f.address),
      zoom: zoomN,
      directions_note_uz: n(f.uz),
      directions_note_ru: n(f.ru),
      directions_note_en: n(f.en),
    },
  };
}

/** Statuses a transfer may move to from `status` (done and cancelled are final). */
export function nextTransferStatuses(status: TransferStatus): TransferStatus[] {
  const flow: Record<TransferStatus, TransferStatus[]> = {
    requested: ['confirmed', 'assigned', 'cancelled'],
    confirmed: ['assigned', 'cancelled'],
    assigned: ['done', 'cancelled'],
    done: [],
    cancelled: [],
  };
  return flow[status];
}

/** Statuses a housekeeper may set; `inspected` belongs to the room keeper / registrar. */
export function hkAllowedStatuses(all: readonly HkStatus[], isSupervisor: boolean): HkStatus[] {
  return all.filter((s) => isSupervisor || s !== 'inspected');
}

export const hkTone = (s: HkStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' =>
  ({ clean: 'success', inspected: 'success', dirty: 'danger', cleaning: 'warning', maintenance: 'neutral' } as const)[s];
export const hkTaskTone = (s: HkTaskStatus): 'info' | 'warning' | 'success' => ({ open: 'info', in_progress: 'warning', done: 'success' } as const)[s];

export const HK_KIND_ICON_ORDER: HkKind[] = ['cleaning', 'linen', 'maintenance', 'inspection'];

/** Broadcast progress 0..1 (sent + failed of what was queued). */
export function broadcastProgress(b: { queued_count: number; sent_count: number; failed_count: number; status: string }): number {
  if (b.status === 'done') return 1;
  const total = b.queued_count || 0;
  if (total <= 0) return 0;
  return Math.min(1, (b.sent_count + b.failed_count) / total);
}

/** Query params of the waitlist list: blank search and `all` are dropped. */
export function waitlistParams(f: { status: string; q: string; from?: string | null; to?: string | null }, page: number, size: number): Record<string, unknown> {
  return {
    ...(f.status && f.status !== 'all' ? { status: f.status } : {}),
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    ...(f.from ? { from: f.from } : {}),
    ...(f.to ? { to: f.to } : {}),
    page,
    size,
  };
}

/** Stage key rule of the server: ^[a-z][a-z0-9_]{1,39}$. */
export const isStageKey = (s: string): boolean => /^[a-z][a-z0-9_]{1,39}$/.test(s);

/** «Stage name» → a valid key candidate (latin letters, digits, underscore). */
export function slugKey(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return /^[a-z]/.test(s) ? s : s ? `s_${s}`.slice(0, 40) : '';
}

/** The `room_not_ready` warning the check-in answer may carry (never blocks the check-in). */
export function roomNotReady(res: unknown): CheckInWarning | null {
  const list = (res as { warnings?: CheckInWarning[] } | null | undefined)?.warnings;
  return Array.isArray(list) ? (list.find((w) => w?.code === 'room_not_ready') ?? null) : null;
}

/** `+998901234567`, `998901234567` or 9 national digits -> `+998XXXXXXXXX`; null when it is not a full UZ number. */
export function normalizeUzPhone(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D+/g, '');
  if (d.length === 9) return `+998${d}`;
  if (d.length === 12 && d.startsWith('998')) return `+${d}`;
  return null;
}

/** Floor text of a point of interest: blank = no floor, otherwise a whole number within the server range. */
export function parseFloor(text: string): { ok: true; value: number | null } | { ok: false } {
  const s = text.trim();
  if (!s) return { ok: true, value: null };
  if (!/^-?\d{1,3}$/.test(s)) return { ok: false };
  const n = Number(s);
  return n >= -5 && n <= 100 ? { ok: true, value: n } : { ok: false };
}

/** `assigned` needs a vehicle or a driver name (the server answers driver_required otherwise). */
export const transferNeedsCar = (status: TransferStatus, vehicleId: number | null, driverName: string): boolean =>
  status === 'assigned' && vehicleId == null && !driverName.trim();

/** People of a transfer: a whole number from 1 to 20 (the server limit). */
export const validTransferPeople = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 20;

/** Photo of an info section: the small thumbnail when the server has one, otherwise the original. */
export const photoThumb = (p: { url?: string | null; thumb_url?: string | null } | null | undefined): string | undefined =>
  p ? (p.thumb_url || p.url || undefined) : undefined;

/** A broadcast may be sent only when somebody can receive it. */
export const canSendBroadcast = (reachable: number | undefined): boolean => (reachable ?? 0) > 0;

/** The convert sheet starts from what the waitlist entry already holds. */
export function convertDefaults(w: { birth_date?: string | null; passport?: string | null; organization_name?: string | null }): { birth: string | null; passport: string; org: string } {
  return { birth: w.birth_date ?? null, passport: w.passport ?? '', org: w.organization_name ?? '' };
}

/** Poll interval of the housekeeping board and the journey board (ms). */
export const BOARD_POLL_MS = 60_000;
