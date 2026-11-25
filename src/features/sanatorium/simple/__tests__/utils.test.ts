import {
  isCompleteArrival, draftFromPrefill, actionRoute, applySuggestions, buildArrivalBody, canCheckInNow, dmyToIso, draftFromRequest, draftFromStays, examDefault, filterQueue,
  groupQueue, isMissingEndpoint, itemStayIds, moneyString, newDraft, nextStepFor, normalizeSlots, parseIds, queueActions, routeSheetText,
  setupRoute, splitAction, validateStep, validateVisitSettings, visibleSteps, newClientRef, dedupeDebt, rejectsClientRef,
} from '../utils';
import { SECTION_GROUPS, visibleGroups } from '../sectionGroups';
import { sanErrorMessage } from '../../utils/sanatorium';
import { SECTIONS2_LINKS } from '../../components/sections2/Sections2Links';
import type { ArrivalOptions, QueueItem, RouteSheet } from '../types';

const item = (o: Partial<QueueItem>): QueueItem => ({
  key: 'k', kind: 'arrival_today', urgency: 'today', guest: { id: 1, full_name: 'Aliyev Vali', phone: '+998 90 123 45 67' }, stay_id: 5, request_id: null,
  room: { id: 2, number: '204' }, action: 'arrive', ...o,
});
const opts = (o: Partial<ArrivalOptions> = {}): ArrivalOptions => ({
  rooms: [], suggested_room_id: 7, doctors: [{ staff_id: 3, full_name: 'Dr A' }], suggested_doctor_id: 3, suggested_exam_at: '2026-11-26T10:20:00',
  nurses: [], suggested_nurse_id: null, diets: [], default_diet_id: 4, packages: [], exam_required: true, warnings: [], ...o,
});

describe('queue helpers', () => {
  it('splits «arrive|no_show» and adds the natural second action', () => {
    expect(splitAction('arrive|no_show')).toEqual({ primary: 'arrive', secondary: 'no_show' });
    expect(splitAction('check_out')).toEqual({ primary: 'check_out', secondary: null });
    expect(queueActions(item({ kind: 'arrival_overdue', action: 'arrive' })).secondary).toBe('no_show');
    expect(queueActions(item({ kind: 'overstay', action: 'extend' })).secondary).toBe('check_out');
    expect(queueActions(item({ action: 'check_out', alt_action: 'extend' })).secondary).toBe('extend');
    expect(queueActions(item({ kind: 'arrival_overdue', action: 'no_show', alt_action: null })).secondary).toBeNull();
    expect(queueActions(item({ action: 'arrive' })).secondary).toBeNull();
  });
  it('groups by urgency in fixed order and drops empty groups', () => {
    const g = groupQueue([item({ key: 'a', urgency: 'soon' }), item({ key: 'b', urgency: 'overdue' }), item({ key: 'c', urgency: 'soon' })]);
    expect(g.map((x) => [x.urgency, x.items.length])).toEqual([['overdue', 1], ['soon', 2]]);
  });
  it('searches by name, group member, room and phone digits', () => {
    const items = [item({ key: 'a' }), item({ key: 'b', guest: { id: 2, full_name: 'Karimova Nodira', phone: null }, room: null, members: [{ stay_id: 9, guest_id: 3, full_name: 'Bobur Karimov', room_number: '12' }] })];
    expect(filterQueue(items, 'aliyev').map((i) => i.key)).toEqual(['a']);
    expect(filterQueue(items, 'bobur').map((i) => i.key)).toEqual(['b']);
    expect(filterQueue(items, '204').map((i) => i.key)).toEqual(['a']);
    expect(filterQueue(items, '90 123').map((i) => i.key)).toEqual(['a']);
    expect(filterQueue(items, '  ')).toHaveLength(2);
  });
  it('routes main buttons: wizard for accept / arrive, lists for the rest, null for in-place actions', () => {
    expect(actionRoute(item({ request_id: 8, kind: 'request_new', action: 'accept', stay_id: null }), 'accept')).toEqual({ pathname: '/sanatorium-arrive', params: { request: '8' } });
    expect(actionRoute(item({ missing: ['doctor'], members: [{ stay_id: 5, guest_id: 1, full_name: 'a' }, { stay_id: 6, guest_id: 2, full_name: 'b' }] }), 'arrive')).toEqual({ pathname: '/sanatorium-arrive', params: { stay: '5,6' } });
    // nothing missing: no wizard, the card arrives the whole family in one tap
    expect(actionRoute(item({ missing: [] }), 'arrive')).toBeNull();
    expect(isCompleteArrival(item({ missing: [] }))).toBe(true);
    expect(isCompleteArrival(item({ missing: ['room'] }))).toBe(false);
    expect(actionRoute(item({}), 'confirm_transfer')).toEqual({ pathname: '/sanatorium-transfers' });
    expect(actionRoute(item({}), 'check_out')).toBeNull();
    expect(itemStayIds(item({ stay_id: null }))).toEqual([]);
  });
  it('recognises an endpoint that is simply missing', () => {
    expect(isMissingEndpoint({ response: { status: 404, data: { detail: 'Not Found' } } })).toBe(true);
    expect(isMissingEndpoint({ response: { status: 404, data: { detail: { code: 'feature_disabled' } } } })).toBe(false);
    expect(isMissingEndpoint({ response: { status: 500 } })).toBe(false);
  });
});

