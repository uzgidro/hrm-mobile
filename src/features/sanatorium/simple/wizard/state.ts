// State of the arrival wizard and its translation into the `POST /arrivals` body (pure functions, the same
// rules as web v2 `simple/state.ts`).
import dayjs from 'dayjs';
import type { FamilyRelation, GuestLite, GuestType, SanRequest, StayFull } from '../../types';
import { PASSPORT_RE, PHONE_RE, normalizePhoneInput } from '../../utils/guests';
import type { ArrivalBody, ArrivalMember, ArrivalOptions, OptionDoctor, Prefill } from '../types';
import { newClientRef } from '../utils';

export type StepKey = 'who' | 'room' | 'doctor' | 'meals' | 'review';

export interface WizMember {
  key: string;
  /** Existing guest, or null for a new person. */
  guest_id: number | null;
  /** Booking this person already has (opened from an existing stay). */
  stay_id?: number;
  full_name: string;
  birth_date: string;
  age?: number | null;
  gender: '' | 'm' | 'f';
  passport: string;
  phone: string;
  organization_name: string;
  relation: FamilyRelation | '';
  family_id?: number | null;
  is_child?: boolean;
  /** Room of the booking (a family may be spread over several). */
  room_number?: string | null;
  /** Shown as a ready card instead of inputs (known guest, requester, booked guest). */
  locked: boolean;
}

export interface WizState {
  source: 'walkin' | 'request' | 'stay';
  requestId?: number;
  members: WizMember[];
  guestType: GuestType;
  contractNote: string;
  /** A booking as it was opened: only what differs from it is sent, so a family keeps its own rooms and dates. */
  base?: { start: string; end: string; guestType: GuestType; roomId: number | null; packageId: string; organizationId: string; doctorId: number | null; nurseId: string };
  /** What members already had on file: cleared values are erased separately. */
  had?: { diet: boolean; dietNote: boolean; allergies: string[] };
  start: string;
  end: string;
  /** undefined = take the suggestion, null = decide the room later. */
  roomId: number | null | undefined;
  /** undefined = follow the rule of the guest type. */
  wantDoctor: boolean | undefined;
  doctorId: number | undefined;
  /** Chosen time per person: undefined = suggestion, '' = no visit for this person. */
  examAt: Record<string, string | undefined>;
  nurseId: string | undefined;
  withMeals: boolean;
  /** Meals or diet were changed here: a booked family keeps each person's own diet otherwise. */
  mealsTouched: boolean;
  dietId: string | undefined;
  dietNote: string;
  /** Member key → what the person cannot eat or take. */
  allergies: Record<string, string>;
  packageId: string;
  organizationId: string;
  note: string;
  payment: string;
  /** One per run of the wizard, the same on every retry: a lost answer cannot settle the guest twice. */
  clientRef: string;
  /** The booked period was already over, so the wizard starts from today. */
  renewed?: boolean;
}

/** Nights offered when nobody told us how long the guest stays. */
export const DEFAULT_NIGHTS = 10;
export const iso = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
export const plusDays = (d: string, n: number) => iso(dayjs(d).add(n, 'day'));
export const nightsOf = (a: string, b: string) => (a && b ? Math.max(0, dayjs(b).diff(dayjs(a), 'day')) : 0);

/** The single rule for the first guest type: what the guest asked for, otherwise treatment. */
export const defaultGuestType = (t?: GuestType | null): GuestType => t ?? 'treatment';

const RELATION_SET = ['head', 'spouse', 'child', 'other'];
export const relationValue = (r?: string | null): FamilyRelation | '' => (r && RELATION_SET.includes(r) ? (r as FamilyRelation) : '');
const genderOf = (g?: string | null): '' | 'm' | 'f' => (g === 'm' || g === 'f' ? g : '');

let seq = 0;
export const newMember = (patch: Partial<WizMember> = {}): WizMember => ({
  key: `m${++seq}`,
  guest_id: null,
  full_name: '',
  birth_date: '',
  gender: '',
  passport: '',
  phone: '',
  organization_name: '',
  relation: '',
  locked: false,
  ...patch,
});

export function memberFromGuest(g: GuestLite, patch: Partial<WizMember> = {}): WizMember {
  return newMember({
    guest_id: g.id,
    full_name: g.full_name,
    birth_date: g.birth_date ?? '',
    age: g.age,
    gender: genderOf(g.gender),
    passport: g.passport ?? '',
    phone: g.phone ?? '',
    organization_name: g.organization_name ?? '',
    family_id: g.family_id ?? null,
    locked: true,
    ...patch,
  });
}

