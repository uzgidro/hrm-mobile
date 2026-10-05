import {
  BULK_MAX,
  branchCandidates,
  buildBulkBodies,
  buildGradeBody,
  describeFailed,
  initialGradeForm,
  mergeBulkResults,
  resolveHealthBranch,
  rosterCounts,
  ungradedIds,
  untilSuffix,
  validateGrade,
  type HealthRosterRow,
} from '../health';

const DAY = '2026-10-05';
const rows: HealthRosterRow[] = [
  { employee_id: 1, legal_name: 'Aliyev Vali', status: 'good', check_id: 11, date_from: DAY, date_to: DAY },
  { employee_id: 2, legal_name: 'Karimov Ali', status: 'unfit', check_id: 12, date_from: DAY, date_to: '2026-10-09' },
  { employee_id: 3, legal_name: 'Rustamov Bek', status: null },
  { employee_id: 4, legal_name: null, status: 'limited', note: 'Bosim', check_id: 14 },
  { employee_id: 5, legal_name: 'Usmonov Jasur' },
];

describe('health utils (v2 HealthChecksPage)', () => {
  it('hisoblagichlar: jami, tekshirilgan, har holat, tekshirilmagan', () => {
    expect(rosterCounts(rows)).toEqual({ total: 5, checked: 3, unchecked: 2, good: 1, limited: 1, unfit: 1 });
    expect(rosterCounts([])).toEqual({ total: 0, checked: 0, unchecked: 0, good: 0, limited: 0, unfit: 0 });
  });

  it("ommaviy baho faqat bahosi yo'qlarga", () => {
    expect(ungradedIds(rows)).toEqual([3, 5]);
  });

  it("ommaviy tana: good, shu kun; 200 dan ko'pi bo'laklarga bo'linadi", () => {
    expect(buildBulkBodies([3, 5], DAY)).toEqual([
      { employee_ids: [3, 5], status: 'good', date_from: DAY, date_to: DAY },
    ]);
    const ids = Array.from({ length: BULK_MAX + 5 }, (_, i) => i + 1);
    const parts = buildBulkBodies(ids, DAY);
    expect(parts).toHaveLength(2);
    expect(parts[0]!.employee_ids).toHaveLength(BULK_MAX);
    expect(parts[1]!.employee_ids).toEqual([201, 202, 203, 204, 205]);
    expect(buildBulkBodies([], DAY)).toEqual([]);
  });

  it('natijalar birlashadi; failed qatorlar ism bilan (topilmasa #id)', () => {
    const merged = mergeBulkResults([
      { ok: [3], failed: [] },
      { ok: [], failed: [{ id: 5, error: 'Haydovchi emas' }] },
      {},
    ]);
    expect(merged).toEqual({ ok: [3], failed: [{ id: 5, error: 'Haydovchi emas' }] });
    expect(describeFailed([...merged.failed, { id: 99, error: 'Xato' }], rows)).toEqual([
      { id: 5, name: 'Usmonov Jasur', error: 'Haydovchi emas' },
      { id: 99, name: '#99', error: 'Xato' },
    ]);
  });

  it("forma: tugash sanasi faqat boshqa kun bo'lsa; noma'lum holat — bo'sh", () => {
    expect(initialGradeForm(rows[0]!, DAY)).toEqual({
      employeeId: 1,
      checkId: 11,
      hadStatus: true,
      status: 'good',
      note: '',
      dateTo: '',
    });
    expect(initialGradeForm(rows[1]!, DAY).dateTo).toBe('2026-10-09');
    expect(initialGradeForm(rows[2]!, DAY)).toMatchObject({ checkId: null, hadStatus: false, status: '' });
    expect(initialGradeForm({ employee_id: 9, status: 'weird' }, DAY)).toMatchObject({ status: '', hadStatus: true });
  });

  it('validatsiya: holat shart; tugash sanasi kundan oldin emas', () => {
    const f = initialGradeForm(rows[2]!, DAY);
    expect(validateGrade(f, DAY)).toBe('pickStatus');
    expect(validateGrade({ ...f, status: 'unfit', dateTo: '2026-10-04' }, DAY)).toBe('invalidRange');
    expect(validateGrade({ ...f, status: 'unfit', dateTo: DAY }, DAY)).toBeNull();
    expect(validateGrade({ ...f, status: 'good' }, DAY)).toBeNull();
  });

  it("tana: sana bo'sh — faqat shu kun; izoh trim, bo'sh — null", () => {
    const f = { ...initialGradeForm(rows[2]!, DAY), status: 'limited' as const, note: '  ' };
    expect(buildGradeBody(f, DAY)).toEqual({
      employee_id: 3,
      status: 'limited',
      date_from: DAY,
      date_to: DAY,
      note: null,
    });
    expect(buildGradeBody({ ...f, note: ' Isitma ', dateTo: '2026-10-08' }, DAY)).toEqual({
      employee_id: 3,
      status: 'limited',
      date_from: DAY,
      date_to: '2026-10-08',
      note: 'Isitma',
    });
  });

  it("badge qo'shimchasi faqat boshqa kungacha amal qilsa", () => {
    expect(untilSuffix(rows[0]!, DAY)).toBe('');
    expect(untilSuffix(rows[1]!, DAY)).toBe(' · 09.10');
    expect(untilSuffix(rows[2]!, DAY)).toBe('');
  });

  it('filial: tanlangan → auth/me hamshira filiali → access → null', () => {
    expect(branchCandidates([7, 8], [9])).toEqual([7, 8]);
    expect(branchCandidates([], [9])).toEqual([9]);
    expect(branchCandidates(undefined, undefined)).toEqual([]);
    expect(resolveHealthBranch(null, [7, 8])).toBe(7);
    expect(resolveHealthBranch(8, [7, 8])).toBe(8);
    expect(resolveHealthBranch(null, [])).toBeNull();
  });
});
