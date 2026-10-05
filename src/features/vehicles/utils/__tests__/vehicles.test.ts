import {
  approveBody,
  availability,
  buildFuelBody,
  buildVehicleBody,
  categoryLabelKey,
  defaultRequestStatus,
  driverPickerOptions,
  EMPTY_FLEET_FILTERS,
  filterFuel,
  filterVehicles,
  finalizeBody,
  fleetFilterCount,
  fleetOverview,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fuelBadge,
  fuelDecisionBody,
  isFuelApproved,
  isInvalidRange,
  liveStatus,
  parseNumber,
  pendingFuelCount,
  placeLabelKey,
  plateParts,
  reqTone,
  requestActions,
  requestFigures,
  requestStatuses,
  requestSteps,
  resolveTab,
  respondBody,
  scopeKindKey,
  seedVehicleForm,
  tabsFor,
  vehiclePickerOptions,
  visitParams,
  type FleetAccess,
  type FuelType,
  type Vehicle,
  type VehicleRequest,
} from '../vehicles';
import type { User } from '@/types';

const access = (x: Partial<FleetAccess> = {}): FleetAccess => ({
  can_manage: false,
  can_approve: false,
  can_view: true,
  can_request: false,
  provider_branch_id: 29,
  managed_branch_ids: [],
  approver_branch_ids: [],
  requester_branch_ids: [],
  ...x,
});
const emp = { id: 1, type: 'employee' } as unknown as User;
const master = { id: 2, type: 'master-admin' } as unknown as User;

describe('formatlash', () => {
  it("fmtMoney — minglar bo'shliq bilan, kasr vergul bilan, null → «—»", () => {
    expect(fmtMoney(1234567)).toBe('1 234 567');
    expect(fmtMoney(12500.5)).toBe('12 500,5');
    expect(fmtMoney(null)).toBe('—');
    expect(fmtMoney(0)).toBe('0');
  });
  it('sanalar satrdan kesiladi (TZ dan mustaqil)', () => {
    expect(fmtDate('2026-10-05')).toBe('05.10.2026');
    expect(fmtDate(null)).toBe('—');
    expect(fmtDateTime('2026-10-05T09:07:00')).toBe('05.10.2026 09:07');
  });
  it("isInvalidRange — faqat ikkalasi berilib, tugash oldin bo'lsa", () => {
    expect(isInvalidRange('2026-10-05', '2026-10-01')).toBe(true);
    expect(isInvalidRange('2026-10-05', '')).toBe(false);
    expect(isInvalidRange('2026-10-01', '2026-10-01')).toBe(false);
  });
  it('plateParts — viloyat kodi alohida, harf/raqam guruhlari', () => {
    expect(plateParts('01A123BC')).toEqual({ region: '01', rest: 'A 123 BC' });
    expect(plateParts('10517KGA')).toEqual({ region: '10', rest: '517 KGA' });
    expect(plateParts('A123')).toEqual({ region: '', rest: 'A 123' });
    expect(plateParts(null)).toBeNull();
  });
  it("parseNumber — bo'sh null, vergul, manfiy/harf noto'g'ri", () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('8,5')).toBe(8.5);
    expect(parseNumber('-1')).toBeUndefined();
    expect(parseNumber('abc')).toBeUndefined();
  });
});