describe('wizard helpers', () => {
  it('fills only the unset suggestions', () => {
    const d = applySuggestions(newDraft({ roomId: 99 }), opts());
    expect(d.roomId).toBe(99);
    expect(d.doctorId).toBe(3);
    expect(d.examAt).toBe('2026-11-26T10:20:00');
    expect(d.dietId).toBe(4);
  });
  it('wants an exam only for a treatment guest the server marks as required', () => {
    expect(examDefault('treatment', opts())).toBe(true);
    expect(examDefault('rest', opts())).toBe(false);
    expect(examDefault('treatment', opts({ exam_required: false }))).toBe(false);
  });
  it('skips the doctor step when there is nobody to offer and the meal step when both parts are off', () => {
    expect(visibleSteps({ options: opts(), doctorsOn: true, mealsOn: true, dietOn: true })).toEqual(['who', 'room', 'doctor', 'meal', 'review']);
    expect(visibleSteps({ options: opts({ doctors: [], nurses: [] }), doctorsOn: true, mealsOn: false, dietOn: false })).toEqual(['who', 'room', 'review']);
  });
  it('validates steps with machine codes', () => {
    expect(validateStep('who', newDraft())).toBe('name');
    expect(validateStep('who', newDraft({ members: [{ name: 'Aliyev Vali', birth: '31.02.2000', phone: '', passport: '' }] }))).toBe('birth');
    expect(validateStep('who', newDraft({ members: [{ name: 'Aliyev Vali', birth: '14.03.1985', phone: '', passport: '' }] }))).toBeNull();
    expect(validateStep('room', newDraft({ start: '2026-11-26', end: '2026-11-26' }))).toBe('period');
    expect(validateStep('review', newDraft({ payment: 'abc' }))).toBe('payment');
  });
  it('parses dates and money', () => {
    expect(dmyToIso('14.03.1985')).toBe('1985-03-14');
    expect(dmyToIso('31.02.2000')).toBeNull();
    expect(moneyString('1 500,5')).toBe('1500.50');
    expect(moneyString('0')).toBeNull();
  });
  it('checks in now only with a room and an arrival that is not in the future', () => {
    expect(canCheckInNow(newDraft({ roomId: 1, start: '2026-11-25' }), '2026-11-25')).toBe(true);
    expect(canCheckInNow(newDraft({ roomId: 1, start: '2026-11-26' }), '2026-11-25')).toBe(false);
    expect(canCheckInNow(newDraft({ roomId: null, start: '2026-11-25' }), '2026-11-25')).toBe(false);
  });
  it('builds a walk-in body with exactly one source and no empty optionals', () => {
    const d = newDraft({
      members: [{ name: ' Aliyev Vali ', birth: '14.03.1985', phone: '', passport: 'aa1234567' }],
      start: '2026-11-25', end: '2026-12-05', roomId: 7, needExam: true, doctorId: 3, examAt: '2026-11-26T10:20:00', dietId: 4, payment: '100000',
    });
    const b = buildArrivalBody(d, true);
    expect(b).toEqual({
      members: [{ full_name: 'Aliyev Vali', birth_date: '1985-03-14', passport: 'AA1234567' }],
      start: '2026-11-25', end: '2026-12-05', guest_type: 'treatment', room_id: 7, with_meals: true,
      doctor_staff_id: 3, exam: { doctor_staff_id: 3, at: '2026-11-26T10:20:00' }, diet: { diet_id: 4 }, payment: { amount: '100000.00' }, check_in: true,
    });
    expect(b.request_id).toBeUndefined();
    expect(b.stay_ids).toBeUndefined();
  });
  it('uses request_id (and extra members only when there are several) or stay_ids as the source', () => {
    const r = draftFromRequest({ id: 12, full_name: 'Karimova Nodira', phone: '+998901234567', referral_from: '2026-11-20', referral_to: '2026-12-01', guest_type: 'rest', preferred_room: { id: 4 } }, '2026-11-25');
    expect(r.start).toBe('2026-11-25');
    expect(r.roomId).toBe(4);
    const rb = buildArrivalBody(r, false);
    expect(rb.request_id).toBe(12);
    expect(rb.members).toBeUndefined();
    expect(rb.check_in).toBe(false);
    expect(rb.exam).toBeNull();
    const s = draftFromStays([{ id: 3, guest: { id: 9, full_name: 'X Y' }, guest_type: 'treatment', planned_from: '2026-11-24', planned_to: '2026-12-02', room: { id: 5 }, with_meals: false }], '2026-11-25');
    const sb = buildArrivalBody(s, true);
    expect(sb.stay_ids).toEqual([3]);
    expect(sb.members).toBeUndefined();
    expect(sb.with_meals).toBe(false);
    expect(sb.start).toBe('2026-11-25');
    expect(parseIds('1,2,x,3')).toEqual([1, 2, 3]);
  });
});

