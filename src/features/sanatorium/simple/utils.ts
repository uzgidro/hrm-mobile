// Pure helpers of the simplified registrar flow: queue grouping / search, the wizard draft and its
// request body, route-sheet text, next step, settings validation. No React, no network.
import dayjs from 'dayjs';
import type { GuestType, StayFull } from '../types';
import { sanErrorInfo } from '../utils/sanatorium';
import type {
  ArrivalBody, ArrivalMember, ArrivalOptions, NewCredential, QueueItem, QueueUrgency, RouteSheet, RouteStep, SetupItem,
} from './types';

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
  return URGENCY_ORDER.map((urgency) => ({ urgency, items: items.filter((i) => i.urgency === urgency) })).filter((g) => g.items.length > 0);
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
  procedure_rooms: '/sanatorium-settings', bot_token: '/sanatorium-settings',
};
export const setupRoute = (item: Pick<SetupItem, 'key'>): string => SETUP_ROUTES[item.key] ?? '/sanatorium-settings';
export const setupRequiredLeft = (items: SetupItem[]) => items.filter((i) => !i.ok && i.severity === 'required').length;

// ── Wizard ──
export type WizardStep = 'who' | 'room' | 'doctor' | 'meal' | 'review';
export const WIZARD_STEPS: WizardStep[] = ['who', 'room', 'doctor', 'meal', 'review'];

export type MemberDraft = {
  guestId?: number;
  name: string;
  birth: string; // dd.mm.yyyy as typed
  phone: string;
  passport: string;
  relation?: string;
};
export type WizardDraft = {
  requestId: number | null;
  stayIds: number[];
  members: MemberDraft[];
  start: string;
  end: string;
  guestType: GuestType;
  roomId: number | null;
  withMeals: boolean;
  packageId: number | null;
  needExam: boolean;
  doctorId: number | null;
  nurseId: number | null;
  examAt: string | null;
  dietId: number | null;
  dietNote: string;
  allergies: string;
  payment: string;
  note: string;
};

export const emptyMember = (): MemberDraft => ({ name: '', birth: '', phone: '', passport: '' });

export function newDraft(over: Partial<WizardDraft> = {}): WizardDraft {
  const start = dayjs().format('YYYY-MM-DD');
  return {
    requestId: null, stayIds: [], members: [emptyMember()], start, end: dayjs(start).add(10, 'day').format('YYYY-MM-DD'),
    guestType: 'treatment', roomId: null, withMeals: true, packageId: null, needExam: false, doctorId: null, nurseId: null,
    examAt: null, dietId: null, dietNote: '', allergies: '', payment: '', note: '', ...over,
  };
}

/** Which steps the registrar actually sees: parts that are switched off or have nothing to offer are skipped. */
export function visibleSteps(opts: { options?: ArrivalOptions | null; doctorsOn: boolean; mealsOn: boolean; dietOn: boolean }): WizardStep[] {
  const steps: WizardStep[] = ['who', 'room'];
  const o = opts.options;
  if (opts.doctorsOn && (!o || o.doctors.length > 0 || o.nurses.length > 0)) steps.push('doctor');
  if (opts.mealsOn || opts.dietOn) steps.push('meal');
  steps.push('review');
  return steps;
}

/** Fill the unset suggestions from the server (never overrides what the registrar already chose). */
export function applySuggestions(d: WizardDraft, o: ArrivalOptions): WizardDraft {
  const next = { ...d };
  if (next.roomId == null && o.suggested_room_id != null) next.roomId = o.suggested_room_id;
  if (next.doctorId == null && o.suggested_doctor_id != null) next.doctorId = o.suggested_doctor_id;
  if (next.nurseId == null && o.suggested_nurse_id != null) next.nurseId = o.suggested_nurse_id;
  if (next.examAt == null && o.suggested_exam_at) next.examAt = o.suggested_exam_at;
  if (next.dietId == null && o.default_diet_id != null) next.dietId = o.default_diet_id;
  return next;
}

/** Exam is expected only for a treatment guest with the server's «exam required» flag. */
export const examDefault = (guestType: GuestType, o: ArrivalOptions | null | undefined): boolean => !!o?.exam_required && guestType === 'treatment';

/** `14.03.1985` -> `1985-03-14` (null when not a real date). */
export function dmyToIso(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[./,-](\d{1,2})[./,-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  const d = dayjs(iso);
  return d.isValid() && d.format('YYYY-MM-DD') === iso ? iso : null;
}

export const moneyString = (v: string): string | null => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
};

