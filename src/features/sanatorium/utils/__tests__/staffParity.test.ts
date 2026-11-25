import {
  byTime, dashboardTiles, dietLabel, doctorsOfSpecialty, endBeforeStart, externalMayOpen, filterByGuestName, filterStaff, finishBody, finishError,
  flagLocked, foodLine, isExternalDoctorUser, joinWindow, lockExternal, mealTimesBody, mondayOf, phoneIssue, phoneValue, referError, referSpecialties,
  sortSetup, splitDepartures, splitWindow, staffBody, staffError, stepTime, weekdayIndex, windowValid, eventIcon,
} from '../staffParity';
import type { Appointment, StaffMember } from '../../types';

describe('access', () => {
  it('detects an invited doctor and limits the routes', () => {
    expect(isExternalDoctorUser({ external_doctor: { id: 1 } } as never)).toBe(true);
    expect(isExternalDoctorUser({ sanatorium_roles: ['doctor'] } as never)).toBe(false);
    expect(externalMayOpen('/sanatorium-doctor')).toBe(true);
    expect(externalMayOpen('/sanatorium-guests')).toBe(false);
  });
});

describe('weeks', () => {
  it('aligns to Monday', () => {
    expect(mondayOf('2026-11-25')).toBe('2026-11-23'); // Wednesday
    expect(mondayOf('2026-11-23')).toBe('2026-11-23'); // Monday
    expect(mondayOf('2026-11-29')).toBe('2026-11-23'); // Sunday
  });
  it('numbers weekdays from Monday', () => {
    expect(weekdayIndex('2026-11-23')).toBe(0);
    expect(weekdayIndex('2026-11-29')).toBe(6);
  });
});

describe('finish', () => {
  it('needs one non-empty field and caps the length', () => {
    expect(finishError({ complaint: ' ', diagnosis: '', recommendation: '' })).toBe('empty');
    expect(finishError({ complaint: 'a', diagnosis: '', recommendation: '' })).toBeNull();
    expect(finishError({ complaint: 'a'.repeat(4001), diagnosis: '', recommendation: '' })).toBe('too_long');
  });
  it('sends null for empty fields', () => {
    expect(finishBody({ complaint: ' x ', diagnosis: '', recommendation: ' ' })).toEqual({ complaint: 'x', diagnosis: null, recommendation: null });
  });
});

describe('refer', () => {
  const base = { specialtyId: 3, doctorId: null, when: '2026-11-26T10:00:00', duration: '20', note: '' };
  it('validates target and duration 5..240', () => {
    expect(referError(base)).toBeNull();
    expect(referError({ ...base, specialtyId: null })).toBe('target');
    expect(referError({ ...base, duration: '4' })).toBe('duration');
    expect(referError({ ...base, duration: '241' })).toBe('duration');
    expect(referError({ ...base, duration: 'abc' })).toBe('duration');
    expect(referError({ ...base, note: 'x'.repeat(2001) })).toBe('note');
  });
  it('drops procedure specialties and filters doctors', () => {
    expect(referSpecialties([{ kind: 'doctor' }, { kind: 'lab' }, { kind: 'procedure' }]).map((s) => s.kind)).toEqual(['doctor', 'lab']);
    const docs = [{ id: 1, specialty_id: 3 }, { id: 2, specialty_id: 4 }];
    expect(doctorsOfSpecialty(docs, 3).map((d) => d.id)).toEqual([1]);
    expect(doctorsOfSpecialty(docs, null)).toHaveLength(2);
  });
  it('checks the procedure end date', () => {
    expect(endBeforeStart('2026-11-25', '2026-11-24')).toBe(true);
    expect(endBeforeStart('2026-11-25', null)).toBe(false);
  });
});