describe('mavjudlik va filtrlar (v2 FleetTab)', () => {
  const rows: Vehicle[] = [
    { id: 1, is_active: true, gps_device_id: '77', driver_employee_id: 5, fuel_type_id: 2 },
    {
      id: 2,
      is_active: true,
      is_busy: true,
      busy_periods: [{ letter_id: 9, end_date: '2026-10-07', employee_name: 'Vali' }],
    },
    { id: 3, is_active: true, has_pending: true },
    { id: 4, is_active: false },
    { id: 5, is_busy: true, has_pending: true },
  ];

  it("availability — faol emas > safarda (kimda, qachongacha) > so'ralgan > bo'sh", () => {
    expect(availability(rows[3]!)).toEqual({ key: 'inactive', tone: 'neutral' });
    expect(availability(rows[1]!)).toEqual({ key: 'onTrip', tone: 'info', until: '07.10', who: 'Vali' });
    expect(availability(rows[2]!).key).toBe('requested');
    expect(availability(rows[0]!).key).toBe('free');
  });

  it('filterVehicles — v2 qoidalari aynan', () => {
    const ids = (f: Partial<typeof EMPTY_FLEET_FILTERS>) =>
      filterVehicles(rows, { ...EMPTY_FLEET_FILTERS, ...f }).map((v) => v.id);
    expect(ids({})).toEqual([1, 2, 3, 4, 5]);
    expect(ids({ state: 'inactive' })).toEqual([4]);
    expect(ids({ state: 'active' })).toEqual([1, 2, 3, 5]);
    expect(ids({ avail: 'free' })).toEqual([1]);
    expect(ids({ avail: 'busy' })).toEqual([2, 5]);
    expect(ids({ avail: 'pending' })).toEqual([3]);
    expect(ids({ gps: '1' })).toEqual([1]);
    expect(ids({ drv: '0' })).toEqual([2, 3, 4, 5]);
    expect(ids({ fuel: 2 })).toEqual([1]);
    expect(fleetFilterCount({ ...EMPTY_FLEET_FILTERS, avail: 'free', fuel: 2 })).toBe(2);
  });

  it('fleetOverview — plitka sonlari', () => {
    expect(fleetOverview(rows)).toEqual({ total: 5, free: 1, onTrip: 2, requested: 1, inactive: 1, gps: 1 });
  });
});

describe('tablar (v2 VehiclesPage)', () => {
  it("oddiy ko'ruvchi — mashinalar + so'rovlar; operator/tasdiqlovchi — yoqilg'i + tashriflar; bosh admin — haydovchilar", () => {
    expect(tabsFor(access(), emp)).toEqual(['fleet', 'requests']);
    expect(tabsFor(access({ can_manage: true }), emp)).toEqual(['fleet', 'requests', 'fuel', 'visits']);
    expect(tabsFor(access({ can_approve: true }), emp)).toEqual(['fleet', 'requests', 'fuel', 'visits']);
    expect(tabsFor(access({ can_manage: true }), master)).toEqual(['fleet', 'requests', 'fuel', 'visits', 'drivers']);
  });
  it("resolveTab — ruxsatsiz yoki noma'lum tab → fleet", () => {
    expect(resolveTab('fuel', ['fleet', 'requests', 'fuel'])).toBe('fuel');
    expect(resolveTab('fuel', ['fleet', 'requests'])).toBe('fleet');
    expect(resolveTab(undefined, ['fleet'])).toBe('fleet');
  });
});

