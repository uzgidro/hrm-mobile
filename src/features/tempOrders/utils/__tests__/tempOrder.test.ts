import { TEMP_ORDER_TYPES, buildCreateBody, buildUpdateBody, validateTempOrder, type TempOrderForm } from '../tempOrder';

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