describe('appointments + diets', () => {
  it('sorts by time', () => {
    const a = { scheduled_at: '2026-11-25T11:00:00' } as Appointment;
    const b = { scheduled_at: '2026-11-25T09:00:00' } as Appointment;
    expect([a, b].sort(byTime)[0]).toBe(b);
  });
  it('localizes the diet name with fallbacks', () => {
    const d = { name_uz: 'Parhez 5', name_ru: 'Стол 5', name_en: null, name: 'Parhez 5', code: '5' };
    expect(dietLabel(d, 'ru')).toBe('Стол 5');
    expect(dietLabel(d, 'en')).toBe('Parhez 5');
    expect(dietLabel({ code: 'N' }, 'uz-Latn')).toBe('N');
    expect(dietLabel(null, 'ru')).toBe('');
  });
});

describe('kitchen', () => {
  it('filters by name and builds the food line', () => {
    const rows = [{ guest: { full_name: 'Aliyev Vali' } }, { guest: { full_name: 'Karimova' } }];
    expect(filterByGuestName(rows, 'ali')).toHaveLength(1);
    expect(filterByGuestName(rows, ' ')).toHaveLength(2);
    expect(foodLine({ with_meals: false }, null, 'No meals')).toBe('No meals');
    expect(foodLine({ with_meals: true, diet_note: 'no salt' }, 'Table 5', 'x')).toBe('Table 5, no salt');
  });
});

describe('staff', () => {
  const m = (o: Partial<StaffMember>) => ({ id: 1, full_name: 'Ali Valiyev', is_active: true, is_registrar: false, is_kitchen: false, is_room_keeper: false, is_doctor: false, is_nurse: false, is_external: false, ...o }) as StaffMember;
  it('filters by name, role and activity', () => {
    const rows = [m({ id: 1, is_doctor: true }), m({ id: 2, full_name: 'Zara', is_nurse: true, is_active: false })];
    expect(filterStaff(rows, { q: 'zar', role: '', active: '' }).map((x) => x.id)).toEqual([2]);
    expect(filterStaff(rows, { q: '', role: 'doctor', active: '' }).map((x) => x.id)).toEqual([1]);
    expect(filterStaff(rows, { q: '', role: '', active: '0' }).map((x) => x.id)).toEqual([2]);
  });
  it('locks non-clinical roles of an invited user', () => {
    expect(flagLocked(true, 'is_registrar')).toBe(true);
    expect(flagLocked(true, 'is_doctor')).toBe(false);
    expect(flagLocked(false, 'is_registrar')).toBe(false);
    const f = { is_registrar: true, is_room_keeper: true, is_kitchen: true, is_doctor: true, is_nurse: false, is_housekeeper: true };
    expect(lockExternal(f, true)).toEqual({ ...f, is_registrar: false, is_room_keeper: false, is_kitchen: false, is_housekeeper: false });
    expect(lockExternal(f, false)).toBe(f);
  });
  it('validates the phone', () => {
    expect(phoneIssue('')).toBe(false);
    expect(phoneIssue('+998')).toBe(false);
    expect(phoneIssue('+998901234567')).toBe(false);
    expect(phoneIssue('901234567')).toBe(false);
    expect(phoneIssue('+99890123')).toBe(true);
    expect(phoneValue('90 123 45 67')).toBe('+998901234567');
    expect(phoneValue('')).toBeNull();
  });
  const flags = { is_registrar: false, is_room_keeper: false, is_kitchen: false, is_doctor: false, is_nurse: false, is_housekeeper: false };
  it('needs a user, a role and a sane phone', () => {
    expect(staffError({ hasPicked: false, flags, phone: '' })).toBe('user');
    expect(staffError({ hasPicked: true, flags, phone: '' })).toBe('role');
    expect(staffError({ hasPicked: true, flags: { ...flags, is_nurse: true }, phone: '12' })).toBe('phone');
    expect(staffError({ hasPicked: true, flags: { ...flags, is_nurse: true }, phone: '' })).toBeNull();
  });
  it('sends specialty and poi only for a doctor (poi only with the territory map)', () => {
    const base = { specialtyId: 4, cabinet: ' 12 ', phone: '', active: true, poiId: 9, poiOn: true };
    expect(staffBody({ ...base, flags: { ...flags, is_nurse: true } })).toMatchObject({ specialty_id: null, cabinet: '12', phone: null });
    expect(staffBody({ ...base, flags: { ...flags, is_nurse: true } })).not.toHaveProperty('poi_id');
    expect(staffBody({ ...base, flags: { ...flags, is_doctor: true }, userId: 7 })).toMatchObject({ user_id: 7, specialty_id: 4, poi_id: 9 });
    expect(staffBody({ ...base, poiOn: false, flags: { ...flags, is_doctor: true } })).not.toHaveProperty('poi_id');
  });
});

