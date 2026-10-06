import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { MOBILE_CHECKINS, MOBILE_CHECKINS_ME, MOBILE_CHECKINS_ME_STATUS } from '@/api/urls';
import { TripCheckinCard, nextDirection } from '../components/TripCheckinCard';
import CheckinScreen from '../screens/CheckinScreen';
import HrCheckinsScreen from '../screens/HrCheckinsScreen';
import type { MobileCheckin } from '../types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (p: object) => require('react').createElement(View, p) };
});
jest.mock('@/lib/formDraft', () => ({
  loadDraft: jest.fn(async () => null),
  saveDraft: jest.fn(async () => undefined),
  clearDraft: jest.fn(async () => undefined),
}));
jest.mock('../lib/capture', () => {
  const actual = jest.requireActual('../lib/capture');
  return {
    ...actual,
    takeCheckinPhoto: jest.fn(async () => ({ uri: 'file:///p.jpg', base64: 'data:image/jpeg;base64,QUJD', width: 960, height: 1280 })),
    getCheckinLocation: jest.fn(async () => ({ latitude: 41.3, longitude: 69.28, accuracy_m: 8, fromCache: false })),
  };
});

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const emp = { id: 1, type: 'employee', employee: { id: 5 } };
const hr = { id: 2, type: 'employee', employee: { id: 6, is_multi_org_user: true, multi_org_employee_role: 'hr' } };

const TRIP = {
  work_leave_id: 77,
  start_date: '2026-10-06T00:00:00',
  end_date: '2026-10-08T23:59:59',
  destination_branch: { id: 9, name: 'Chorvoq GES' },
  destination_locations: [{ id: 1, name: 'Chorvoq GES', latitude: 41.6, longitude: 70.0 }],
};
const status = (extra: Record<string, unknown> = {}) => ({
  day: '2026-10-06',
  can_check_in: true,
  reason: null,
  trip: TRIP,
  far_distance_m: 1000,
  today: [],
  ...extra,
});
const ck = (id: number, extra: Partial<MobileCheckin> = {}): MobileCheckin => ({
  id,
  employee_id: 5,
  direction_type: 'entrance',
  happen_time: '2026-10-06T09:05:00',
  received_at: '2026-10-06T09:05:02',
  latitude: 41.3,
  longitude: 69.28,
  distance_m: 120,
  is_far: false,
  map_url: 'https://maps.google.com/?q=41.3,69.28',
  status: 'active',
  ...extra,
});

