// Pure helpers of the simplified registrar flow: queue grouping / search, the wizard draft and its
// request body, route-sheet text, next step, settings validation. No React, no network.
import dayjs from 'dayjs';
import type { GuestType, StayFull } from '../types';
import { sanErrorInfo } from '../utils/sanatorium';
import { SHEET_TEXT, type SheetLang } from './sheetText';
import type { EarlyPreview, NewCredential, QueueItem, QueueUrgency, RouteSheet, RouteStep, SetupItem } from './types';

/** True when the server simply does not know the endpoint yet (old backend): 404/405 without a business code. */
export function isMissingEndpoint(e: unknown): boolean {
  const status = (e as { response?: { status?: number } } | undefined)?.response?.status;
  return (status === 404 || status === 405) && sanErrorInfo(e).code == null;
}

// ── Work queue ──
export const URGENCY_ORDER: QueueUrgency[] = ['overdue', 'today', 'soon'];

/** `"arrive|no_show"` -> main + optional second action. */
export function splitAction(action: string | null | undefined): { primary: string; secondary: string | null } {
  const [primary = '', secondary] = (action ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  const second = secondary ?? null;
  return { primary, secondary: second };
}

/** Second (quiet) action the card may show: the server's pair, else the natural one for the kind. */
export function queueActions(item: QueueItem): { primary: string; secondary: string | null } {
  const { primary, secondary } = splitAction(item.action);
  if (secondary) return { primary, secondary };
  // The server sends the pair as `alt_action`; the natural pairs are the fallback for older answers.
  if (item.alt_action) return { primary, secondary: item.alt_action };
  if (item.alt_action === null) return { primary, secondary: null };
  if (item.kind === 'arrival_overdue' && primary === 'arrive') return { primary, secondary: 'no_show' };
  if (item.kind === 'overstay' && primary === 'extend') return { primary, secondary: 'check_out' };
  if (item.kind === 'overstay' && primary === 'check_out') return { primary, secondary: 'extend' };
  return { primary, secondary: null };
}

export type QueueGroup = { urgency: QueueUrgency; items: QueueItem[] };
/** Server order is kept inside a group; empty groups are dropped. */
export function groupQueue(items: QueueItem[]): QueueGroup[] {
  // A card with an urgency this version does not know is still shown (last group), never lost.
  const known = (i: QueueItem): QueueUrgency => (URGENCY_ORDER.includes(i.urgency) ? i.urgency : 'soon');
  return URGENCY_ORDER.map((urgency) => ({ urgency, items: items.filter((i) => known(i) === urgency) })).filter((g) => g.items.length > 0);
}

const digits = (s: string) => s.replace(/\D/g, '');
/** Name / phone / room number / group member name; blank query keeps everything. */
export function filterQueue(items: QueueItem[], query: string): QueueItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const qd = digits(q);
  return items.filter((i) => {
    const names = [i.guest?.full_name, ...(i.members ?? []).map((m) => m.full_name), ...Object.values(i.title_params ?? {}).filter((v): v is string => typeof v === 'string')];
    if (names.some((n) => n && n.toLowerCase().includes(q))) return true;
    if (i.room?.number && i.room.number.toLowerCase().includes(q)) return true;
    if ((i.members ?? []).some((m) => m.room_number && m.room_number.toLowerCase() === q)) return true;
    return qd.length >= 3 && !!i.guest?.phone && digits(i.guest.phone).includes(qd);
  });
}

export const debtNumber = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
export const hasDebt = (v: string | number | null | undefined) => debtNumber(v) > 0;