export const emptyState = (today: string): WizState => ({
  source: 'walkin',
  members: [newMember()],
  guestType: defaultGuestType(),
  contractNote: '',
  start: today,
  end: plusDays(today, DEFAULT_NIGHTS),
  roomId: undefined,
  wantDoctor: undefined,
  doctorId: undefined,
  examAt: {},
  nurseId: undefined,
  withMeals: true,
  mealsTouched: false,
  dietId: undefined,
  dietNote: '',
  allergies: {},
  packageId: '',
  organizationId: '',
  note: '',
  payment: '',
  clientRef: newClientRef(),
});

/** A request or a booking opened in the wizard: everything the server already knows is filled in. */
export function stateFromPrefill(p: Prefill, today: string): WizState {
  const base = emptyState(today);
  const isStay = p.source === 'stay';
  // Someone who comes later than the request said settles from today; a booking keeps its own dates.
  // A booking whose whole period has passed is renewed from today for the same number of nights.
  const renewed = isStay && !!p.start && !!p.end && p.end <= today;
  const start = p.start && !renewed && (isStay || p.start > today) ? p.start : today;
  const end = p.end && p.end > start && p.end > today ? p.end : plusDays(start, renewed ? Math.max(1, nightsOf(p.start!, p.end!)) : DEFAULT_NIGHTS);
  const members = p.members.map((m) =>
    newMember({
      guest_id: m.guest_id ?? null,
      stay_id: m.stay_id ?? undefined,
      full_name: m.full_name,
      birth_date: m.birth_date ?? '',
      gender: genderOf(m.gender),
      passport: m.passport ?? '',
      phone: m.phone ?? '',
      organization_name: m.organization_name ?? '',
      relation: relationValue(m.relation),
      is_child: m.is_child,
      room_number: m.room_number,
      locked: true,
    }),
  );
  const allergies: Record<string, string> = {};
  p.members.forEach((m, i) => {
    if (m.allergies) allergies[members[i].key] = m.allergies;
  });
  const diet = p.members.find((m) => m.diet_id || m.diet_note);
  return {
    ...base,
    source: p.source,
    requestId: p.request_id ?? undefined,
    guestType: defaultGuestType(p.guest_type),
    start,
    end,
    // A booking keeps its own rooms (see `derive`), a request starts from the wished one.
    renewed,
    roomId: isStay ? undefined : (p.room_id ?? undefined),
    doctorId: p.doctor_staff_id ?? undefined,
    wantDoctor: isStay && p.doctor_staff_id ? true : undefined,
    nurseId: p.nurse_staff_id ? String(p.nurse_staff_id) : undefined,
    withMeals: p.with_meals,
    dietId: diet?.diet_id ? String(diet.diet_id) : isStay && diet ? '' : undefined,
    dietNote: diet?.diet_note ?? '',
    allergies,
    packageId: p.package_id ? String(p.package_id) : '',
    organizationId: p.organization_id ? String(p.organization_id) : '',
    note: p.note ?? '',
    members: members.length ? members : base.members,
    base:
      isStay && p.start && p.end && p.guest_type
        ? {
            start: p.start,
            end: p.end,
            guestType: p.guest_type,
            roomId: p.room_id,
            packageId: p.package_id ? String(p.package_id) : '',
            organizationId: p.organization_id ? String(p.organization_id) : '',
            doctorId: p.doctor_staff_id,
            nurseId: p.nurse_staff_id ? String(p.nurse_staff_id) : '',
          }
        : undefined,
    had: { diet: p.members.some((m) => m.diet_id), dietNote: p.members.some((m) => m.diet_note), allergies: Object.keys(allergies) },
  };
}

export function ageOf(m: WizMember, on: string): number | null {
  if (m.birth_date) return dayjs(on).diff(dayjs(m.birth_date), 'year');
  return m.age ?? null;
}
/** One rule everywhere: a child is someone whose age is not above the limit. */
export const isChild = (m: WizMember, on: string, limit: number) => {
  const a = ageOf(m, on);
  return a !== null ? a <= limit : m.is_child === true;
};

/** Relation shown until the receptionist picks one: first person = head, then by age. */
export function relationOf(m: WizMember, i: number, all: WizMember[], on: string, limit: number): FamilyRelation {
  if (m.relation) return m.relation;
  if (i === 0) return 'head';
  if (isChild(m, on, limit)) return 'child';
  const firstAdult = all.findIndex((x, k) => k > 0 && !isChild(x, on, limit));
  return firstAdult === i ? 'spouse' : 'other';
}