/** Machine code of the first problem on a step, or null (the screen translates `sanSimple.val.<code>`). */
export function validateStep(step: WizardStep, d: WizardDraft): string | null {
  if (step === 'who') {
    const first = d.members[0];
    const fromSource = d.requestId != null || d.stayIds.length > 0;
    if (!fromSource && (!first || (!first.guestId && first.name.trim().length < 5))) return 'name';
    for (const m of d.members) {
      if (m.birth.trim() && !dmyToIso(m.birth)) return 'birth';
      if (!fromSource && !m.guestId && m.name.trim().length < 5) return 'name';
    }
  }
  if (step === 'room' && !dayjs(d.end).isAfter(dayjs(d.start))) return 'period';
  if (step === 'review' && d.payment.trim() && !moneyString(d.payment)) return 'payment';
  return null;
}

/** «Joylashtirish» (check in now) needs a room and an arrival that is not in the future. */
export const canCheckInNow = (d: WizardDraft, today: string): boolean => d.roomId != null && !dayjs(d.start).isAfter(dayjs(today));

function memberBody(m: MemberDraft): ArrivalMember {
  if (m.guestId) return { guest_id: m.guestId, ...(m.relation ? { relation: m.relation } : {}) };
  return {
    full_name: m.name.trim(),
    ...(dmyToIso(m.birth) ? { birth_date: dmyToIso(m.birth)! } : {}),
    ...(m.phone.trim() ? { phone: m.phone.trim() } : {}),
    ...(m.passport.trim() ? { passport: m.passport.trim().toUpperCase() } : {}),
    ...(m.relation ? { relation: m.relation } : {}),
  };
}

/** Strict body of POST /arrivals: exactly one source, empty optionals dropped. */
export function buildArrivalBody(d: WizardDraft, checkIn: boolean): ArrivalBody {
  const source: Partial<ArrivalBody> =
    d.requestId != null
      ? { request_id: d.requestId, ...(d.members.length > 1 ? { members: d.members.map(memberBody) } : {}) }
      : d.stayIds.length > 0
        ? { stay_ids: d.stayIds }
        : { members: d.members.map(memberBody) };
  const money = moneyString(d.payment);
  const diet = { ...(d.dietId ? { diet_id: d.dietId } : {}), ...(d.dietNote.trim() ? { diet_note: d.dietNote.trim() } : {}) };
  return {
    ...source,
    start: d.start,
    end: d.end,
    guest_type: d.guestType,
    ...(d.roomId ? { room_id: d.roomId } : {}),
    with_meals: d.withMeals,
    ...(d.packageId ? { package_id: d.packageId } : {}),
    ...(d.needExam && d.doctorId ? { doctor_staff_id: d.doctorId } : {}),
    ...(d.nurseId ? { nurse_staff_id: d.nurseId } : {}),
    exam: d.needExam && d.examAt ? { ...(d.doctorId ? { doctor_staff_id: d.doctorId } : {}), at: d.examAt } : null,
    ...(Object.keys(diet).length ? { diet } : {}),
    ...(d.allergies.trim() ? { allergies: d.allergies.trim() } : {}),
    ...(money ? { payment: { amount: money } } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
    check_in: checkIn,
  };
}

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

/** Plain text of the route sheet for the OS share sheet (the app has no print module). */
export function routeSheetText(
  sheet: RouteSheet,
  lang: Lang | null,
  labels: { loginCode: string; password: string; period: string },
  creds: NewCredential[] = [],
): string {
  const out: string[] = [];
  if (sheet.guest?.full_name) out.push(sheet.guest.full_name);
  if (sheet.period) out.push(`${labels.period}: ${dayjs(sheet.period.from).format('DD.MM.YYYY')} - ${dayjs(sheet.period.to).format('DD.MM.YYYY')}`);
  sheet.steps.forEach((s, i) => {
    const bits = [stepText(s, lang), s.place, s.at ? dayjs(s.at).format('DD.MM HH:mm') : null, s.person].filter(Boolean);
    out.push(`${i + 1}. ${stepTitle(s, lang)}${bits.length ? `: ${bits.join(', ')}` : ''}`);
  });
  if (sheet.contacts) out.push(sheet.contacts);
  const code = sheet.guest?.login_code;
  if (code && creds.length === 0) out.push(`${labels.loginCode}: ${code}`);
  for (const c of creds) out.push(`${c.full_name}: ${labels.loginCode} ${c.login_code}, ${labels.password} ${c.password}`);
  return out.join('\n');
}

// ── Next step of a stay ──
export type NextStep = { kind: 'check_in' | 'choose_room' | 'book_exam' | 'diet' | 'check_out' | 'none'; stepKey?: string };
/** One suggested action for the stay drawer, from the route sheet when the server has it, else from the stay itself. */
export function nextStepFor(stay: Pick<StayFull, 'status' | 'room' | 'planned_from' | 'planned_to'>, sheet: RouteSheet | null | undefined, today: string): NextStep {
  if (stay.status === 'booked') {
    if (!stay.room) return { kind: 'choose_room' };
    return dayjs(stay.planned_from).isAfter(dayjs(today)) ? { kind: 'none' } : { kind: 'check_in' };
  }
  if (stay.status !== 'checked_in') return { kind: 'none' };
  const open = sheet?.steps.find((s) => !s.done && s.key !== 'procedures');
  if (open?.key === 'room') return { kind: 'choose_room', stepKey: open.key };
  if (open?.key === 'doctor') return { kind: 'book_exam', stepKey: open.key };
  if (open?.key === 'kitchen') return { kind: 'diet', stepKey: open.key };
  if (open?.key === 'departure' || !dayjs(stay.planned_to).isAfter(dayjs(today))) return { kind: 'check_out', stepKey: open?.key };
  return { kind: 'none' };
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
    case 'convert':
      return { pathname: '/sanatorium-waitlist' };
    case 'confirm_service':
      return { pathname: '/sanatorium-services' };
    case 'confirm_transfer':
      return { pathname: '/sanatorium-transfers' };
    default:
      return null;
  }
}
/** `?stay=1,2` -> ids (garbage dropped). */
export const parseIds = (v: string | undefined): number[] => (v ?? '').split(',').map((s) => Number.parseInt(s, 10)).filter((n) => Number.isFinite(n) && n > 0);

