import { statusOf, delayDays, daysLeft, validateTask, buildTaskBody, type TaskForm } from '../ijro';

const TODAY = '2026-10-02';
const t = (deadline_date: string | null, task_completed: string | null = null) => ({ id: 1, deadline_date, task_completed });

describe('statusOf — v2 IjroPage', () => {
  it.each<[string | null, string | null, string]>([
    ['2026-10-05', null, 'open'],
    ['2026-10-02', null, 'open'], // bugun muddat — hali kechikmagan
    ['2026-09-30', null, 'late'],
    ['2026-09-30', '2026-09-29', 'done'],
    ['2026-09-30', '2026-09-30', 'done'],
    ['2026-09-30', '2026-10-01', 'late_done'],
  ])('muddat %s, bajarilgan %s → %s', (d, c, s) => expect(statusOf(t(d, c), TODAY)).toBe(s));
});

describe('delayDays / daysLeft', () => {
  it('ochiq, kechikkan — bugungacha', () => expect(delayDays(t('2026-09-28'), TODAY)).toBe(4));
  it('kechikib yopilgan — yopilgan kungacha', () => expect(delayDays(t('2026-09-28', '2026-09-30'), TODAY)).toBe(2));
  it("muddat ichida — 0", () => expect(delayDays(t('2026-10-05'), TODAY)).toBe(0));
  it("muddatsiz — 0", () => expect(delayDays(t(null), TODAY)).toBe(0));
  it('qolgan kunlar', () => expect(daysLeft(t('2026-10-05'), TODAY)).toBe(3));
});

const form: TaskForm = { index: ' 12/45 ', description: '  hisobot ', employeeId: 7, deadline: '2026-10-10', done: '' };

describe('validateTask / buildTaskBody (v2 TaskForm)', () => {
  it.each<[Partial<TaskForm>, string | null]>([
    [{}, null],
    [{ index: '  ' }, 'indexRequired'],
    [{ employeeId: null }, 'employeeRequired'],
    [{ deadline: '' }, 'deadlineRequired'],
  ])('%j → %s', (patch, e) => expect(validateTask({ ...form, ...patch })).toBe(e));
  it('tana', () =>
    expect(buildTaskBody(form)).toEqual({ task_index: '12/45', description: 'hisobot', employee_id: 7, deadline_date: '2026-10-10', task_completed: null }));
  it("bo'sh tavsif → null, bajarilgan sana saqlanadi", () =>
    expect(buildTaskBody({ ...form, description: ' ', done: '2026-10-09' })).toMatchObject({ description: null, task_completed: '2026-10-09' }));
});