export const SETUP_ROUTES: Record<string, string> = {
  rooms: '/sanatorium-rooms', room_prices: '/sanatorium-rooms', doctors: '/sanatorium-settings', doctor_cabinets: '/sanatorium-settings',
  specialties: '/sanatorium-settings', nurse: '/sanatorium-settings', room_keeper: '/sanatorium-settings', kitchen: '/sanatorium-settings',
  housekeeper: '/sanatorium-settings', diets: '/sanatorium-diets', menu_week: '/sanatorium-menu', contacts: '/sanatorium-settings',
  exam_hours: '/sanatorium-settings', location: '/sanatorium-location', territory: '/sanatorium-territory',
  procedure_rooms: '/sanatorium-schedule', bot_token: '/sanatorium-settings',
};
export const setupRoute = (item: Pick<SetupItem, 'key'>): string => SETUP_ROUTES[item.key] ?? '/sanatorium-settings';
export const setupRequiredLeft = (items: SetupItem[]) => items.filter((i) => !i.ok && i.severity === 'required').length;

// ── Money ──
export const moneyString = (v: string): string | null => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
};

// ── Route sheet / share ──
export type Lang = 'uz' | 'ru' | 'en';
/** App language tag -> the language of the server texts (Cyrillic Uzbek falls back to Latin text). */
export const textLang = (appLang: string): Lang => (appLang.startsWith('ru') ? 'ru' : appLang.startsWith('en') ? 'en' : 'uz');
/** `lang` null = the sheet's own language (the guest's), used for the text the guest receives. */
export function stepTitle(s: RouteStep, lang: Lang | null): string {
  const own = lang === 'ru' ? s.title_ru : lang === 'en' ? s.title_en : lang === 'uz' ? s.title_uz : undefined;
  return own || s.title || s.title_uz || s.key;
}
export function stepText(s: RouteStep, lang: Lang | null): string {
  const own = lang === 'ru' ? s.text_ru : lang === 'en' ? s.text_en : lang === 'uz' ? s.text_uz : undefined;
  return own || s.text || s.text_uz || '';
}

/** The sentence of the departure step carries its own date; a finished reception needs none. */
const stepTime = (s: RouteStep) => (s.key === 'departure' || (s.key === 'reception' && s.done) ? null : s.at ?? null);
/** The doctor's sentence only repeats the time of the line above it. */
export const stepSaysMore = (s: RouteStep) => !(s.key === 'doctor' && !!s.at && !s.done);
export function stepPlace(s: RouteStep, lang: Lang): string | null {
  const own = lang === 'ru' ? s.place_ru : lang === 'en' ? s.place_en : s.place_uz;
  return own || s.place || null;
}
/** «time · person · place» of a step; `when` turns the ISO time into words. */
export const stepLine = (s: RouteStep, lang: Lang, when: (iso: string) => string): string => {
  const at = stepTime(s);
  return [at ? when(at) : null, s.person, stepPlace(s, lang)].filter(Boolean).join(' · ');
};

/** Family members whose room or visit differs from the first person's: one line each under that step. */
export function familyLines(first: RouteSheet, others: RouteSheet[], key: string, lang: Lang, when: (iso: string) => string): string[] {
  if (key !== 'doctor' && key !== 'room') return [];
  const mine = first.steps.find((s) => s.key === key);
  const lineOf = (s: RouteStep) => (key === 'room' ? stepText(s, lang) : stepLine(s, lang, when));
  return others.flatMap((o) => {
    const s = o.steps.find((x) => x.key === key);
    if (!s || (key === 'doctor' && !s.at)) return [];
    const line = lineOf(s);
    return line && line !== (mine ? lineOf(mine) : '') ? [`${o.guest?.full_name ?? ''}: ${line}`] : [];
  });
}

