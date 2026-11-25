import type { ArrivalOptions, Prefill } from '../../types';
import {
  buildBody, clearedHealth, derive, emptyState, memberErrors, memberFromGuest, newMember, prefillFromRequest, prefillFromStays, relationOf, startStep, stateFromPrefill, stepForError,
  stepWarnings, typedPerson, wizardSteps, type WizState,
} from '../state';
import { maskDmy } from '../StepWho';
import { placeOnly } from '../StepRoom';

const T = '2026-11-25';
const ctx = { checkIn: true, childLimit: 14, diet: true, documents: true, packages: true };
const opts = (over: Partial<ArrivalOptions> = {}): ArrivalOptions => ({
  rooms: [{ id: 7, number: '101', capacity: 2, free_beds: 2, fits: true, ready: true }], suggested_room_id: 7,
  doctors: [{ staff_id: 3, full_name: 'Dr', specialty_id: 1, next_slots: ['2026-11-26T09:00:00', '2026-11-26T09:20:00', '2026-11-26T09:40:00'] }],
  suggested_doctor_id: 3, suggested_exam_at: '2026-11-26T09:00:00', nurses: [], suggested_nurse_id: 5, diets: [], default_diet_id: 4, packages: [], exam_required: true, warnings: [], ...over,
});
const walkin = (members = [newMember({ full_name: 'Aliyev Vali', birth_date: '1980-01-01', phone: '+998901234567' })]): WizState => ({ ...emptyState(T), members });
const stayPrefill = (over: Partial<Prefill> = {}): Prefill => ({
  source: 'stay', request_id: null, stay_ids: [5, 6], group_key: 'g', start: T, end: '2026-11-30', guest_type: 'treatment', party_size: 2, room_id: 7, package_id: null, organization_id: null,
  with_meals: true, doctor_staff_id: 3, nurse_staff_id: 5, note: null,
  members: [
    { stay_id: 5, guest_id: 1, full_name: 'Aliyev Vali', diet_id: 4, allergies: 'asal', room_id: 7, room_number: '101' },
    { stay_id: 6, guest_id: 2, full_name: 'Aliyeva Zarina', room_id: 8, room_number: '102' },
  ], ...over,
});

describe('people', () => {
  it('name and birth date are required, passport and phone only when they are wrong', () => {
    expect(memberErrors(newMember())).toEqual({ full_name: 'nameShort', birth_date: 'birthMissing' });
    expect(memberErrors(newMember({ full_name: 'Aliyev Vali', birth_date: '1980-01-01', passport: 'AA1', phone: '+99890' }))).toEqual({ passport: 'passportBad', phone: 'phoneBad' });
    expect(memberErrors(newMember({ locked: true }))).toEqual({});
  });
  it('a known guest is a ready card with the family', () => {
    expect(memberFromGuest({ id: 9, full_name: 'X', family_id: 3, gender: 'f', age: 40 })).toMatchObject({ guest_id: 9, locked: true, family_id: 3, gender: 'f', age: 40 });
  });
  it('relations by default: head, spouse, child', () => {
    const all = [newMember({ birth_date: '1980-01-01' }), newMember({ birth_date: '1982-01-01' }), newMember({ birth_date: '2018-01-01' })];
    expect(all.map((m, i) => relationOf(m, i, all, T, 14))).toEqual(['head', 'spouse', 'child']);
  });
  it('the search text lands in the right field', () => {
    expect(typedPerson('AA12345')).toEqual({ passport: 'AA12345' });
    expect(typedPerson('90 123 45 67')).toEqual({ phone: '+998901234567' });
    expect(typedPerson('Aliyev Vali')).toEqual({ full_name: 'Aliyev Vali' });
    expect(typedPerson('  ')).toEqual({});
  });
  it('dots of a birth date appear while typing and go away while deleting', () => {
    expect(maskDmy('14')).toBe('14.');
    expect(maskDmy('1403', '140')).toBe('14.03.');
    expect(maskDmy('14031985')).toBe('14.03.1985');
    expect(maskDmy('14.0', '14.03')).toBe('14.0');
    expect(maskDmy('14', '14.')).toBe('14');
  });
});

