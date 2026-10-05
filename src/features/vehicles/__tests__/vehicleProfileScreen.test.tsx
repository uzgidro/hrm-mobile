import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { fireEvent, renderWithProviders, screen, waitFor, within } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { VEHICLE, VEHICLE_ACCESS, VEHICLE_LIVE, VEHICLE_TRIPS } from '@/api/urls';
import VehicleProfileScreen from '../screens/VehicleProfileScreen';

let mockParams: Record<string, string> = { id: '1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));

const ACCESS = {
  can_manage: true,
  can_approve: false,
  can_view: true,
  can_request: false,
  provider_branch_id: 29,
  managed_branch_ids: [29],
  approver_branch_ids: [],
  requester_branch_ids: [],
};

const CAR = {
  id: 1,
  plate_number: '01A123BC',
  model_name: 'Cobalt',
  color: 'Oq',
  year: 2021,
  seats: 4,
  fuel_type_name: 'AI-92',
  fuel_unit: 'litr',
  fuel_consumption: 12,
  fuel_price: 9000,
  gps_device_id: '77',
  is_active: false,
  driver: { id: 9, legal_name: 'Karimov Sobir' },
  driver_position: 'Haydovchi',
  driver_phone: '+998901234567',
  driver_health: { label: 'Cheklangan', status: 'limited', blocking: false },
  leader: { id: 3, legal_name: 'Rahbarov Bek' },
  stats: {
    trip_count: 7,
    finalized_count: 5,
    total_distance_km: 8450.5,
    total_fuel_liters: 1200.4,
    total_fuel_cost: 1800000,
    last_trip_date: '2026-09-30',
  },
};

const TRIPS = [
  {
    request_id: 11,
    letter_id: 40,
    letter_number: 'B-40',
    start_date: '2026-09-28',
    end_date: '2026-09-30',
    employee_name: 'Aliyev Vali',
    driver_name: 'Karimov Sobir',
    regions: ['Buxoro'],
    destination_names: ['Buxoro filiali'],
    distance_km: 600,
    actual_distance_km: 640,
    fuel_cost: 450000,
  },
];

describe('VehicleProfileScreen (v2 VehicleProfilePage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockParams = { id: '1' };
    mock.onGet(VEHICLE_ACCESS).reply(200, ACCESS);
    mock.onGet(VEHICLE(1)).reply(200, CAR);
    mock.onGet(VEHICLE_TRIPS(1)).reply(200, TRIPS);
    mock.onGet(VEHICLE_LIVE(1)).reply(200, { lat: 41.3, lon: 69.2, speed: 54, age_seconds: 120 });
  });
  afterEach(() => mock.reset());

  it("tavsif, ta'mir ogohlantirishi, statistika, haydovchi (sog'liq), safarlar tarixi", async () => {
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByText('01A123BC · Cobalt')).toBeTruthy();
    expect(screen.getByText(i18n.t('vehicles.inRepair'))).toBeTruthy();
    expect(screen.getByTestId('vehicle-stat-trips')).toHaveTextContent(/7/);
    expect(screen.getByText('1 800 000')).toBeTruthy();
    expect(screen.getByText('Haydovchi · +998901234567')).toBeTruthy();
    expect(screen.getByText('Cheklangan')).toBeTruthy();
    expect(screen.getByText("9 000 so'm / litr")).toBeTruthy();
    expect(screen.getByText('Rahbarov Bek')).toBeTruthy();
    expect(await screen.findByText('B-40')).toBeTruthy();
    expect(screen.getByText('640 km · aniq')).toBeTruthy();
    expect(screen.getByText('Buxoro filiali, Buxoro')).toBeTruthy();
    expect(screen.getByText(i18n.t('vehicles.lastTrip', { date: '30.09.2026' }))).toBeTruthy();
    // Masofa/litr — minglar ajratilgan, birlik lug'atdan (plitkaga sig'adigan ko'rinish).
    expect(screen.getByText('8 451')).toBeTruthy();
    expect(screen.getByText('1 200')).toBeTruthy();
    expect(screen.getByText('12 km/l')).toBeTruthy();
    // Davlat raqami — faqat plastinkada (takroriy qator yo'q).
    expect(screen.queryByText(i18n.t('vehicles.plate'))).toBeNull();
  });

  it("ruscha birliklar; safarlar tarixi 30 tadan — «yana ko'rsatish»", async () => {
    await i18n.changeLanguage('ru');
    mock.onGet(VEHICLE_TRIPS(1)).reply(
      200,
      Array.from({ length: 45 }, (_, i) => ({ ...TRIPS[0], request_id: 100 + i, letter_number: `B-${100 + i}` })),
    );
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByTestId('vehicle-trip-129')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-trip-130')).toBeNull();
    expect(
      within(screen.getByTestId('vehicle-trip-100')).getByText('640 км · ' + i18n.t('vehicles.actual')),
    ).toBeTruthy();
    expect(await screen.findByTestId('vehicle-live')).toHaveTextContent(/54 км\/ч/);
    await fireEvent.press(screen.getByTestId('vehicle-trips-more'));
    expect(screen.getByTestId('vehicle-trip-144')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-trips-more')).toBeNull();
  });

  it('signal hozirgina kelgan — «0 daqiqa oldin» emas', async () => {
    mock.onGet(VEHICLE_LIVE(1)).reply(200, { lat: 41.3, lon: 69.2, speed: 0, age_seconds: 20 });
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByTestId('vehicle-live')).toHaveTextContent(
      new RegExp(`${i18n.t('vehicles.gpsJustNow')}$`),
    );
  });

  it('operator + GPS — jonli holat matni (harakatda, tezlik, necha daqiqa oldin)', async () => {
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByTestId('vehicle-live')).toHaveTextContent('Harakatda · 54 km/h · 2 daqiqa oldin');
  });

  it("oddiy ko'ruvchi — jonli so'rov yuborilmaydi, «faqat mas'ulga» izohi", async () => {
    mock.onGet(VEHICLE_ACCESS).reply(200, { ...ACCESS, can_manage: false });
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByText(i18n.t('vehicles.gpsManagerOnly'))).toBeTruthy();
    await waitFor(() => expect(mock.history.get.some((r) => r.url === VEHICLE_ACCESS)).toBe(true));
    expect(mock.history.get.filter((r) => r.url === VEHICLE_LIVE(1))).toHaveLength(0);
  });

  it("trekker javob bermasa — «ulanib bo'lmadi»", async () => {
    mock.onGet(VEHICLE_LIVE(1)).reply(502, {});
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByText(i18n.t('vehicles.gpsUnreachable'))).toBeTruthy();
  });

  it("id yaroqsiz — «Mashina topilmadi», so'rov yo'q", async () => {
    mockParams = {};
    await renderWithProviders(<VehicleProfileScreen />);
    expect(await screen.findByText(i18n.t('vehicles.notFound'))).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === VEHICLE(0))).toHaveLength(0);
  });
});