const paperTime = (iso: string) => dayjs(iso).format('DD.MM.YYYY HH:mm');
/** Plain text of the route sheet for the OS share sheet, in the guest's language. */
export function routeSheetText(sheet: RouteSheet, lang: SheetLang, opts: { others?: RouteSheet[]; creds?: NewCredential[]; cabinetUrl?: string | null } = {}): string {
  const x = SHEET_TEXT[lang];
  const { others = [], creds = [] } = opts;
  const out: string[] = [`${x.org}. ${x.title}`];
  if (sheet.guest?.full_name) out.push(sheet.guest.full_name);
  const together = (sheet.members ?? []).map((m) => m.full_name);
  if (together.length) out.push(`${x.with}: ${together.join(', ')}`);
  if (sheet.period) {
    out.push([
      `${dayjs(sheet.period.from).format('DD.MM.YYYY')} - ${dayjs(sheet.period.to).format('DD.MM.YYYY')}`, x.nights(sheet.period.nights), sheet.period.checkout_time ? x.outBy(sheet.period.checkout_time) : null,
    ].filter(Boolean).join(' · '));
  }
  sheet.steps.forEach((s, i) => {
    const bits = [stepLine(s, lang, paperTime), stepSaysMore(s) ? stepText(s, lang) : null].filter(Boolean);
    out.push(`${i + 1}. ${stepTitle(s, lang)}${bits.length ? `: ${bits.join('. ')}` : ''}`);
    familyLines(sheet, others, s.key, lang, paperTime).forEach((l) => out.push(`   ${l}`));
  });
  if (creds.length) for (const c of creds) out.push(`${c.full_name}: ${x.id} ${c.login_code}, ${x.password} ${c.password}`);
  else if (sheet.guest?.login_code) out.push(`${x.id}: ${sheet.guest.login_code}`);
  if (opts.cabinetUrl && (creds.length || sheet.guest?.login_code)) out.push(`${x.cabinet}: ${opts.cabinetUrl}`);
  const foot = [sheet.phone && !sheet.contacts?.includes(sheet.phone) ? sheet.phone : null, sheet.contacts].filter(Boolean).join('\n');
  if (foot) out.push(foot);
  return out.join('\n');
}

// ── Next step of a stay ──
export type NextKind = 'expired' | 'late' | 'today' | 'noRoom' | 'waiting' | 'over' | 'leaves' | 'exam' | 'debt' | 'fine' | 'cancelled' | 'goneDebt' | 'gone';
export type NextAction = 'no_show' | 'arrive' | 'choose_room' | 'extend' | 'check_out' | 'assign_doctor' | 'take_payment';
/** `text` is a key of `sanFlow.next`; `action` the one main button (null = nothing to do). */
export type NextStep = { text: NextKind; action: NextAction | null; date?: string; sum?: number };

/** One sentence and one button for the guest's card: the same order as the web. */
export function nextStepFor(stay: Pick<StayFull, 'status' | 'room' | 'planned_from' | 'planned_to' | 'debt'>, today: string, needsExam: boolean): NextStep {
  const booked = stay.status === 'booked';
  const inHouse = stay.status === 'checked_in';
  const debt = debtNumber(stay.debt);
  if (booked && stay.planned_to <= today) return { text: 'expired', action: 'no_show', date: stay.planned_from };
  if (booked && stay.planned_from < today) return { text: 'late', action: 'arrive', date: stay.planned_from };
  if (booked && stay.planned_from === today) return { text: 'today', action: 'arrive' };
  if (booked && !stay.room) return { text: 'noRoom', action: 'choose_room', date: stay.planned_from };
  if (booked) return { text: 'waiting', action: null, date: stay.planned_from };
  if (inHouse && stay.planned_to < today) return { text: 'over', action: 'extend', date: stay.planned_to };
  if (inHouse && stay.planned_to === today) return { text: 'leaves', action: 'check_out' };
  if (inHouse && needsExam) return { text: 'exam', action: 'assign_doctor' };
  if (inHouse && debt > 0 && stay.planned_to <= dayjs(today).add(1, 'day').format('YYYY-MM-DD')) return { text: 'debt', action: 'take_payment', sum: debt };
  if (inHouse) return { text: 'fine', action: null, date: stay.planned_to };
  if (stay.status === 'cancelled') return { text: 'cancelled', action: null };
  return debt > 0 ? { text: 'goneDebt', action: 'take_payment', sum: debt } : { text: 'gone', action: null };
}