describe("so'rovlar", () => {
  it('holatlar va standart — tasdiqlovchiga «Tasdiqlash kerak» birinchi', () => {
    expect(requestStatuses(true)).toEqual(['awaiting_approval', 'pending', 'approved', 'rejected']);
    expect(requestStatuses(false)).toEqual(['pending', 'approved', 'rejected']);
    expect(defaultRequestStatus(true)).toBe('awaiting_approval');
    expect(defaultRequestStatus(false)).toBe('pending');
    expect(reqTone('awaiting_approval')).toBe('info');
    expect(reqTone('cancelled')).toBe('neutral');
    expect(reqTone('weird')).toBe('neutral');
  });

  it("requestSteps — tasdiqsiz filial birinchi bosqichni o'tkazadi", () => {
    expect(
      requestSteps({ id: 1, status: 'pending', approval_status: 'not_required' }).map((s) => [s.key, s.state]),
    ).toEqual([
      ['attach', 'current'],
      ['trip', 'pending'],
      ['close', 'pending'],
    ]);
  });

  it('requestSteps — tasdiqda rad: approve qizil, attach kutmoqda', () => {
    const s = requestSteps({ id: 1, status: 'rejected', approval_status: 'rejected' });
    expect(s.map((x) => [x.key, x.state])).toEqual([
      ['approve', 'rejected'],
      ['attach', 'pending'],
      ['trip', 'pending'],
      ['close', 'pending'],
    ]);
  });

  it('requestSteps — avtopark rad etdi; biriktirilgan va yakunlangan', () => {
    expect(requestSteps({ id: 1, status: 'rejected', approval_status: 'approved' })[1]).toEqual({
      key: 'attach',
      state: 'rejected',
    });
    const done = requestSteps({
      id: 1,
      status: 'approved',
      approval_status: 'approved',
      finalized_at: '2026-10-01T10:00:00',
      vehicle: { id: 3, plate_number: '01A123BC' },
    });
    expect(done.map((x) => x.state)).toEqual(['done', 'done', 'done', 'done']);
    expect(done[2]!.hint).toBe('01A123BC');
    expect(requestSteps({ id: 1, status: 'awaiting_approval', approval_status: 'pending' })[0]!.state).toBe('current');
  });

  it("requestActions — qator bayroqlari; biriktirish faqat pending'da; yakunlash mashina bo'lsa", () => {
    const r: VehicleRequest = { id: 1, status: 'approved', can_respond: true, can_approve: true, can_finalize: true };
    expect(requestActions(r)).toEqual({ decide: true, attach: false, finalize: false });
    expect(requestActions({ ...r, status: 'pending', vehicle: { id: 2 } })).toEqual({
      decide: true,
      attach: true,
      finalize: true,
    });
    expect(requestActions({ id: 2, status: 'pending' })).toEqual({ decide: false, attach: false, finalize: false });
  });

  it('requestFigures — haqiqiy raqam taxminiydan ustun', () => {
    expect(requestFigures({ id: 1, distance_km: 100, fuel_cost: 5, actual_distance_km: 120 })).toEqual({
      km: 120,
      cost: 5,
    });
  });

  it('approveBody / respondBody — izoh majburiy; berishda mashina majburiy; birga ketadiganlar faqat berishda', () => {
    expect(approveBody(true, '  ')).toEqual({ ok: false, error: 'vehicles.noteRequired' });
    expect(approveBody(false, ' sabab ')).toEqual({ ok: true, body: { approved: false, note: 'sabab' } });
    expect(respondBody({ approved: true, vehicleId: null, driverId: null, note: 'ok', alsoIds: [] })).toEqual({
      ok: false,
      error: 'vehicles.vehicleRequired',
    });
    expect(respondBody({ approved: true, vehicleId: 3, driverId: 8, note: ' ok ', alsoIds: [5, 6] })).toEqual({
      ok: true,
      body: {
        approved: true,
        vehicle_id: 3,
        assigned_driver_employee_id: 8,
        response_text: 'ok',
        also_request_ids: [5, 6],
      },
    });
    expect(respondBody({ approved: false, vehicleId: 3, driverId: null, note: "yo'q", alsoIds: [5] })).toEqual({
      ok: true,
      body: { approved: false, vehicle_id: null, assigned_driver_employee_id: null, response_text: "yo'q" },
    });
  });

  it("finalizeBody — km ixtiyoriy (GPS), noto'g'ri son rad", () => {
    expect(finalizeBody('', '')).toEqual({ ok: true, body: { actual_distance_km: null, note: null } });
    expect(finalizeBody('125,5', ' izoh ')).toEqual({ ok: true, body: { actual_distance_km: 125.5, note: 'izoh' } });
    expect(finalizeBody('x', '')).toEqual({ ok: false, error: 'vehicles.invalidNumber' });
  });

  it('tanlagichlar — band mashina va bloklangan haydovchi tanlanmaydi, sababi bilan', () => {
    const t = (k: string) => k;
    const v = vehiclePickerOptions(
      [
        { id: 1, plate_number: '01A', model_name: 'Cobalt', is_busy: true },
        {
          id: 2,
          plate_number: '02B',
          model_name: 'Nexia',
          driver: { legal_name: 'Ali' },
          leader: { legal_name: 'Rahbar' },
        },
      ],
      t,
    );
    expect(v[0]).toMatchObject({ value: 1, disabled: true, subLabel: 'vehicles.busyOnDates' });
    expect(v[1]).toMatchObject({ value: 2, disabled: false, subLabel: 'Ali · ⚠ vehicles.leaderCar: Rahbar' });
    const d = driverPickerOptions([
      { id: 7, legal_name: 'Sobir', available: false, block_reason: 'Kasal' },
      { id: 8, legal_name: 'Karim', position: 'Haydovchi', health: { status: 'limited', label: 'Cheklangan' } },
    ]);
    expect(d[0]).toMatchObject({ value: 7, disabled: true, subLabel: '⛔ Kasal' });
    expect(d[1]).toMatchObject({ value: 8, disabled: false, subLabel: 'Haydovchi · ⚠ Cheklangan' });
  });
});