// ── Prefill from a request / booked stays ──
type RequestLike = {
  id: number; full_name: string; birth_date?: string | null; passport?: string | null; phone?: string | null;
  referral_from?: string | null; referral_to?: string | null; guest_type?: GuestType | null; party_size?: number | null;
  package_id?: number | null; preferred_room?: { id: number } | null; existing_guest_id?: number | null;
};
const isoToDmy = (iso?: string | null) => (iso ? dayjs(iso).format('DD.MM.YYYY') : '');

export function draftFromRequest(r: RequestLike, today: string): WizardDraft {
  const start = r.referral_from && !dayjs(r.referral_from).isBefore(dayjs(today)) ? r.referral_from : today;
  const end = r.referral_to && dayjs(r.referral_to).isAfter(dayjs(start)) ? r.referral_to : dayjs(start).add(10, 'day').format('YYYY-MM-DD');
  return newDraft({
    requestId: r.id,
    members: [{ guestId: undefined, name: r.full_name, birth: isoToDmy(r.birth_date), phone: r.phone ?? '', passport: r.passport ?? '' }],
    start, end,
    guestType: r.guest_type ?? 'treatment',
    roomId: r.preferred_room?.id ?? null,
    packageId: r.package_id ?? null,
  });
}

type StayLike = {
  id: number; guest: { id: number; full_name: string; phone?: string | null } | null; guest_type: GuestType;
  planned_from: string; planned_to: string; room: { id: number } | null; with_meals: boolean; diet_note?: string | null; package_id?: number | null;
};
/** Booked stays about to arrive: dates, room and meals come from the booking. */
export function draftFromStays(stays: StayLike[], today: string): WizardDraft {
  const f = stays[0];
  return newDraft({
    stayIds: stays.map((s) => s.id),
    members: stays.length ? stays.map((s) => ({ guestId: s.guest?.id, name: s.guest?.full_name ?? '', birth: '', phone: s.guest?.phone ?? '', passport: '' })) : [emptyMember()],
    start: f && dayjs(f.planned_from).isAfter(dayjs(today)) ? f.planned_from : today,
    end: f?.planned_to ?? dayjs(today).add(10, 'day').format('YYYY-MM-DD'),
    guestType: f?.guest_type ?? 'treatment',
    roomId: f?.room?.id ?? null,
    withMeals: f?.with_meals ?? true,
    dietNote: f?.diet_note ?? '',
    packageId: f?.package_id ?? null,
  });
}

/** Number of people the room must hold: the declared party of a request, else the listed members. */
export const partySize = (d: Pick<WizardDraft, 'members' | 'stayIds'>, declared?: number | null): number =>
  Math.min(20, Math.max(d.stayIds.length || d.members.length, declared ?? 1, 1));

/** `"2026-11-26T10:20:00"` -> `26.11 10:20` */
export const slotLabel = (iso: string) => dayjs(iso).format('DD.MM HH:mm');