export interface MemberErrors {
  full_name?: string;
  birth_date?: string;
  passport?: string;
  phone?: string;
}
/** Messages are i18n keys of `san3.who`. Only the name and the birth date block the next step. */
export function memberErrors(m: WizMember): MemberErrors {
  if (m.locked) return {};
  const e: MemberErrors = {};
  if (m.full_name.trim().length < 5) e.full_name = 'nameShort';
  if (!m.birth_date) e.birth_date = 'birthMissing';
  if (m.passport && !PASSPORT_RE.test(m.passport)) e.passport = 'passportBad';
  if (m.phone && !PHONE_RE.test(m.phone)) e.phone = 'phoneBad';
  return e;
}

export interface Derived {
  roomId: number | null;
  /** Booked people stay in the rooms they were booked into. */
  keepsRooms: boolean;
  /** The booked room is not free any more. */
  lostRoom: boolean;
  doctorNeeded: boolean;
  doctor: OptionDoctor | null;
  nurseId: string;
  dietId: string;
  /** key → ISO time for everyone who visits the doctor. */
  exams: Record<string, string>;
}

/** Fills everything the receptionist did not touch with the server's suggestions. */
export function derive(s: WizState, o: ArrivalOptions | undefined, limit: number): Derived {
  const doctorNeeded = s.wantDoctor ?? !!o?.exam_required;
  const doctor = doctorNeeded
    ? (o?.doctors.find((d) => d.staff_id === (s.doctorId ?? o.suggested_doctor_id)) ??
      o?.doctors.find((d) => d.staff_id === o.suggested_doctor_id) ??
      (s.wantDoctor ? o?.doctors[0] : undefined) ??
      null)
    : null;
  let roomId: number | null = null;
  const booked = !!s.base && (s.roomId === undefined || (s.roomId !== null && s.roomId === s.base.roomId));
  const keepsRooms = booked && (o ? !!o.rooms_assigned : s.base!.roomId !== null);
  const lostRoom = booked && !!o && !keepsRooms && (s.base!.roomId !== null || s.members.some((m) => m.room_number));
  if (keepsRooms) roomId = s.base!.roomId;
  else if (s.roomId !== null) {
    const wanted = s.roomId === undefined ? undefined : o?.rooms.find((r) => r.id === s.roomId);
    if (s.roomId !== undefined && (!o || wanted?.fits)) roomId = s.roomId;
    else roomId = s.roomId === undefined ? (o?.suggested_room_id ?? null) : null;
  }
  const exams: Record<string, string> = {};
  if (doctor && !o?.has_exam) {
    const pool = [...(doctor.staff_id === o?.suggested_doctor_id && o?.suggested_exam_at ? [o.suggested_exam_at] : []), ...doctor.next_slots];
    const taken = new Set(Object.values(s.examAt).filter(Boolean) as string[]);
    for (const m of s.members) {
      const chosen = s.examAt[m.key];
      if (chosen === '') continue;
      if (chosen) {
        exams[m.key] = chosen;
        continue;
      }
      // A booking of someone who needs no visit must not get one by itself.
      if (s.source === 'stay' && !o?.exam_required) continue;
      if (isChild(m, s.start, limit)) continue; // children only when the receptionist asks for it
      const free = pool.find((x) => !taken.has(x));
      if (free) {
        exams[m.key] = free;
        taken.add(free);
      }
    }
  }
  return {
    roomId,
    keepsRooms,
    lostRoom,
    doctorNeeded,
    doctor,
    exams,
    nurseId: s.nurseId ?? (doctorNeeded && o?.suggested_nurse_id ? String(o.suggested_nurse_id) : ''),
    dietId: s.dietId ?? (o?.default_diet_id ? String(o.default_diet_id) : ''),
  };
}

const n = (v: string) => (v ? Number(v) : null);
const str = (v: string) => v.trim() || null;

export interface BodyCtx {
  checkIn: boolean;
  childLimit: number;
  /** The diet section is on: diet types and allergies may be sent. */
  diet: boolean;
  documents: boolean;
  packages: boolean;
}

