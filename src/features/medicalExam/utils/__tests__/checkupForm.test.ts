import { buildCreateBody, buildUpdateBody, initialDraft, validateDraft, type CheckupDraft } from '../checkupForm';

const base: CheckupDraft = {
  date: '2026-11-10',
  conclusion: ' Sog‘lom ',
  recommendation: '',
  diagnoses: [],
  fitness: null,
  specialtyId: null,
};

describe('validateDraft', () => {
  it('needs a date', () => expect(validateDraft({ ...base, date: '' }, false)).toBe('dateRequired'));
  it('needs a specialty only when the doctor has several', () => {
    expect(validateDraft(base, false)).toBeNull();
    expect(validateDraft(base, true)).toBe('specialtyRequired');
    expect(validateDraft({ ...base, specialtyId: 3 }, true)).toBeNull();
  });
  it('points at the broken diagnosis row', () => {
    // Any code is fine (free text); a code without a name is not.
    const d = { ...base, diagnoses: [{ code: 'ZZ', name: 'ok' }, { code: 'I10', name: ' ' }] };
    expect(validateDraft(d, false)).toEqual({ diagnosis: 1, error: 'nameRequired' });
  });
  it('refuses a completely empty record', () => {
    expect(validateDraft({ ...base, conclusion: '  ' }, false)).toBe('emptyRecord');
  });
  it('a fitness alone is a record', () => {
    expect(validateDraft({ ...base, conclusion: '', fitness: 'fit' }, false)).toBeNull();
  });
});

describe('request bodies (strict: only declared keys)', () => {
  it('create: employee_id + date + trimmed text + diagnoses + fitness, no specialty_id for one specialty', () => {
    const body = buildCreateBody(
      7,
      { ...base, diagnoses: [{ code: 'i10', name: 'Gipertoniya' }], fitness: 'fit_limited', specialtyId: 3 },
      false,
    );
    expect(body).toEqual({
      employee_id: 7,
      checkup_date: '2026-11-10',
      conclusion: 'Sog‘lom',
      recommendation: null,
      diagnoses: [{ code: 'i10', name: 'Gipertoniya' }], // kept as typed
      fitness: 'fit_limited',
    });
    expect(Object.keys(body).sort()).toEqual(
      ['checkup_date', 'conclusion', 'diagnoses', 'employee_id', 'fitness', 'recommendation'],
    );
  });
  it('create: sends specialty_id when the choice is required', () => {
    expect(buildCreateBody(7, { ...base, specialtyId: 3 }, true).specialty_id).toBe(3);
  });
  it('update: no employee_id; carries emptied fields so they clear', () => {
    const body = buildUpdateBody(base, false);
    expect(body).not.toHaveProperty('employee_id');
    expect(body).toMatchObject({ diagnoses: [], fitness: null, recommendation: null });
  });
});

describe('initialDraft', () => {
  it('starts today for a new record', () => {
    expect(initialDraft(null, '2026-11-10')).toMatchObject({ date: '2026-11-10', diagnoses: [], fitness: null });
  });
  it('loads an existing record', () => {
    const d = initialDraft(
      { id: 1, checkup_date: '2026-10-01T00:00:00', conclusion: 'c', diagnoses: [{ code: null, name: 'n' }], fitness: 'unfit', specialty_id: 4 },
      '2026-11-10',
    );
    expect(d).toEqual({
      date: '2026-10-01',
      conclusion: 'c',
      recommendation: '',
      diagnoses: [{ code: '', name: 'n' }],
      fitness: 'unfit',
      specialtyId: 4,
    });
  });
});
