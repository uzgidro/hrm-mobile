import {
  buildTrainingBody,
  compactNumber,
  daysLeft,
  expiryTone,
  validateTraining,
  type TrainingForm,
} from '../trainings';

const base: TrainingForm = {
  employeeId: 7,
  type: 'course',
  program: 'Energetika asoslari',
  provider: '',
  start: '2026-09-01',
  end: '2026-09-10',
  hours: '',
  status: 'planned',
  result: '',
  cost: '',
  certNumber: '',
  certExpires: '',
  note: '',
};

describe('trainings utils (v2 TrainingsPage)', () => {
  it("validatsiya: yaratishda xodim, dastur nomi, sana oralig'i, son maydonlari", () => {
    expect(validateTraining({ ...base, employeeId: null }, false)).toBe('employeeRequired');
    expect(validateTraining({ ...base, employeeId: null }, true)).toBeNull(); // tahrirda xodim o'zgarmaydi
    expect(validateTraining({ ...base, program: '  ' }, false)).toBe('programRequired');
    expect(validateTraining({ ...base, start: '2026-09-10', end: '2026-09-01' }, false)).toBe('invalidRange');
    expect(validateTraining({ ...base, start: '', end: '2026-09-01' }, false)).toBeNull(); // bittasi bo'lsa tekshirilmaydi
    expect(validateTraining({ ...base, hours: 'x' }, false)).toBe('numberInvalid');
    expect(validateTraining({ ...base, cost: '-1' }, false)).toBe('numberInvalid');
    expect(validateTraining({ ...base, hours: '16', cost: '1500000' }, false)).toBeNull();
    expect(validateTraining(base, false)).toBeNull();
  });

  it("tana: bo'sh matn/son null; xodim tanaga kirmaydi (alohida beriladi)", () => {
    expect(
      buildTrainingBody({ ...base, program: ' Kurs ', hours: '16', cost: '1500000', certNumber: ' A-1 ', note: ' ' }),
    ).toEqual({
      training_type: 'course',
      program_name: 'Kurs',
      provider: null,
      start_date: '2026-09-01',
      end_date: '2026-09-10',
      hours: 16,
      status: 'planned',
      result: null,
      cost: 1500000,
      certificate_number: 'A-1',
      certificate_expires_at: null,
      note: null,
    });
    expect(buildTrainingBody({ ...base, start: '', end: '' })).toMatchObject({ start_date: null, end_date: null });
  });

  it("kunlar qoldig'i va rang: o'tgan — danger, ≤30 — warning, qolgani — neutral", () => {
    expect(daysLeft('2026-10-05', '2026-10-02')).toBe(3);
    expect(daysLeft('2026-10-01', '2026-10-02')).toBe(-1);
    expect(daysLeft(null, '2026-10-02')).toBeNull();
    expect(expiryTone(-1)).toBe('danger');
    expect(expiryTone(0)).toBe('warning');
    expect(expiryTone(30)).toBe('warning');
    expect(expiryTone(31)).toBe('neutral');
  });

  it("kunlar qoldig'i TZ/soatdan mustaqil (ISO datetime ham)", () => {
    expect(daysLeft('2026-10-05T23:59:59', '2026-10-02')).toBe(3);
  });

  it("katta sonlar plitkaga sig'adigan ixcham ko'rinishda (K / M / B)", () => {
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(12500)).toBe('12.5K');
    expect(compactNumber(1_000_000)).toBe('1M');
    expect(compactNumber(12_500_000)).toBe('12.5M');
    expect(compactNumber(2_340_000_000)).toBe('2.3B');
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(-1500)).toBe('-1.5K');
    expect(compactNumber(Number.NaN)).toBe('0');
  });
});