export function buildBody(s: WizState, d: Derived, ctx: BodyCtx): ArrivalBody {
  const many = s.members.length > 1;
  const members: ArrivalMember[] = s.members.map((m, i) => {
    const extra: ArrivalMember = {
      ...(many && s.source !== 'stay' ? { relation: relationOf(m, i, s.members, s.start, ctx.childLimit) } : {}),
      ...(ctx.diet && s.allergies[m.key]?.trim() ? { allergies: s.allergies[m.key].trim() } : {}),
    };
    if (m.guest_id && !(s.source === 'request' && i === 0)) return { guest_id: m.guest_id, ...extra };
    return {
      full_name: m.full_name.trim(),
      birth_date: m.birth_date || null,
      passport: m.passport || null,
      phone: m.phone || null,
      ...(m.gender ? { gender: m.gender } : {}),
      ...(m.organization_name.trim() ? { organization_name: m.organization_name.trim() } : {}),
      ...extra,
    };
  });
  const visits = d.doctor ? s.members.map((m, index) => ({ index, at: d.exams[m.key], doctor_staff_id: d.doctor!.staff_id })).filter((x) => !!x.at) : [];
  const diet = { ...(ctx.diet ? { diet_id: n(d.dietId) } : {}), diet_note: str(s.dietNote) };
  const doctorId = d.doctor?.staff_id ?? null;
  const body: ArrivalBody = {
    check_in: ctx.checkIn,
    note: str(s.note),
    client_ref: s.clientRef,
    ...(Number(s.payment) > 0 ? { payment: { amount: s.payment } } : {}),
  };
  const b = s.base;
  if (b) {
    // A booking keeps everything that is not sent.
    if (s.renewed || s.start !== b.start || s.end !== b.end) Object.assign(body, { start: s.start, end: s.end });
    if (s.guestType !== b.guestType) body.guest_type = s.guestType;
    if (d.roomId && d.roomId !== b.roomId) body.room_id = d.roomId;
    if (doctorId !== b.doctorId) body.doctor_staff_id = doctorId;
    if (d.nurseId !== b.nurseId) body.nurse_staff_id = n(d.nurseId);
    if (ctx.packages && s.packageId !== b.packageId) body.package_id = n(s.packageId);
    if (ctx.documents && s.organizationId !== b.organizationId) body.organization_id = n(s.organizationId);
    if (s.contractNote.trim()) body.contract_note = str(s.contractNote);
    if (s.mealsTouched) Object.assign(body, { with_meals: s.withMeals, ...(s.withMeals ? { diet } : {}) });
  } else {
    Object.assign(body, {
      start: s.start,
      end: s.end,
      guest_type: s.guestType,
      room_id: d.roomId,
      doctor_staff_id: doctorId,
      nurse_staff_id: n(d.nurseId),
      ...(ctx.packages ? { package_id: n(s.packageId) } : {}),
      ...(ctx.documents ? { organization_id: n(s.organizationId) } : {}),
      contract_note: s.guestType === 'contract' ? str(s.contractNote) : null,
      with_meals: s.withMeals,
      ...(s.withMeals ? { diet } : {}),
    } satisfies Partial<ArrivalBody>);
  }
  if (visits.length) body.member_exams = visits;
  if (s.source === 'stay') {
    body.stay_ids = s.members.map((m) => m.stay_id!).filter(Boolean);
    // Echo of the booked guests: only needed to carry a person's allergies.
    if (members.some((m) => m.allergies)) body.members = members;
  } else {
    if (s.source === 'request') body.request_id = s.requestId;
    body.members = members;
  }
  return body;
}

/**
 * The arrival never erases what a person has on file, so a diet or an allergy the receptionist removed is cleared
 * on the stay afterwards. Index = member, null = nothing to clear.
 */
export function clearedHealth(s: WizState, d: Derived, dietOn: boolean): (Record<string, null> | null)[] {
  return s.members.map((m) => {
    const out: Record<string, null> = {};
    if (s.source === 'stay' && s.mealsTouched && s.withMeals) {
      if (dietOn && s.had?.diet && !d.dietId) out.diet_id = null;
      if (s.had?.dietNote && !s.dietNote.trim()) out.diet_note = null;
    }
    if (dietOn && s.had?.allergies.includes(m.key) && !s.allergies[m.key]?.trim()) out.allergies = null;
    return Object.keys(out).length ? out : null;
  });
}

/** Which step fixes an error the server answered with. */
export function stepForError(code: string | null): StepKey | null {
  if (!code) return null;
  if (
    /^(room_|invalid_room|party_too_large|capacity)/.test(code) ||
    ['invalid_period', 'period_required', 'too_early', 'cannot_move_start_after_checkin', 'extend_first', 'package_not_allowed', 'period_shorter_than_package'].includes(code)
  )
    return 'room';
  if (/^(doctor_|invalid_doctor|invalid_nurse|invalid_specialty|invalid_exam)/.test(code) || ['outside_stay', 'in_the_past', 'slot_taken', 'slot_in_past'].includes(code)) return 'doctor';
  if (['invalid_diet'].includes(code)) return 'meals';
  if (/passport|member|guest|identity|family|birth|person/.test(code)) return 'who';
  return null;
}

