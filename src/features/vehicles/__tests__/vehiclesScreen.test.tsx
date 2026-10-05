import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import { confirm } from '@/lib/confirm';
import { __resetToasts, getToasts } from '@/lib/toast';
import i18n from '@/i18n';
import {
  VEHICLE,
  VEHICLE_ACCESS,
  VEHICLE_DRIVER_SCOPES,
  VEHICLE_DRIVERS,
  VEHICLE_FUEL_LOGS,
  VEHICLE_FUEL_TYPE,
  VEHICLE_FUEL_TYPE_APPROVE,
  VEHICLE_FUEL_TYPES,
  VEHICLE_GPS_UNITS,
  VEHICLE_REQUEST_APPROVE,
  VEHICLE_REQUEST_FINALIZE,
  VEHICLE_REQUEST_RESPOND,
  VEHICLE_REQUESTS,
  VEHICLE_VISITS,
  VEHICLES,
} from '@/api/urls';
import VehiclesScreen from '../screens/VehiclesScreen';
import { today } from '../utils/vehicles';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown> | null) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: !!u } as never);
const officer = { id: 1, type: 'employee', employee: { id: 5 }, transport_branch_ids: [29] };
const master = { id: 2, type: 'master-admin', employee: { id: 6 } };

const ACCESS = {
  can_manage: true,
  can_approve: false,
  can_view: true,
  can_request: false,
  provider_branch_id: 29,
  managed_branch_ids: [29],
  approver_branch_ids: [],
  requester_branch_ids: [1],
};

const CARS = [
  {
    id: 1,
    plate_number: '01A123BC',
    model_name: 'Cobalt',
    color: 'Oq',
    seats: 4,
    year: 2021,
    is_active: true,
    gps_device_id: '77',
    fuel_type_id: 2,
    fuel_type_name: 'AI-92',
    driver_employee_id: 9,
    driver: { id: 9, legal_name: 'Karimov S.' },
    driver_position: 'Haydovchi',
  },
  {
    id: 2,
    plate_number: '10517KGA',
    model_name: 'Nexia',
    is_active: true,
    is_busy: true,
    busy_periods: [{ letter_id: 4, end_date: '2026-10-09', employee_name: 'Aliyev Vali' }],
  },
  { id: 3, plate_number: '01B777AA', model_name: 'Damas', is_active: false },
];

const REQ = {
  id: 50,
  status: 'pending',
  approval_status: 'approved',
  can_respond: true,
  can_approve: false,
  can_finalize: false,
  letter_id: 77,
  letter_number: 'B-12',
  employee_name: 'Toshmatov Eshmat',
  employee_position: 'Muhandis',
  department_name: 'IT',
  start_date: '2026-10-10',
  end_date: '2026-10-12',
  regions: ['Samarqand'],
  purpose: 'Audit',
  shared_candidates: [{ request_id: 51, employee_name: 'Hamroh Ali' }],
};

const FUELS = [
  { id: 1, name: 'AI-92', unit: 'litr', price: 9000, approval_status: 'approved' },
  { id: 2, name: 'AI-95', unit: 'litr', price: 11000, approval_status: 'pending' },
];

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, size: 30, pages: 1 });