describe('mobil «Keldim»', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockPush.mockClear();
  });
  afterEach(() => mock.reset());

  it('nextDirection: oxirgi faol belgi «Keldim» bo\'lsa «Ketdim»; bekor qilingani hisobga olinmaydi', () => {
    expect(nextDirection([])).toBe('entrance');
    expect(nextDirection([ck(1)])).toBe('exit');
    expect(nextDirection([ck(1), ck(2, { direction_type: 'exit', happen_time: '2026-10-06T18:00:00' })])).toBe('entrance');
    expect(nextDirection([ck(1, { status: 'cancelled' })])).toBe('entrance');
  });

  it('bosh sahifa kartasi: safar kuni — manzil va «Keldim» tugmasi; bosilsa /keldim', async () => {
    setUser(emp);
    mock.onGet(MOBILE_CHECKINS_ME_STATUS).reply(200, status());
    await renderWithProviders(<TripCheckinCard />);
    expect(await screen.findByText('Chorvoq GES')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('trip-checkin-button'));
    expect(mockPush).toHaveBeenCalledWith('/keldim?dir=entrance');
  });

  it('bosh sahifa kartasi: safar yo\'q va belgi yo\'q — umuman chizilmaydi', async () => {
    setUser(emp);
    mock.onGet(MOBILE_CHECKINS_ME_STATUS).reply(200, status({ can_check_in: false, reason: 'no_active_business_trip', trip: null }));
    await renderWithProviders(<TripCheckinCard />);
    await waitFor(() => expect(mock.history.get.length).toBeGreaterThan(0));
    expect(screen.queryByTestId('trip-checkin-card')).toBeNull();
  });

  it('xodim kartasi yo\'q hisob — so\'rov ham yuborilmaydi', async () => {
    setUser({ id: 3, type: 'admin' });
    await renderWithProviders(<TripCheckinCard />);
    expect(mock.history.get.filter((r) => r.url === MOBILE_CHECKINS_ME_STATUS)).toHaveLength(0);
  });

  it('ekran: joylashuv AVTOMATIK, surat faqat tugmadan; yuborilgan tana shartnoma bo\'yicha', async () => {
    setUser(emp);
    mock.onGet(MOBILE_CHECKINS_ME_STATUS).reply(200, status());
    mock.onGet(MOBILE_CHECKINS_ME).reply(200, { items: [], total: 0, pages: 1 });
    mock.onPost(MOBILE_CHECKINS).reply(200, ck(10, { distance_m: 45000, is_far: true }));
    await renderWithProviders(<CheckinScreen />);
    // Joylashuv o'zi aniqlanadi (tugma bosilmasdan).
    expect(await screen.findByTestId('checkin-location-ready')).toBeTruthy();
    expect(screen.getByTestId('checkin-far-warning')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('checkin-take-photo'));
    expect(await screen.findByTestId('checkin-photo')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('checkin-submit'));
    expect(await screen.findByTestId('checkin-success')).toBeTruthy();
    const sent = JSON.parse(mock.history.post[0].data);
    expect(sent).toMatchObject({ latitude: 41.3, longitude: 69.28, accuracy_m: 8, direction: 'entrance' });
    expect(sent.client_uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof sent.captured_at).toBe('string');
  });

  it('ekran: safar yo\'q — tushuntirish, forma yo\'q', async () => {
    setUser(emp);
    mock.onGet(MOBILE_CHECKINS_ME_STATUS).reply(200, status({ can_check_in: false, trip: null }));
    mock.onGet(MOBILE_CHECKINS_ME).reply(200, { items: [ck(3, { status: 'cancelled', cancel_reason: 'Noto\'g\'ri joy' })], total: 1, pages: 1 });
    await renderWithProviders(<CheckinScreen />);
    expect(await screen.findByText("Bugun xizmat safari yo'q")).toBeTruthy();
    expect(screen.queryByTestId('checkin-submit')).toBeNull();
    expect(await screen.findByText(/Noto'g'ri joy/)).toBeTruthy();
  });

  it('kadr: ro\'yxat filtrlari serverga, tafsilotdan sabab bilan bekor qilish', async () => {
    setUser(hr);
    const row = ck(21, { employee: { id: 5, legal_name: 'Karimov Vali' }, is_far: true, distance_m: 3200 });
    mock.onGet(MOBILE_CHECKINS).reply(200, { items: [row], total: 1, pages: 1 });
    mock.onGet(`${MOBILE_CHECKINS}/21`).reply(200, row);
    mock.onPost(`${MOBILE_CHECKINS}/21/cancel`).reply(200, { ...row, status: 'cancelled' });
    await renderWithProviders(<HrCheckinsScreen />);
    expect(await screen.findByText(/Karimov Vali/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('hr-checkins-far'));
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === MOBILE_CHECKINS).at(-1)?.params).toMatchObject({ far_only: true }),
    );
    await fireEvent.press(screen.getByTestId('checkin-row-21'));
    await fireEvent.press(await screen.findByTestId('hr-checkin-cancel'));
    await fireEvent.changeText(screen.getByTestId('hr-checkin-cancel-reason'), 'ab');
    await fireEvent.press(screen.getByTestId('hr-checkin-cancel-confirm'));
    expect(await screen.findByText("Sabab kamida 3 ta belgidan iborat bo'lsin")).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await fireEvent.changeText(screen.getByTestId('hr-checkin-cancel-reason'), 'Boshqa joydan belgilagan');
    await fireEvent.press(screen.getByTestId('hr-checkin-cancel-confirm'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ reason: 'Boshqa joydan belgilagan' });
  });
});