describe('route sheet and next step', () => {
  const sheet: RouteSheet = {
    guest: { full_name: 'Aliyev Vali', login_code: 'ABC123' },
    period: { from: '2026-11-25', to: '2026-12-05', nights: 10 },
    steps: [
      { key: 'reception', done: true, title_uz: 'Qabulxona', title_ru: 'Приёмная', text_uz: 'Hujjat', place: 'A blok' },
      { key: 'doctor', done: false, title_uz: 'Shifokor', title_ru: 'Врач', at: '2026-11-26T10:20:00', person: 'Dr A' },
    ],
    contacts: '+998 71 000 00 00',
  };
  it('writes plain share text in the guest language with fresh credentials', () => {
    const labels = { loginCode: 'Login', password: 'Parol', period: 'Muddat' };
    const text = routeSheetText(sheet, 'ru', labels, [{ guest_id: 1, full_name: 'Aliyev Vali', login_code: 'ABC123', password: 'pw' }]);
    expect(text).toContain('1. Приёмная: Hujjat, A blok');
    expect(text).toContain('2. Врач: 26.11 10:20, Dr A');
    expect(text).toContain('Login ABC123, Parol pw');
    expect(routeSheetText(sheet, 'uz', labels)).toContain('Login: ABC123');
    // null = the sheet's own language (what the guest gets)
    expect(routeSheetText({ ...sheet, steps: [{ key: 'room', done: true, title: 'Komnata', text: 'x' }] }, null, labels)).toContain('1. Komnata: x');
  });
  const base = { status: 'checked_in' as const, room: { id: 1, number: '1' }, planned_from: '2026-11-20', planned_to: '2026-12-05' };
  it('suggests one next step', () => {
    expect(nextStepFor({ ...base, status: 'booked', room: null }, null, '2026-11-25').kind).toBe('choose_room');
    expect(nextStepFor({ ...base, status: 'booked' }, null, '2026-11-25').kind).toBe('check_in');
    expect(nextStepFor({ ...base, status: 'booked', planned_from: '2026-11-30' }, null, '2026-11-25').kind).toBe('none');
    expect(nextStepFor(base, sheet, '2026-11-25').kind).toBe('book_exam');
    expect(nextStepFor({ ...base, planned_to: '2026-11-25' }, null, '2026-11-25').kind).toBe('check_out');
    expect(nextStepFor(base, null, '2026-11-25').kind).toBe('none');
  });
});