describe('jonli holat (v2 VehicleMap paneli)', () => {
  it("signal yo'q / harakatda / to'xtab turibdi / eski", () => {
    expect(liveStatus(null).key).toBe('vehicles.gpsNoSignal');
    expect(liveStatus({ lat: 41, speed: 40, age_seconds: 30 })).toMatchObject({
      key: 'vehicles.gpsMoving',
      fresh: true,
      speed: 40,
      agoMin: 1,
    });
    expect(liveStatus({ lat: 41, speed: 0, age_seconds: 60 }).key).toBe('vehicles.gpsStopped');
    expect(liveStatus({ lat: 41, speed: 0, age_seconds: 900 })).toMatchObject({ key: 'vehicles.gpsStale', agoMin: 15 });
  });
});

describe('mashina formasi', () => {
  it("seed — tahrirda qiymatlar, yangida bo'sh", () => {
    expect(seedVehicleForm(null).plate_number).toBe('');
    expect(seedVehicleForm({ id: 1, plate_number: '01A', year: 2020, fuel_type_id: 3 })).toMatchObject({
      plate_number: '01A',
      year: '2020',
      fuel_type_id: 3,
    });
  });
  it('buildVehicleBody — raqam va model majburiy, raqam katta harf, sonlar parse', () => {
    const f = seedVehicleForm(null);
    expect(buildVehicleBody(f)).toEqual({ ok: false, error: 'vehicles.plateRequired' });
    expect(buildVehicleBody({ ...f, plate_number: '01a' })).toEqual({ ok: false, error: 'vehicles.modelRequired' });
    expect(buildVehicleBody({ ...f, plate_number: '01a', model_name: 'X', year: 'abc' })).toEqual({
      ok: false,
      error: 'vehicles.invalidNumber',
    });
    // Yil va o'rinlar — butun son (kasr rad etiladi), sarf — kasr bo'lishi mumkin.
    expect(buildVehicleBody({ ...f, plate_number: '01a', model_name: 'X', year: '2020.5' })).toEqual({
      ok: false,
      error: 'vehicles.invalidNumber',
    });
    expect(buildVehicleBody({ ...f, plate_number: '01a', model_name: 'X', seats: '4,5' })).toEqual({
      ok: false,
      error: 'vehicles.invalidNumber',
    });
    expect(buildVehicleBody({ ...f, plate_number: '01a', model_name: 'X', seats: '5' })).toMatchObject({
      ok: true,
      body: { seats: 5 },
    });
    expect(
      buildVehicleBody({
        ...f,
        plate_number: ' 01a123bc ',
        model_name: ' Cobalt ',
        year: '2020',
        fuel_consumption: '8,5',
        driver_employee_id: 4,
      }),
    ).toEqual({
      ok: true,
      body: {
        model_name: 'Cobalt',
        plate_number: '01A123BC',
        color: null,
        year: 2020,
        seats: null,
        fuel_type_id: null,
        fuel_consumption: 8.5,
        gps_device_id: null,
        driver_employee_id: 4,
      },
    });
  });
});