describe('VehiclesScreen (v2 VehiclesPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockParams = {};
    setUser(officer);
    (confirm as jest.Mock).mockClear();
    (confirm as jest.Mock).mockImplementation(() => Promise.resolve(true));
    (router.push as jest.Mock).mockClear();
    mock.onGet(VEHICLE_ACCESS).reply(200, ACCESS);
    mock.onGet(VEHICLES).reply(200, CARS);
    mock
      .onGet(VEHICLE_REQUESTS)
      .reply((cfg) =>
        cfg.params?.size === 1
          ? [200, { items: [], total: cfg.params.status === 'pending' ? 3 : 2, page: 1, size: 1, pages: 3 }]
          : [200, page([REQ])],
      );
    mock.onGet(VEHICLE_FUEL_TYPES).reply(200, FUELS);
    mock.onGet(VEHICLE_DRIVERS).reply(200, [
      { id: 9, legal_name: 'Karimov Sobir', available: true },
      { id: 10, legal_name: 'Band Haydovchi', available: false, block_reason: 'Safarda' },
    ]);
    mock.onGet(VEHICLE_GPS_UNITS).reply(200, [{ id: 77, name: 'Cobalt trekker' }]);
  });
  afterEach(() => {
    __resetToasts();
    mock.reset();
    setUser(null);
  });

  it("can_view yo'q — ruxsat yo'q holati, ro'yxat so'ralmaydi", async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { ...ACCESS, can_manage: false, can_view: false });
    await renderWithProviders(<VehiclesScreen />);
    expect(await screen.findByText(i18n.t('vehicles.noAccess'))).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === VEHICLES)).toHaveLength(0);
    expect(screen.queryByTestId('vehicles-add')).toBeNull();
  });

  it("operator: tablar (haydovchilarsiz), plitkalar bugungi ro'yxatdan, navbat serverning total'idan; qatorlar", async () => {
    await renderWithProviders(<VehiclesScreen />);
    expect(await screen.findByText('Cobalt')).toBeTruthy();
    const day = today();
    expect(mock.history.get.find((r) => r.url === VEHICLES)!.params).toEqual({ date_from: day, date_to: day });
    expect(screen.getByText(i18n.t('vehicles.tabFuel'))).toBeTruthy();
    expect(screen.getByText(i18n.t('vehicles.tabVisits'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('vehicles.tabDrivers'))).toBeNull();
    await waitFor(() => expect(screen.getByTestId('vehicles-tile-queue')).toHaveTextContent(/5/));
    expect(screen.getByTestId('vehicles-tile-free')).toHaveTextContent(/1/);
    expect(screen.getByTestId('vehicles-tile-inactive')).toHaveTextContent(/1/);
    expect(screen.getByTestId('vehicle-avail-2')).toHaveTextContent('Safarda · 09.10');
    expect(screen.getByText('Aliyev Vali')).toBeTruthy();
    expect(screen.getByTestId('vehicles-count')).toHaveTextContent('3 ta mashina');
    await fireEvent.press(screen.getByTestId('vehicle-row-1'));
    expect(router.push).toHaveBeenCalledWith('/avtomobil?id=1');
  });

  it("plitka filtrni qo'yadi (bugun bo'sh), tozalash qaytaradi", async () => {
    await renderWithProviders(<VehiclesScreen />);
    await screen.findByText('Cobalt');
    await fireEvent.press(screen.getByTestId('vehicles-tile-free'));
    await waitFor(() => expect(screen.queryByText('Nexia')).toBeNull());
    expect(screen.getByText('Cobalt')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicles-filters-reset'));
    expect(await screen.findByText('Nexia')).toBeTruthy();
  });

  it("can_manage yo'q — tahrir/o'chirish va qo'shish tugmasi yo'q; yoqilg'i/tashrif tablari yo'q", async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { ...ACCESS, can_manage: false });
    await renderWithProviders(<VehiclesScreen />);
    await screen.findByText('Cobalt');
    expect(screen.queryByTestId('vehicle-edit-1')).toBeNull();
    expect(screen.queryByTestId('vehicles-add')).toBeNull();
    expect(screen.queryByText(i18n.t('vehicles.tabFuel'))).toBeNull();
    expect(screen.queryByTestId('vehicles-tile-queue')).toBeNull();
  });

  it("o'chirish tasdiq bilan; bekor qilinsa so'rov yo'q", async () => {
    mock.onDelete(VEHICLE(1)).reply(200, {});
    await renderWithProviders(<VehiclesScreen />);
    await screen.findByText('Cobalt');
    (confirm as jest.Mock).mockImplementationOnce(() => Promise.resolve(false));
    await fireEvent.press(screen.getByTestId('vehicle-delete-1'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mock.history.delete).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('vehicle-delete-1'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect((confirm as jest.Mock).mock.calls[1][0]).toMatchObject({ destructive: true });
    await waitFor(() => expect(getToasts().some((x) => x.message === i18n.t('vehicles.removed'))).toBe(true));
  });

  it("qo'shish: majburiy maydonlar, so'ng POST tanasi v2 kabi (raqam katta harf, haydovchi tanlagichdan)", async () => {
    mock.onPost(VEHICLES).reply(200, { id: 9 });
    await renderWithProviders(<VehiclesScreen />);
    await screen.findByText('Cobalt');
    await fireEvent.press(screen.getByTestId('vehicles-add'));
    await fireEvent.press(await screen.findByTestId('vehicle-form-save'));
    expect(await screen.findByText(i18n.t('vehicles.plateRequired'))).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('vehicle-form-plate'), '01x555aa');
    await fireEvent.changeText(screen.getByTestId('vehicle-form-model'), 'Spark');
    await fireEvent.press(screen.getByTestId('vehicle-form-driver'));
    // Band haydovchi tanlanmaydi — sababi bilan ko'rinadi.
    expect(await screen.findByText('⛔ Safarda')).toBeTruthy();
    await fireEvent.press(screen.getByText('Karimov Sobir'));
    await fireEvent.press(screen.getByTestId('vehicle-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      model_name: 'Spark',
      plate_number: '01X555AA',
      color: null,
      year: null,
      seats: null,
      fuel_type_id: null,
      fuel_consumption: null,
      gps_device_id: null,
      driver_employee_id: 9,
    });
  });

  it("so'rovlar: biriktirish — izoh majburiy, band mashina tanlanmaydi, birga ketadiganlar, respond tanasi", async () => {
    mock.onGet(VEHICLES).reply((cfg) =>
      cfg.params?.only_active
        ? [
            200,
            [
              { id: 1, plate_number: '01A123BC', model_name: 'Cobalt' },
              { id: 2, plate_number: '10517KGA', model_name: 'Nexia', is_busy: true },
            ],
          ]
        : [200, CARS],
    );
    mock.onPost(VEHICLE_REQUEST_RESPOND(50)).reply(200, {});
    await renderWithProviders(<VehiclesScreen />);
    await screen.findByText('Cobalt');
    await fireEvent.press(screen.getByText(i18n.t('vehicles.tabRequests')));
    await fireEvent.press(await screen.findByTestId('vehicle-req-50'));
    // Operator (can_approve yo'q) — standart holat «pending».
    expect(mock.history.get.find((r) => r.url === VEHICLE_REQUESTS && r.params?.size === 30)!.params).toEqual({
      status: 'pending',
      page: 1,
      size: 30,
    });
    expect(screen.getByTestId('vehicle-step-approve-done')).toBeTruthy();
    expect(screen.getByTestId('vehicle-step-attach-current')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-req-decide')).toBeNull();
    await fireEvent.press(screen.getByTestId('vehicle-req-attach'));
    await fireEvent.press(screen.getByTestId('vehicle-attach-give'));
    expect(await screen.findByText(i18n.t('vehicles.noteRequired'))).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('vehicle-req-note'), 'Berildi');
    await fireEvent.press(screen.getByTestId('vehicle-attach-give'));
    expect(await screen.findByText(i18n.t('vehicles.vehicleRequired'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-attach-car'));
    expect(await screen.findByText(i18n.t('vehicles.busyOnDates'))).toBeTruthy();
    const carCall = mock.history.get.find((r) => r.url === VEHICLES && r.params?.only_active)!;
    expect(carCall.params).toEqual({
      only_active: true,
      date_from: '2026-10-10',
      date_to: '2026-10-12',
      exclude_letter_id: 77,
    });
    await fireEvent.press(screen.getByText('01A123BC · Cobalt'));
    await fireEvent.press(screen.getByTestId('vehicle-also-51'));
    await fireEvent.press(screen.getByTestId('vehicle-attach-give'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      approved: true,
      vehicle_id: 1,
      assigned_driver_employee_id: null,
      response_text: 'Berildi',
      also_request_ids: [51],
    });
  });

  it("tasdiqlovchi: standart «Tasdiqlash kerak», qaror — avtoparkka o'tkazish (izoh bilan)", async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { ...ACCESS, can_manage: false, can_approve: true });
    mock
      .onGet(VEHICLE_REQUESTS)
      .reply((cfg) =>
        cfg.params?.size === 1
          ? [200, { items: [], total: 0, page: 1, size: 1, pages: 1 }]
          : [
              200,
              page([
                {
                  ...REQ,
                  status: 'awaiting_approval',
                  approval_status: 'pending',
                  can_respond: false,
                  can_approve: true,
                },
              ]),
            ],
      );
    mock.onPost(VEHICLE_REQUEST_APPROVE(50)).reply(200, {});
    mockParams = { tab: 'requests' };
    await renderWithProviders(<VehiclesScreen />);
    await fireEvent.press(await screen.findByTestId('vehicle-req-50'));
    expect(mock.history.get.find((r) => r.url === VEHICLE_REQUESTS && r.params?.size === 30)!.params.status).toBe(
      'awaiting_approval',
    );
    expect(screen.queryByTestId('vehicle-req-attach')).toBeNull();
    await fireEvent.press(screen.getByTestId('vehicle-req-decide'));
    await fireEvent.changeText(screen.getByTestId('vehicle-req-note'), '  Mayli  ');
    await fireEvent.press(screen.getByTestId('vehicle-decide-pass'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ approved: true, note: 'Mayli' });
  });

  it('yakunlash: km ixtiyoriy, finalize tanasi', async () => {
    mock
      .onGet(VEHICLE_REQUESTS)
      .reply((cfg) =>
        cfg.params?.size === 1
          ? [200, { items: [], total: 0, page: 1, size: 1, pages: 1 }]
          : [
              200,
              page([{ ...REQ, status: 'approved', can_finalize: true, vehicle: { id: 1, plate_number: '01A123BC' } }]),
            ],
      );
    mock.onPost(VEHICLE_REQUEST_FINALIZE(50)).reply(200, {});
    mockParams = { tab: 'requests' };
    await renderWithProviders(<VehiclesScreen />);
    await fireEvent.press(await screen.findByTestId('vehicle-req-50'));
    expect(screen.queryByTestId('vehicle-req-attach')).toBeNull();
    await fireEvent.press(screen.getByTestId('vehicle-req-finalize'));
    await fireEvent.changeText(screen.getByTestId('vehicle-finalize-km'), '312');
    await fireEvent.press(screen.getByTestId('vehicle-finalize-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ actual_distance_km: 312, note: null });
  });

  it("yoqilg'i (?tab=fuel): kutilayotgan son, narxni rad etish izohsiz bo'lmaydi; tasdiqlash narx bilan", async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { ...ACCESS, can_manage: false, can_approve: true });
    mock.onPost(VEHICLE_FUEL_TYPE_APPROVE(2)).reply(200, FUELS);
    mockParams = { tab: 'fuel' };
    await renderWithProviders(<VehiclesScreen />);
    expect(await screen.findByText('AI-95')).toBeTruthy();
    expect(screen.getByTestId('vehicles-fuel-filter')).toHaveTextContent(/Tasdiqlanmagan1/);
    expect(screen.queryByTestId('vehicle-fuel-approve-1')).toBeNull();
    expect(screen.queryByTestId('vehicle-fuel-edit-1')).toBeNull();
    expect(screen.queryByTestId('vehicles-fuel-add')).toBeNull();
    await fireEvent.press(screen.getByTestId('vehicle-fuel-approve-2'));
    await fireEvent.press(await screen.findByTestId('fuel-decide-reject'));
    expect(await screen.findByText(i18n.t('vehicles.rejectNoteRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('fuel-decide-price'), '10800');
    await fireEvent.press(screen.getByTestId('fuel-decide-approve'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ approved: true, note: null, price: 10800 });
  });

  it("yoqilg'i: operator qo'shadi va o'chiradi (tasdiq), tarix varag'i", async () => {
    mock.onPost(VEHICLE_FUEL_TYPES).reply(200, FUELS);
    mock.onDelete(VEHICLE_FUEL_TYPE(1)).reply(200, FUELS);
    mock
      .onGet(VEHICLE_FUEL_LOGS)
      .reply(200, [{ id: 1, fuel_name: 'AI-92', action_label: "Narx o'zgardi", old_price: 8500, new_price: 9000 }]);
    mockParams = { tab: 'fuel' };
    await renderWithProviders(<VehiclesScreen />);
    await screen.findByText('AI-95');
    await fireEvent.press(screen.getByTestId('vehicles-fuel-add'));
    await fireEvent.changeText(await screen.findByTestId('fuel-form-name'), 'Metan');
    await fireEvent.press(screen.getByTestId('fuel-unit-m³'));
    await fireEvent.changeText(screen.getByTestId('fuel-form-price'), '4500');
    await fireEvent.press(screen.getByTestId('fuel-form-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ name: 'Metan', unit: 'm³', price: 4500 });
    await fireEvent.press(await screen.findByTestId('vehicle-fuel-delete-1'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    await fireEvent.press(screen.getByTestId('vehicles-fuel-history'));
    expect(await screen.findByText('8 500 → 9 000')).toBeTruthy();
  });

  it("?tab=fuel ruxsatsiz bo'lsa — mashinalar tabi", async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { ...ACCESS, can_manage: false });
    mockParams = { tab: 'fuel' };
    await renderWithProviders(<VehiclesScreen />);
    expect(await screen.findByText('Cobalt')).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === VEHICLE_FUEL_TYPES)).toHaveLength(0);
  });

  it('tashriflar: standart 7 kun, 10 daqiqa; qator mashina profiliga', async () => {
    mock.onGet(VEHICLE_VISITS).reply(200, {
      ...page([
        {
          id: 3,
          day: '2026-10-04',
          start_at: '2026-10-04T12:05:00',
          end_at: '2026-10-04T13:20:00',
          duration_s: 4500,
          place_name: 'Rayhon',
          place_kind: 'cafe',
          place_category: 'food',
          place_distance_m: 25,
          vehicle_id: 2,
          plate_number: '10517KGA',
          vehicle_name: 'Nexia — 10517KGA',
          driver_name: 'Sobir',
          on_trip: true,
        },
      ]),
    });
    mockParams = { tab: 'visits' };
    await renderWithProviders(<VehiclesScreen />);
    expect(await screen.findByText('Rayhon')).toBeTruthy();
    const p = mock.history.get.find((r) => r.url === VEHICLE_VISITS)!.params;
    expect(p).toMatchObject({ page: 1, size: 30, min_minutes: 10, date_to: today() });
    expect(p.include_habitual).toBeUndefined();
    expect(screen.getByText('Kafe · 25 m')).toBeTruthy();
    expect(screen.getByText('04.10.2026 12:05–13:20 · 1 soat 15 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-visit-3'));
    expect(router.push).toHaveBeenCalledWith('/avtomobil?id=2');
  });

  it("haydovchilar tabi faqat sayt bosh adminiga; o'chirish tasdiq bilan", async () => {
    setUser(master);
    mock
      .onGet(VEHICLE_DRIVER_SCOPES)
      .reply(200, [{ id: 4, scope_type: 'job_position', scope_id: 12, label: 'Haydovchi' }]);
    mock.onDelete(`${VEHICLE_DRIVER_SCOPES}/4`).reply(200, []);
    mockParams = { tab: 'drivers' };
    await renderWithProviders(<VehiclesScreen />);
    expect(await screen.findByText('Haydovchi')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-scope-remove-4'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });
});
