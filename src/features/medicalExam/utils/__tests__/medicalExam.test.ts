import {
  ageFromBirthDate,
  genderKey,
  groupCheckupsByYear,
  isExternalDoctor,
  isStaffDoctor,
  joinedSpecialty,
  routeProgress,
  sortCheckups,
  splitRoute,
  stationTone,
  type Station,
  type Visit,
} from '../medicalExam';

const st = (id: number, status: Station['status'], extra: Partial<Station> = {}): Station => ({
  id,
  specialty_id: id,
  specialty_name: `S${id}`,
  status,
  ...extra,
});

describe('ageFromBirthDate', () => {
  const now = '2026-11-10';
  it('counts whole years', () => {
    expect(ageFromBirthDate('1990-11-10', now)).toBe(36);
    expect(ageFromBirthDate('1990-11-11', now)).toBe(35); // birthday tomorrow
    expect(ageFromBirthDate('1990-02-29', now)).toBe(36);
  });
  it('accepts an ISO datetime', () => expect(ageFromBirthDate('2000-01-01T00:00:00', now)).toBe(26));
  it('is null for missing / invalid / future dates', () => {
    expect(ageFromBirthDate(null, now)).toBeNull();
    expect(ageFromBirthDate('nope', now)).toBeNull();
    expect(ageFromBirthDate('2030-01-01', now)).toBeNull();
  });
  it('a newborn is 0', () => expect(ageFromBirthDate('2026-11-01', now)).toBe(0));
});

describe('genderKey', () => {
  it('1 = male, 2 = female, otherwise unknown', () => {
    expect(genderKey(1)).toBe('male');
    expect(genderKey(2)).toBe('female');
    expect(genderKey(0)).toBeNull();
    expect(genderKey(null)).toBeNull();
  });
});

describe('route sheet', () => {
  const stations = [st(1, 'done'), st(2, 'present'), st(3, 'skipped'), st(4, 'waiting'), st(5, 'away')];
  it('splits finished (done / skipped) from left, keeping the server order', () => {
    const { done, left } = splitRoute(stations);
    expect(done.map((s) => s.id)).toEqual([1, 3]);
    expect(left.map((s) => s.id)).toEqual([2, 4, 5]);
  });
  it('progress prefers the server counters, falls back to the lines', () => {
    expect(routeProgress({ stations, stations_done: 9, stations_total: 12 })).toEqual({ done: 9, total: 12 });
    expect(routeProgress({ stations })).toEqual({ done: 2, total: 5 });
    expect(routeProgress({})).toEqual({ done: 0, total: 0 });
  });
  it('station tones', () => {
    expect(stationTone('done')).toBe('success');
    expect(stationTone('absent')).toBe('danger');
    expect(stationTone('???')).toBe('neutral');
  });
});

describe('groupCheckupsByYear', () => {
  it('groups by year, newest first, with the yearly index', () => {
    const g = groupCheckupsByYear(
      [
        { id: 1, checkup_date: '2025-03-01' },
        { id: 2, checkup_date: '2026-10-01' },
        { id: 3, checkup_date: '2026-11-02' },
        { id: 4, checkup_date: '2026-11-02' },
      ],
      [{ year: 2026, health_index: 'good' }, { year: 2024, health_index: 'poor' }],
    );
    expect(g.map((x) => x.year)).toEqual([2026, 2025, 2024]);
    expect(g[0]!.checkups.map((c) => c.id)).toEqual([4, 3, 2]);
    expect(g[0]!.index?.health_index).toBe('good');
    expect(g[2]!.checkups).toEqual([]); // index-only year
  });
  it('handles nothing', () => expect(groupCheckupsByYear(undefined, undefined)).toEqual([]));
});

describe('sortCheckups', () => {
  it('newest first', () => {
    expect(sortCheckups([{ id: 1, checkup_date: '2026-01-01' }, { id: 2, checkup_date: '2026-05-01' }]).map((c) => c.id)).toEqual([2, 1]);
  });
});

describe('roles', () => {
  it('a staff doctor is is_doctor and not external', () => {
    expect(isStaffDoctor({ type: 'employee', is_doctor: true })).toBe(true);
    expect(isStaffDoctor({ type: 'employee', is_doctor: false })).toBe(false);
    expect(isStaffDoctor({ type: 'external-doctor', is_doctor: true })).toBe(false);
    expect(isStaffDoctor(null)).toBe(false);
  });
  it('external doctor', () => {
    expect(isExternalDoctor({ type: 'external-doctor' })).toBe(true);
    expect(isExternalDoctor({ type: 'employee' })).toBe(false);
  });
});

describe('joinedSpecialty', () => {
  const visit = (stations: Station[]): Visit => ({ id: 1, status: 'in_progress', stations });
  it('names the line that changed', () => {
    const prev = visit([st(1, 'waiting'), st(2, 'waiting')]);
    const next = visit([st(1, 'waiting'), st(2, 'present')]);
    expect(joinedSpecialty(prev, next)).toBe('S2');
  });
  it('falls back to the latest queued open line', () => {
    const next = visit([st(1, 'waiting', { queued_at: '2026-11-10T09:00:00' }), st(2, 'present', { queued_at: '2026-11-10T10:00:00' }), st(3, 'done')]);
    expect(joinedSpecialty(null, next)).toBe('S2');
  });
  it('is null when nothing is open', () => {
    expect(joinedSpecialty(null, visit([st(1, 'done')]))).toBeNull();
  });
});