describe('walk-in body', () => {
  it('takes every suggestion and sends one visit per adult', () => {
    const s = walkin([
      newMember({ full_name: 'Aliyev Vali', birth_date: '1980-01-01', phone: '+998901234567' }),
      newMember({ full_name: 'Aliyeva Zarina', birth_date: '1985-01-01' }),
      newMember({ full_name: 'Aliyev Bola', birth_date: '2019-01-01' }),
    ]);
    const d = derive(s, opts(), 14);
    const b = buildBody(s, d, ctx);
    expect(b).toMatchObject({ room_id: 7, doctor_staff_id: 3, nurse_staff_id: 5, guest_type: 'treatment', with_meals: true, diet: { diet_id: 4 }, check_in: true });
    expect(b.member_exams).toEqual([
      { index: 0, at: '2026-11-26T09:00:00', doctor_staff_id: 3 },
      { index: 1, at: '2026-11-26T09:20:00', doctor_staff_id: 3 },
    ]);
    expect(b.members!.map((m) => m.relation)).toEqual(['head', 'spouse', 'child']);
    expect(b.request_id).toBeUndefined();
    expect(b.stay_ids).toBeUndefined();
    expect(b.client_ref).toBe(s.clientRef);
  });
  it('per-member allergies, no visit for a switched-off person, no relation for one guest', () => {
    const s = walkin();
    const k = s.members[0]!.key;
    const s2: WizState = { ...s, allergies: { [k]: ' asal ' }, examAt: { [k]: '' }, payment: '500000' };
    const b = buildBody(s2, derive(s2, opts(), 14), ctx);
    expect(b.members).toEqual([expect.objectContaining({ allergies: 'asal' })]);
    expect(b.members![0]!.relation).toBeUndefined();
    expect(b.member_exams).toBeUndefined();
    expect(b.payment).toEqual({ amount: '500000' });
  });
  it('switched-off sections never send their fields', () => {
    const s = walkin();
    const b = buildBody({ ...s, packageId: '1', organizationId: '2' }, derive(s, opts(), 14), { ...ctx, diet: false, documents: false, packages: false });
    expect(b.diet).toEqual({ diet_note: null });
    expect(b).not.toHaveProperty('package_id');
    expect(b).not.toHaveProperty('organization_id');
  });
  it('a room that no longer fits is dropped', () => {
    const s = { ...walkin(), roomId: 7 };
    expect(derive(s, opts({ rooms: [{ id: 7, number: '101', capacity: 2, free_beds: 0, fits: false }] }), 14).roomId).toBeNull();
  });
});

describe('booking', () => {
  it('keeps everything that was not touched: only stay ids, check-in and the visit go out', () => {
    const s = stateFromPrefill(stayPrefill(), T);
    const o = opts({ rooms_assigned: true, has_exam: true, rooms: [{ id: 7, number: '101', capacity: 2, free_beds: 1, fits: true, own: 1 }, { id: 8, number: '102', capacity: 2, free_beds: 1, fits: true, own: 1 }] });
    const d = derive(s, o, 14);
    expect(d.keepsRooms).toBe(true);
    const b = buildBody(s, d, ctx);
    expect(b.stay_ids).toEqual([5, 6]);
    for (const k of ['start', 'end', 'room_id', 'guest_type', 'doctor_staff_id', 'with_meals', 'diet', 'package_id']) expect(b).not.toHaveProperty(k);
    expect(startStep(s, o)).toBe('review');
  });
  it('an over period starts from today for the same nights', () => {
    const s = stateFromPrefill(stayPrefill({ start: '2026-11-10', end: '2026-11-13' }), T);
    expect(s).toMatchObject({ renewed: true, start: T, end: '2026-11-28' });
    expect(buildBody(s, derive(s, opts(), 14), ctx)).toMatchObject({ start: T, end: '2026-11-28' });
    expect(startStep(s, opts({ rooms_assigned: true }))).toBe('room');
  });
  it('a removed allergy or diet is cleared on the stay afterwards', () => {
    const s0 = stateFromPrefill(stayPrefill(), T);
    const s: WizState = { ...s0, allergies: {}, mealsTouched: true, dietId: '' };
    expect(clearedHealth(s, derive(s, opts({ default_diet_id: null }), 14), true)).toEqual([{ diet_id: null, allergies: null }, { diet_id: null }]);
  });
  it('a lost room is said and replaced', () => {
    const s = stateFromPrefill(stayPrefill(), T);
    expect(derive(s, opts({ rooms_assigned: false }), 14)).toMatchObject({ keepsRooms: false, lostRoom: true, roomId: 7 });
  });
});