describe('settings, slots, setup, sections', () => {
  it('validates the visit settings form', () => {
    const ok = { from: '09:00', to: '17:00', slot: '20', meals: ['08:00', '13:00', '19:00'], checkin: '12:00', checkout: '10:00' };
    expect(validateVisitSettings(ok)).toBeNull();
    expect(validateVisitSettings({ ...ok, to: '08:00' })).toBe('hours');
    expect(validateVisitSettings({ ...ok, slot: '2' })).toBe('slot');
    expect(validateVisitSettings({ ...ok, slot: '241' })).toBe('slot');
    expect(validateVisitSettings({ ...ok, meals: ['8', '13:00', '19:00'] })).toBe('meal_time');
    expect(validateVisitSettings({ ...ok, meals: ['08:00-09:00', '13:00-14:00', '18:30-19:30'] })).toBeNull();
    expect(validateVisitSettings({ ...ok, meals: ['09:00-08:00', '13:00', '19:00'] })).toBe('meal_time');
    expect(validateVisitSettings({ ...ok, checkout: '25:00' })).toBe('checkin');
  });
  it('accepts slots as an array or an object and drops junk', () => {
    expect(normalizeSlots(['2026-11-26T10:00:00', 'nope'])).toEqual(['2026-11-26T10:00:00']);
    expect(normalizeSlots({ slots: [{ at: '2026-11-26T11:00:00' }] })).toEqual(['2026-11-26T11:00:00']);
    expect(normalizeSlots(null)).toEqual([]);
  });
  it('maps a setup item to a screen and falls back to settings', () => {
    expect(setupRoute({ key: 'rooms' })).toBe('/sanatorium-rooms');
    expect(setupRoute({ key: 'something_new' })).toBe('/sanatorium-settings');
  });
  it('keeps every old flat link reachable in the four groups', () => {
    const routes = SECTION_GROUPS.flatMap((g) => g.links.map((l) => l.route));
    for (const r of ['/sanatorium-requests', '/sanatorium-guests', '/sanatorium-bookings', '/sanatorium-rooms', '/sanatorium-settings', '/sanatorium-stays', '/sanatorium-journey', '/sanatorium-waitlist', '/sanatorium-transfers', '/sanatorium-housekeeping', '/sanatorium-info', '/sanatorium-broadcasts', '/sanatorium-location', '/sanatorium-territory']) {
      expect(routes).toContain(r);
    }
    for (const l of SECTIONS2_LINKS.filter((x) => x.roles.includes('registrar'))) expect(routes).toContain(l.route);
  });
  it('hides switched-off sections and other roles\' links', () => {
    const groups = visibleGroups((...r) => r.includes('registrar'), (k) => k !== 'waitlist');
    const routes = groups.flatMap((g) => g.links.map((l) => l.route));
    expect(routes).not.toContain('/sanatorium-waitlist');
    expect(routes).toContain('/sanatorium-requests');
    expect(visibleGroups(() => false, () => true)).toEqual([]);
  });
});

describe('error texts', () => {
  const err = (code: string, params: Record<string, unknown> = {}) => ({ response: { status: 409, data: { detail: { code, params } } } });
  it('names the guest when the server sends params.name, plain text otherwise', () => {
    expect(sanErrorMessage(err('guest_has_stay', { name: 'Aliyev Vali' }))).toContain('Aliyev Vali');
    expect(sanErrorMessage(err('guest_has_stay'))).toBe("Mehmonda shu davrda boshqa yashash bor");
  });
  it('translates every new simplification code', () => {
    for (const code of ['one_source_required', 'period_required', 'guest_type_required', 'member_required', 'member_not_in_stays', 'stays_not_one_group', 'stay_not_booked', 'invalid_exam_member', 'not_later', 'same_room', 'invalid_move_date', 'not_no_show', 'debt_exists', 'not_your_guest', 'conflict', 'invalid_nurse', 'duplicate_member', 'invalid_guest_type', 'invalid_lang']) {
      expect(sanErrorMessage(err(code), 'FALLBACK')).not.toBe('FALLBACK');
    }
  });
});

