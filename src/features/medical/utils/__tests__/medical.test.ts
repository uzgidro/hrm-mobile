import {
  EMPTY_FILTERS,
  activeFilterCount,
  buildCheckupBody,
  buildIndexBody,
  fileRights,
  fmtDate,
  foldedCount,
  indexTone,
  initialCheckupForm,
  initialIndexForm,
  medicalParams,
  pageCount,
  previousYears,
  rowSubtitle,
  shortFileName,
  sortCheckups,
  specialtyChoices,
  statusTone,
  validateCheckup,
  validateIndex,
} from '../medical';

describe('medical utils (v2 MedicalPage)', () => {
  it('holat / indeks → ton (server kodi; noma’lumi neutral)', () => {
    expect(statusTone('passed')).toBe('success');
    expect(statusTone('due_soon')).toBe('warning');
    expect(statusTone('overdue')).toBe('danger');
    expect(statusTone('weird')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
    expect(indexTone('excellent')).toBe('success');
    expect(indexTone('good')).toBe('info');
    expect(indexTone('poor')).toBe('danger');
    expect(indexTone(undefined)).toBe('neutral');
  });

  it("filtr → parametrlar: bo'shlari yuborilmaydi, qidiruv kesiladi, yil son", () => {
    expect(medicalParams(EMPTY_FILTERS)).toEqual({});
    expect(medicalParams({ ...EMPTY_FILTERS, search: '  ' })).toEqual({});
    expect(
      medicalParams({
        search: ' Ali ',
        status: 'overdue',
        branchId: 7,
        departmentId: 3,
        jobPositionId: 9,
        healthIndex: 'poor',
        year: '2025',
      }),
    ).toEqual({
      search: 'Ali',
      status: 'overdue',
      organization_branch_id: 7,
      department_id: 3,
      job_position_id: 9,
      health_index: 'poor',
      year: 2025,
    });
  });

  it('filtr hisoblagichlari: yig‘iladigan beshta; tozalash holatni ham sanaydi, qidiruvni emas', () => {
    expect(foldedCount(EMPTY_FILTERS)).toBe(0);
    const f = { ...EMPTY_FILTERS, search: 'x', status: 'passed', branchId: 0, healthIndex: 'good' };
    expect(foldedCount(f)).toBe(2);
    expect(activeFilterCount(f)).toBe(3);
  });

  it('sahifalar soni — kamida 1', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
    expect(pageCount(40, 20)).toBe(2);
  });

  it('oldingi yillar (joriysi standart)', () => {
    expect(previousYears(2026)).toEqual(['2025', '2024', '2023', '2022']);
  });

  it('tarix — eng yangisi tepada; sanasizi oxirida', () => {
    const r = sortCheckups([
      { id: 1, checkup_date: '2025-03-01' },
      { id: 2, checkup_date: null },
      { id: 3, checkup_date: '2026-01-15' },
    ]);
    expect(r.map((c) => c.id)).toEqual([3, 1, 2]);
    expect(sortCheckups(null)).toEqual([]);
  });

  it('sana va qator matni', () => {
    expect(fmtDate('2026-03-05')).toBe('05.03.2026');
    expect(fmtDate('2026-03-05T10:00:00')).toBe('05.03.2026');
    expect(fmtDate(null)).toBe('—');
    expect(rowSubtitle({ id: 1, department_name: 'Kadrlar', job_position_name: 'Mutaxassis' })).toBe(
      'Kadrlar · Mutaxassis',
    );
    expect(rowSubtitle({ id: 1, job_position_name: 'Mutaxassis' })).toBe('Mutaxassis');
  });

  it('fayl huquqi: doktorlik VA qator bayrog‘i (bosh admin can_edit bilan ham yuklay olmaydi)', () => {
    expect(fileRights(true, { id: 1, can_edit: true, can_delete: false })).toEqual({
      canAttach: true,
      canDetach: false,
    });
    expect(fileRights(false, { id: 1, can_edit: true, can_delete: true })).toEqual({
      canAttach: false,
      canDetach: false,
    });
  });

  it('uzun fayl nomi o‘rtasidan qisqaradi, kengaytma qoladi', () => {
    expect(shortFileName('tahlil.pdf')).toBe('tahlil.pdf');
    const long = `${'a'.repeat(50)}_qon_tahlili.pdf`;
    const s = shortFileName(long);
    expect(s).toHaveLength(36);
    expect(s.endsWith('tahlili.pdf')).toBe(false);
    expect(s.endsWith('ahlili.pdf')).toBe(true);
    expect(s).toContain('…');
  });

  it('ko‘rik formasi: boshlang‘ich qiymatlar (yangi / tahrir)', () => {
    expect(initialCheckupForm(null, '2026-10-05')).toEqual({
      date: '2026-10-05',
      conclusion: '',
      recommendation: '',
      specialtyId: null,
    });
    expect(
      initialCheckupForm(
        { id: 3, checkup_date: '2026-02-01', conclusion: 'Sog‘lom', recommendation: null, specialty_id: 4 },
        '2026-10-05',
      ),
    ).toEqual({ date: '2026-02-01', conclusion: 'Sog‘lom', recommendation: '', specialtyId: 4 });
  });

  it('doktor turlari: o‘zinikilar ustun, bo‘lmasa katalog', () => {
    expect(specialtyChoices([{ id: 1, name: 'Terapevt' }], [{ id: 2, name: 'Kardiolog' }])).toEqual([
      { id: 1, name: 'Terapevt' },
    ]);
    expect(specialtyChoices([], [{ id: 2, name: null }])).toEqual([{ id: 2, name: '#2' }]);
    expect(specialtyChoices(undefined, undefined)).toEqual([]);
  });

  it('ko‘rik formasi: tekshiruv va tana (bo‘sh matn → null)', () => {
    const f = { date: '2026-10-05', conclusion: '  ', recommendation: ' Dam olish ', specialtyId: null };
    expect(validateCheckup({ ...f, date: '' }, false)).toBe('dateRequired');
    expect(validateCheckup(f, true)).toBe('specialtyRequired');
    expect(validateCheckup(f, false)).toBeNull();
    expect(buildCheckupBody(f)).toEqual({
      checkup_date: '2026-10-05',
      conclusion: null,
      recommendation: 'Dam olish',
      specialty_id: null,
    });
  });

  it('yillik indeks: tekshiruv (server oralig‘i) va tana', () => {
    const f = initialIndexForm(2026);
    expect(f).toEqual({ year: '2026', index: 'good', note: '' });
    expect(validateIndex({ ...f, year: ' ' }, 2026)).toBe('yearRequired');
    expect(validateIndex({ ...f, year: '20x6' }, 2026)).toBe('yearInvalid');
    expect(validateIndex({ ...f, year: '1999' }, 2026)).toBe('yearInvalid');
    expect(validateIndex({ ...f, year: '2028' }, 2026)).toBe('yearInvalid');
    expect(validateIndex({ ...f, year: '2027' }, 2026)).toBeNull();
    expect(buildIndexBody(5, { year: '2025', index: 'poor', note: ' Nazorat ' })).toEqual({
      employee_id: 5,
      year: 2025,
      health_index: 'poor',
      index_note: 'Nazorat',
    });
    expect(buildIndexBody(5, { year: '2025', index: 'excellent', note: '' }).index_note).toBeNull();
  });
});