describe('request', () => {
  const req = { id: 12, source: 'web', status: 'new' as const, full_name: 'Karimova Nodira', birth_date: '1990-01-01', passport: 'AA1234567', phone: '901234567', organization_name: 'GES', referral_from: '2026-11-20', referral_to: '2026-12-01', guest_type: null, note: null, reject_reason: null, guest_id: null, created_at: null, party_size: 3, preferred_room: { id: 7, number: '101', room_type: null, capacity: 2 } };
  it('an in-between server: the same draft from the request row', () => {
    const p = prefillFromRequest(req);
    expect(p).toMatchObject({ source: 'request', request_id: 12, room_id: 7, party_size: 3 });
    const s = stateFromPrefill(p, T);
    expect(s).toMatchObject({ start: T, end: '2026-12-01', requestId: 12, guestType: 'treatment' });
    expect(buildBody(s, derive(s, opts(), 14), ctx)).toMatchObject({ request_id: 12, members: [expect.objectContaining({ full_name: 'Karimova Nodira', phone: '+998901234567' })] });
  });
  it('stays without prefill', () => {
    expect(prefillFromStays([])).toBeNull();
  });
});

describe('steps and errors', () => {
  it('the doctor step appears when it is needed or asked for', () => {
    expect(wizardSteps(walkin(), opts({ exam_required: false }), true)).toEqual(['who', 'room', 'meals', 'review']);
    expect(wizardSteps({ ...walkin(), wantDoctor: true }, opts({ exam_required: false }), false)).toEqual(['who', 'room', 'doctor', 'review']);
  });
  it('an error leads to the step that fixes it', () => {
    expect(['room_full', 'period_required', 'doctor_busy', 'invalid_diet', 'duplicate_passport', 'conflict', null].map(stepForError)).toEqual(['room', 'room', 'doctor', 'meals', 'who', null, null]);
  });
  it('a warning is shown on its own step only', () => {
    const c = { start: '2026-11-20', today: T, housekeeping: false, doctorNeeded: true };
    expect(stepWarnings(['start_in_past', 'no_ready_room', 'no_slot', 'identity_mismatch', 'no_free_room'], 'room', c)).toEqual(['start_in_past']);
    expect(stepWarnings(['no_slot', 'identity_mismatch'], 'doctor', c)).toEqual(['no_slot']);
    expect(stepWarnings(['no_slot', 'identity_mismatch'], 'review', c)).toEqual(['identity_mismatch']);
  });
  it('the place loses the part that is already in the title', () => {
    expect(placeOnly({ place: 'Asosiy korpus, 1-qavat, 12-nuqta', building: 'Asosiy korpus', floor: 1 })).toBe('12-nuqta');
    expect(placeOnly({ place: 'Asosiy korpus, 1-qavat', building: 'Asosiy korpus', floor: 1 })).toBeNull();
  });
});