describe('prefill', () => {
  it('loads every member of a booked group with the group dates, room, doctor and diet', () => {
    const d = draftFromPrefill({
      source: 'stay', request_id: null, stay_ids: [3, 4, 5], group_key: 'g1', start: '2026-11-24', end: '2026-12-02', guest_type: 'treatment', party_size: 3,
      room_id: 8, package_id: null, organization_id: null, with_meals: false, doctor_staff_id: 3, nurse_staff_id: null, note: 'n',
      members: [
        { stay_id: 3, guest_id: 11, full_name: 'Father', birth_date: '1980-01-02', diet_id: 4, allergies: 'nuts' },
        { stay_id: 4, guest_id: 12, full_name: 'Mother' },
        { stay_id: 5, guest_id: 13, full_name: 'Child', is_child: true },
      ],
    }, '2026-11-25');
    expect(d.stayIds).toEqual([3, 4, 5]);
    expect(d.members.map((m) => m.name)).toEqual(['Father', 'Mother', 'Child']);
    expect(d.start).toBe('2026-11-25');
    expect(d).toMatchObject({ roomId: 8, doctorId: 3, needExam: true, dietId: 4, allergies: 'nuts', withMeals: false, requestId: null });
    expect(buildArrivalBody(d, true).stay_ids).toEqual([3, 4, 5]);
  });
  it('a request prefill keeps request_id as the only source', () => {
    const d = draftFromPrefill({ source: 'request', request_id: 12, stay_ids: [], start: '2026-11-26', end: '2026-12-01', guest_type: 'rest', members: [{ full_name: 'Karimova Nodira' }] } as never, '2026-11-25');
    const b = buildArrivalBody(d, false);
    expect(b.request_id).toBe(12);
    expect(b.stay_ids).toBeUndefined();
  });
});

describe('idempotency and duplicates', () => {
  it('newClientRef is a uuid even without crypto.randomUUID', () => {
    const g = globalThis as { crypto?: unknown };
    const saved = g.crypto;
    g.crypto = undefined;
    try {
      const a = newClientRef();
      expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(newClientRef()).not.toBe(a);
    } finally {
      g.crypto = saved;
    }
  });

  it('buildArrivalBody sends client_ref and leaves room_id out when rooms are kept', () => {
    const d = newDraft({ stayIds: [1, 2], roomId: 7 });
    expect(buildArrivalBody(d, true, 'ref-1', false)).toMatchObject({ client_ref: 'ref-1', room_id: 7 });
    expect(buildArrivalBody(d, true, 'ref-1', true)).not.toHaveProperty('room_id');
    expect(buildArrivalBody(d, true)).not.toHaveProperty('client_ref');
  });

  it('canCheckInNow accepts kept rooms without a room id', () => {
    const d = newDraft({ stayIds: [1] });
    expect(canCheckInNow(d, d.start)).toBe(false);
    expect(canCheckInNow(d, d.start, true)).toBe(true);
  });

  it('dedupeDebt drops the debt card of a stay that already shows its debt', () => {
    const base = { urgency: 'today', guest: null, request_id: null, room: null, action: 'x' } as const;
    const out = dedupeDebt([
      { ...base, key: 'a', kind: 'departure_today', stay_id: 5, debt: '100.00' },
      { ...base, key: 'b', kind: 'debt', stay_id: 5, debt: '100.00' },
      { ...base, key: 'c', kind: 'debt', stay_id: 6, debt: '50.00' },
    ]);
    expect(out.map((i) => i.key)).toEqual(['a', 'c']);
  });

  it('rejectsClientRef recognises a strict-body 422 that names the field', () => {
    const e = { response: { status: 422, data: { detail: [{ loc: ['body', 'client_ref'], type: 'extra_forbidden' }] } } };
    expect(rejectsClientRef(e)).toBe(true);
    expect(rejectsClientRef({ response: { status: 422, data: { detail: 'other' } } })).toBe(false);
  });
});