// ── Answers without `prefill` (an in-between server): the same object built from the request / the stays ──
export const prefillFromRequest = (r: SanRequest): Prefill => ({
  source: 'request',
  request_id: r.id,
  stay_ids: [],
  group_key: null,
  start: r.referral_from,
  end: r.referral_to,
  guest_type: r.guest_type,
  party_size: r.party_size ?? null,
  room_id: r.preferred_room?.id ?? null,
  package_id: r.package_id ?? null,
  organization_id: null,
  with_meals: true,
  doctor_staff_id: null,
  nurse_staff_id: null,
  note: r.note,
  existing_guest_id: r.existing_guest_id ?? null,
  existing_guest_matches: r.existing_guest_matches ?? null,
  members: [
    {
      stay_id: null,
      guest_id: null,
      full_name: r.full_name,
      birth_date: r.birth_date,
      phone: r.phone ? normalizePhoneInput(r.phone) : null,
      passport: r.passport,
      organization_name: r.organization_name,
    },
  ],
});

export function prefillFromStays(stays: StayFull[]): Prefill | null {
  const f = stays[0];
  if (!f) return null;
  return {
    source: 'stay',
    request_id: null,
    stay_ids: stays.map((s) => s.id),
    group_key: f.group_key ?? null,
    start: f.planned_from,
    end: f.planned_to,
    guest_type: f.guest_type,
    party_size: stays.length,
    room_id: f.room?.id ?? null,
    package_id: f.package_id ?? null,
    organization_id: f.organization_id ?? null,
    with_meals: f.with_meals,
    doctor_staff_id: f.doctor?.id ?? null,
    nurse_staff_id: f.nurse?.id ?? null,
    note: f.note ?? null,
    members: stays.map((s) => ({
      stay_id: s.id,
      guest_id: s.guest?.id ?? null,
      full_name: s.guest?.full_name ?? '',
      birth_date: s.guest?.birth_date ?? null,
      phone: s.guest?.phone ?? null,
      diet_id: s.diet_id ?? null,
      diet_note: s.diet_note,
      room_id: s.room?.id ?? null,
      room_number: s.room?.number ?? null,
    })),
  };
}

/** What was typed in the search box of «Bugun» lands in the field it belongs to. */
export function typedPerson(text: string): Partial<WizMember> {
  const v = text.trim();
  if (/^[A-Za-z]{2}\d+$/.test(v)) return { passport: v.toUpperCase().slice(0, 9) };
  if (/^[+\d\s()-]+$/.test(v)) {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 9 ? { phone: `+998${digits.slice(-9)}` } : {};
  }
  return v ? { full_name: v } : {};
}

/** The only steps that exist for this guest (the doctor step appears when it is needed or asked for). */
export function wizardSteps(s: WizState | null, o: ArrivalOptions | undefined, mealsOn: boolean): StepKey[] {
  const list: StepKey[] = ['who', 'room'];
  if (o?.exam_required || s?.wantDoctor !== undefined) list.push('doctor');
  if (mealsOn) list.push('meals');
  list.push('review');
  return list;
}

/** Where a freshly opened booking starts: complete → review, dates or room to decide → room, else the first step. */
export function startStep(s: WizState, o: ArrivalOptions | undefined): StepKey {
  if (s.source !== 'stay' || !o) return 'who';
  if (!s.renewed && o.rooms_assigned && (!o.exam_required || o.has_exam || o.suggested_doctor_id)) return 'review';
  if (s.renewed || !o.rooms_assigned) return 'room';
  return 'who';
}

/** Server warnings that make sense on the step being shown. */
export function stepWarnings(warnings: string[], step: StepKey, ctx: { start: string; today: string; housekeeping: boolean; doctorNeeded: boolean }): string[] {
  return warnings.filter((w) => {
    if (w === 'identity_mismatch' || w === 'duplicate_request' || w === 'guest_has_stay') return step === 'who' || step === 'review';
    if (w === 'start_in_past') return (step === 'room' || step === 'review') && ctx.start < ctx.today;
    if (w === 'no_ready_room') return step === 'room' && ctx.housekeeping;
    if (w === 'no_slot') return step === 'doctor' && ctx.doctorNeeded;
    return false; // the empty room and doctor lists explain themselves
  });
}

/** Body of `POST /quote` that estimates what the party pays. */
export const estimateBody = (s: WizState, d: Derived, limit: number) => ({
  start: s.start,
  end: s.end,
  room_id: d.roomId,
  package_id: s.packageId ? Number(s.packageId) : null,
  guest_type: s.guestType,
  services: [],
  adults: s.members.filter((m) => !isChild(m, s.start, limit)).length,
  children: s.members.filter((m) => isChild(m, s.start, limit)).map((m) => ageOf(m, s.start) ?? 0),
});