// ── Settings S8 ──
export type VisitSettings = {
  exam_hours: string; exam_slot_min: number; exam_weekend: boolean; exam_types: GuestType[];
  meal_times: { breakfast: string; lunch: string; dinner: string }; checkin_time: string; checkout_time: string;
};
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isHm = (s: string) => HM.test(s.trim());
/** A meal time is `HH:MM` or a window `HH:MM-HH:MM`. */
export function isMealTime(s: string): boolean {
  const [a = '', b] = s.trim().split('-').map((x) => x.trim());
  return isHm(a) && (b === undefined || (isHm(b) && a < b));
}
/** `"09:00-17:00"` -> [from, to] */
export const splitHours = (v: string | null | undefined): [string, string] => {
  const [a = '', b = ''] = (v ?? '').split('-').map((s) => s.trim());
  return [a, b];
};
/** First problem code of the visit settings form (`sanSimple.val.<code>`), or null. */
export function validateVisitSettings(s: { from: string; to: string; slot: string; meals: string[]; checkin: string; checkout: string }): string | null {
  if (!isHm(s.from) || !isHm(s.to) || s.from.trim() >= s.to.trim()) return 'hours';
  const n = Number.parseInt(s.slot, 10);
  if (!Number.isFinite(n) || n < 5 || n > 240) return 'slot';
  if (s.meals.some((m) => !isMealTime(m))) return 'meal_time';
  if (!isHm(s.checkin) || !isHm(s.checkout)) return 'checkin';
  return null;
}

/** Slots may come as `["2026-..."]` or `{slots:[...]}`; invalid values are dropped. */
export function normalizeSlots(data: unknown): string[] {
  const list = Array.isArray(data) ? data : (data as { slots?: unknown } | null)?.slots;
  return (Array.isArray(list) ? list : [])
    .map((s) => (typeof s === 'string' ? s : (s as { at?: string; start?: string } | null)?.at ?? (s as { start?: string } | null)?.start))
    .filter((s): s is string => typeof s === 'string' && dayjs(s).isValid());
}

// ── Queue action routing ──
export type ActionRoute = { pathname: string; params?: Record<string, string> };
/** Stay ids a queue card stands for (a group card carries all its members). */
export const itemStayIds = (i: Pick<QueueItem, 'stay_id' | 'members'>): number[] => {
  const ids = (i.members ?? []).map((m) => m.stay_id);
  return ids.length ? ids : i.stay_id != null ? [i.stay_id] : [];
};
/** Where a main button navigates; null = the card handles it in place (sheet / confirm). */
export function actionRoute(item: QueueItem, action: string): ActionRoute | null {
  switch (action) {
    case 'accept':
      return item.request_id != null ? { pathname: '/sanatorium-arrive', params: { request: String(item.request_id) } } : null;
    case 'arrive': {
      const ids = itemStayIds(item);
      return ids.length ? { pathname: '/sanatorium-arrive', params: { stay: ids.join(',') } } : null;
    }
    default:
      return null;
  }
}
/** `?stay=1,2` -> ids (garbage dropped). */
export const parseIds = (v: string | undefined): number[] => (v ?? '').split(',').map((s) => Number.parseInt(s, 10)).filter((n) => Number.isFinite(n) && n > 0);

/** `"2026-11-26T10:20:00"` -> `26.11 10:20` */
export const slotLabel = (iso: string) => dayjs(iso).format('DD.MM HH:mm');

/** Nothing is missing on the card: one tap can arrive the whole family without the wizard. */
export const isCompleteArrival = (item: Pick<QueueItem, 'missing' | 'stay_id' | 'members'>): boolean =>
  (item.missing ?? []).length === 0 && itemStayIds(item).length > 0;

