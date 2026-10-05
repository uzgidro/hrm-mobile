import {
  TEMP_ORDER_TYPES,
  buildCreateBody,
  buildUpdateBody,
  isOpenEnded,
  tempOrderRange,
  validateTempOrder,
  type TempOrderForm,
} from '../tempOrder';

const base: TempOrderForm = { employeeId: 7, type: 'kasal', start: '2026-10-01', end: '2026-10-05', startTime: '09:00', endTime: '13:00', note: '  isitma ' };

describe('TEMP_ORDER_TYPES — v2 ro\u2019yxati', () => {
  it('23 tur, v2 tartibida', () => {
    expect(TEMP_ORDER_TYPES).toHaveLength(23);
    expect(TEMP_ORDER_TYPES[0]).toBe('kasal');
    expect(TEMP_ORDER_TYPES).toContain('ruxsat');
  });
});

describe('validateTempOrder', () => {
  it("xodim yo'q (yaratish)", () => expect(validateTempOrder({ ...base, employeeId: null }, false)).toBe('employeeRequired'));
  it("tahrirda xodim shart emas", () => expect(validateTempOrder({ ...base, employeeId: null }, true)).toBeNull());
  it("boshlanish yo'q", () => expect(validateTempOrder({ ...base, start: '' }, false)).toBe('startRequired'));
  it("oddiy tur — tugash shart", () => expect(validateTempOrder({ ...base, end: '' }, false)).toBe('endRequired'));
  it("arxivlovchi tur — tugash shart emas", () => expect(validateTempOrder({ ...base, type: 'ishdan_ozod', end: '' }, false)).toBeNull());
  it("soatlik — tugash sanasi shart emas", () => expect(validateTempOrder({ ...base, type: 'ruxsat', end: '' }, false)).toBeNull());
  it("soatlik — vaqt formati noto'g'ri", () =>
    expect(validateTempOrder({ ...base, type: 'ruxsat', startTime: '9:00' }, false)).toBe('timeInvalid'));
  it("soatlik — tugash vaqti boshlanishdan keyin bo'lishi shart", () => {
    expect(validateTempOrder({ ...base, type: 'ruxsat', startTime: '13:00', endTime: '09:00' }, false)).toBe('timeOrder');
    expect(validateTempOrder({ ...base, type: 'ruxsat', startTime: '09:00', endTime: '09:00' }, false)).toBe('timeOrder');
  });
  it("soatlik bo'lmagan tur — vaqt tekshirilmaydi", () =>
    expect(validateTempOrder({ ...base, startTime: '13:00', endTime: '09:00' }, false)).toBeNull());
  it("tugash boshlanishdan oldin", () => expect(validateTempOrder({ ...base, end: '2026-09-30' }, false)).toBe('endBeforeStart'));
});

describe('buildCreateBody — v2 hr-create', () => {
  it('oddiy', () =>
    expect(buildCreateBody(base)).toEqual({ employee_id: 7, type: 'kasal', start_date: '2026-10-01', end_date: '2026-10-05', start_time: null, end_time: null, note: 'isitma' }));
  it('soatlik', () =>
    expect(buildCreateBody({ ...base, type: 'ruxsat' })).toEqual({ employee_id: 7, type: 'ruxsat', start_date: '2026-10-01', end_date: '2026-10-01', start_time: '09:00:00', end_time: '13:00:00', note: 'isitma' }));
  it('arxivlovchi', () => expect(buildCreateBody({ ...base, type: 'ishdan_ozod', note: '' })).toMatchObject({ end_date: null, note: null }));
});

describe('buildUpdateBody — v2 PATCH', () => {
  it('oddiy — kun boshi/oxiri datetime, description', () =>
    expect(buildUpdateBody(base)).toEqual({ type: 'kasal', start_date: '2026-10-01T00:00:00', end_date: '2026-10-05T23:59:59', description: 'isitma' }));
  it('soatlik', () =>
    expect(buildUpdateBody({ ...base, type: 'ruxsat' })).toMatchObject({ start_date: '2026-10-01T09:00:00', end_date: '2026-10-01T13:00:00' }));
  it('arxivlovchi', () => expect(buildUpdateBody({ ...base, type: 'boshqa_ishga_otkazish' })).toMatchObject({ end_date: null }));
});

describe("muddat (ro'yxat qatori)", () => {
  it("arxivlash turi — server 2099-12-31 yozadi: faqat boshlanish sanasi, kunlar soni yo'q (26801 kun emas)", () => {
    const r = { type: 'ishdan_ozod', start_date: '2026-08-16T00:00:00', end_date: '2099-12-31T23:59:59' };
    expect(isOpenEnded(r)).toBe(true);
    expect(tempOrderRange(r)).toEqual({ text: '16.08.2026', days: null, open: false });
  });
  it("boshqa tur, lekin 2099+ to'ldiruvchi sana — boshlanish + «muddatsiz» belgisi", () => {
    const r = { type: 'dekret', start_date: '2026-08-16T00:00:00', end_date: '2099-12-31T23:59:59' };
    expect(isOpenEnded(r)).toBe(true);
    expect(tempOrderRange(r)).toEqual({ text: '16.08.2026', days: null, open: true });
  });
  it('oddiy oraliq — kunlar soni bilan; bir kun — vaqt bilan; sanasiz — «—»', () => {
    expect(tempOrderRange({ type: 'kasal', start_date: '2026-10-01T00:00:00', end_date: '2026-10-03T23:59:59' })).toEqual({
      text: '01.10 – 03.10.2026',
      days: 3,
      open: false,
    });
    expect(tempOrderRange({ type: 'ruxsat', start_date: '2026-10-01T09:00:00', end_date: '2026-10-01T13:00:00' })).toEqual({
      text: '01.10.2026 09:00–13:00',
      days: null,
      open: false,
    });
    expect(tempOrderRange({ type: 'kasal', start_date: null, end_date: null })).toEqual({ text: '—', days: null, open: false });
    expect(isOpenEnded({ type: 'kasal', end_date: '2098-12-31' })).toBe(false);
  });
});