describe('meal windows', () => {
  it('splits and joins', () => {
    expect(splitWindow('08:00-09:00')).toEqual(['08:00', '09:00']);
    expect(splitWindow(undefined)).toEqual(['', '']);
    expect(joinWindow('08:00', '09:00')).toBe('08:00-09:00');
    expect(joinWindow('08:00', '')).toBe('08:00');
    expect(joinWindow('', '')).toBeNull();
  });
  it('validates a window', () => {
    expect(windowValid('', '')).toBe(true);
    expect(windowValid('', '09:00')).toBe(false);
    expect(windowValid('08:00', '')).toBe(true);
    expect(windowValid('09:00', '08:00')).toBe(false);
    expect(windowValid('25:00', '')).toBe(false);
  });
  it('omits empty meals from the body', () => {
    expect(mealTimesBody({ breakfast: ['08:00', '09:00'], lunch: ['', ''], dinner: ['18:00', ''] })).toEqual({ breakfast: '08:00-09:00', dinner: '18:00' });
  });
  it('steps hours and minutes with wrap-around', () => {
    expect(stepTime('23:00', 'h', 1)).toBe('00:00');
    expect(stepTime('00:00', 'h', -1)).toBe('23:00');
    expect(stepTime('09:55', 'm', 1)).toBe('09:00');
    expect(stepTime('09:00', 'm', -1)).toBe('09:55');
    expect(stepTime('', 'h', 1)).toBe('10:00');
  });
});

describe('setup + dashboard', () => {
  it('sorts open required first, done last', () => {
    const items = [
      { key: 'a', ok: true, severity: 'required' as const },
      { key: 'b', ok: false, severity: 'recommended' as const },
      { key: 'c', ok: false, severity: 'required' as const },
    ];
    expect(sortSetup(items).map((i) => i.key)).toEqual(['c', 'b', 'a']);
  });
  it('shows only the tiles the server returned', () => {
    expect(dashboardTiles({})).toEqual([]);
    const t = dashboardTiles({ occupied_beds: 20, total_beds: 50, free_beds: 30, in_house: 18, arrivals_today: 3, overdue_arrivals: 2, new_requests: 4, debt_total: '1500.00', appointments_today: 6, appointments_done: 2 });
    const keys = t.map((x) => x.key);
    expect(keys).toEqual(['occupied_beds', 'in_house', 'arrivals_today', 'new_requests', 'debt_total', 'appointments_today']);
    expect(t[0]).toMatchObject({ value: '20 / 50', hint: { kind: 'free', n: 30 } });
    expect(t[2]).toMatchObject({ hint: { kind: 'overdue', n: 2 }, danger: true });
    expect(t[5]).toMatchObject({ value: '2 / 6' });
  });
  it('splits departures into today and tomorrow and maps event icons', () => {
    const r = splitDepartures([{ planned_to: '2026-11-25' }, { planned_to: '2026-11-26' }, { planned_to: '2026-11-24' }], '2026-11-25');
    expect(r.today).toHaveLength(2);
    expect(r.tomorrow).toHaveLength(1);
    expect(eventIcon('payment')).toBe('wallet');
    expect(eventIcon('something_new')).toBe('clock');
  });
});