// ── Idempotency, warnings, duplicates ──
/** UUID v4 for `client_ref`; works where `crypto.randomUUID` is missing (Hermes / old browsers). */
export function newClientRef(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** An older server that knows `client_ref` only on some routes rejects it with 422 naming the field. */
export function rejectsClientRef(e: unknown): boolean {
  const r = (e as { response?: { status?: number; data?: unknown } } | undefined)?.response;
  return r?.status === 422 && JSON.stringify(r.data ?? '').includes('client_ref');
}

/** The queue may list a stay twice (departure / overstay card AND a debt card): keep the card that already shows the debt. */
export function dedupeDebt(items: QueueItem[]): QueueItem[] {
  const shown = new Set<number>();
  for (const i of items) if (i.kind !== 'debt' && hasDebt(i.debt)) itemStayIds(i).forEach((id) => shown.add(id));
  return items.filter((i) => i.kind !== 'debt' || !itemStayIds(i).some((id) => shown.has(id)));
}

export type ServerWarning = { code: string; [k: string]: unknown };
/** Warning objects of an action response (strings of older servers become `{code}`). */
export function warningsOf(res: unknown): ServerWarning[] {
  const w = (res as { warnings?: unknown } | null | undefined)?.warnings;
  return (Array.isArray(w) ? w : []).map((x) => (typeof x === 'string' ? { code: x } : x)).filter((x): x is ServerWarning => !!x && typeof (x as { code?: unknown }).code === 'string');
}

/** The same minute, whatever the notation of the two values. */
export const sameTime = (a?: string | null, b?: string | null): boolean => !!a && !!b && dayjs(a).isSame(dayjs(b), 'minute');

// ── The people a short action is about ──
export type Party = { stayId: number; name: string; size: number; stayIds: number[] };
export const partyOfItem = (i: QueueItem): Party => {
  const ids = itemStayIds(i);
  const names = (i.members ?? []).map((m) => m.full_name).filter(Boolean);
  return { stayId: ids[0] ?? 0, name: names.length ? names.join(', ') : i.guest?.full_name ?? '', size: Math.max(1, ids.length), stayIds: ids };
};
export const partyOfStays = (first: Pick<StayFull, 'id' | 'guest'>, mates: Pick<StayFull, 'id' | 'guest'>[]): Party => ({
  stayId: first.id,
  name: [first, ...mates].map((m) => m.guest?.full_name ?? '').filter(Boolean).join(', '),
  size: mates.length + 1,
  stayIds: [first.id, ...mates.map((m) => m.id)],
});

/** Badges of a queue card: what the title already says is not repeated. */
export function shownMissing(item: Pick<QueueItem, 'kind' | 'missing'>): string[] {
  const all = item.missing ?? [];
  if (item.kind === 'arrival_overdue' || item.kind === 'arrival_today') return all;
  if (item.kind === 'no_room') return all.filter((m) => m !== 'room');
  if (item.kind === 'no_exam') return all.filter((m) => m === 'room' || m === 'doctor');
  return [];
}

/** Money to give back: `prepaid` (a closed booking) and `refund` (nights that will not be used), 0 when there are none. */
export const refundOf = (res: unknown): number => warningsOf(res).filter((w) => w.code === 'prepaid' || w.code === 'refund').reduce((n, w) => n + debtNumber(w.amount as string), 0);

/** What the early-leave preview says about the money: to pay, to give back, or nothing; null = unknown (no money line). */
export function moneyLine(p: EarlyPreview | null | undefined): { kind: 'debt' | 'refund' | 'none'; amount: number } | null {
  const sums = p?.totals;
  if (!sums) return null;
  const refund = debtNumber(sums.refund);
  const debt = debtNumber(sums.debt);
  if (refund > 0) return { kind: 'refund', amount: refund };
  return debt > 0 ? { kind: 'debt', amount: debt } : { kind: 'none', amount: 0 };
}