describe("yoqilg'i", () => {
  const fuels: FuelType[] = [
    { id: 1, name: 'AI-92', price: 9000, approval_status: 'approved' },
    { id: 2, name: 'AI-95', price: 11000, approval_status: 'pending' },
    { id: 3, name: 'Dizel', price: 10000, approval_status: 'rejected' },
    { id: 4, name: 'Metan', approval_status: 'pending' },
  ];
  it("isFuelApproved — faqat 'approved' (is_approved maydoni yo'q)", () => {
    expect(isFuelApproved(fuels[0]!)).toBe(true);
    expect(isFuelApproved({ id: 9 })).toBe(false);
  });
  it('filterFuel, pendingFuelCount, fuelBadge — v2 qoidalari', () => {
    expect(filterFuel(fuels, '', 'pending').map((f) => f.id)).toEqual([2, 4]);
    expect(filterFuel(fuels, 'ai', '').map((f) => f.id)).toEqual([1, 2]);
    expect(filterFuel(fuels, '', 'rejected').map((f) => f.id)).toEqual([3]);
    expect(pendingFuelCount(fuels)).toBe(1);
    expect(fuelBadge(fuels[0]!)).toBeNull();
    expect(fuelBadge(fuels[1]!)).toEqual({ key: 'vehicles.notApproved', tone: 'warning' });
    expect(fuelBadge(fuels[2]!)).toEqual({ key: 'vehicles.priceRejected', tone: 'danger' });
  });
  it("buildFuelBody / fuelDecisionBody — nom majburiy; rad etishda izoh majburiy; narx to'g'rilanadi", () => {
    expect(buildFuelBody(' ', 'litr', '')).toEqual({ ok: false, error: 'vehicles.fuelNameRequired' });
    expect(buildFuelBody(' AI-80 ', '', '8 500'.replace(' ', ''))).toEqual({
      ok: true,
      body: { name: 'AI-80', unit: 'litr', price: 8500 },
    });
    expect(fuelDecisionBody(false, '100', ' ')).toEqual({ ok: false, error: 'vehicles.rejectNoteRequired' });
    expect(fuelDecisionBody(false, '100', 'qimmat')).toEqual({
      ok: true,
      body: { approved: false, note: 'qimmat', price: null },
    });
    expect(fuelDecisionBody(true, '9500', '')).toEqual({ ok: true, body: { approved: true, note: null, price: 9500 } });
    expect(fuelDecisionBody(true, '', '')).toEqual({ ok: true, body: { approved: true, note: null, price: null } });
  });
});

describe('tashriflar va doira', () => {
  it("joy yorlig'i: tur → toifa → yo'q", () => {
    expect(placeLabelKey('cafe', 'food')).toBe('vehicles.placeCafe');
    expect(placeLabelKey('unknown', 'food')).toBe('vehicles.catFood');
    expect(placeLabelKey(null, null)).toBeNull();
    expect(categoryLabelKey('own')).toBe('vehicles.catOwn');
  });
  it('visitParams — ixtiyoriylar faqat berilsa', () => {
    const f = { from: '2026-10-01', to: '', vehicleId: null, category: '', minMinutes: 10, includeHabitual: false };
    expect(visitParams(f, 1, 30)).toEqual({
      page: 1,
      size: 30,
      date_from: '2026-10-01',
      date_to: '2026-10-01',
      min_minutes: 10,
    });
    expect(
      visitParams({ ...f, to: '2026-10-03', vehicleId: 4, category: 'food', includeHabitual: true }, 2, 30),
    ).toEqual({
      page: 2,
      size: 30,
      date_from: '2026-10-01',
      date_to: '2026-10-03',
      min_minutes: 10,
      vehicle_id: 4,
      category: 'food',
      include_habitual: true,
    });
  });
  it('scopeKindKey', () => {
    expect(scopeKindKey('employee')).toBe('vehicles.scopeEmployee');
    expect(scopeKindKey('job_position')).toBe('vehicles.scopePosition');
    expect(scopeKindKey('department')).toBe('vehicles.scopeDepartment');
  });
});
