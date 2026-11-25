// Staff-side parity screens: setup links, dashboard overview, doctor desk, kitchen, week menu.
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { fireEvent, renderWithProviders, waitFor } from '@/test/renderWithProviders';
import SetupScreen from '../simple/screens/SetupScreen';
import OverviewScreen from '../screens/OverviewScreen';
import DoctorScreen from '../screens/DoctorScreen';
import KitchenScreen from '../screens/KitchenScreen';
import MenuWeekScreen from '../screens/MenuWeekScreen';
import { todayIso } from '../utils/sanatorium';
import { mondayOf } from '../utils/staffParity';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));

const setRoles = (roles: string[], extra: Record<string, unknown> = {}) =>
  useAuthStore.setState({ user: { type: 'employee', sanatorium_roles: roles, ...extra } as never, isAuthenticated: true } as never);

describe('sanatorium staff parity screens', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    mockPush.mockClear();
    await i18n.changeLanguage('uz-Latn');
    mock.onGet('sanatorium/me').reply(200, { features: {} });
  });
  afterEach(() => mock.reset());

  it('setup: every open item opens its screen, the bot token has no link, open required items come first', async () => {
    setRoles(['registrar']);
    mock.onGet('sanatorium/setup-status').reply(200, {
      done: 1, total: 4,
      items: [
        { key: 'rooms', ok: true, severity: 'required', count: 12 },
        { key: 'procedure_rooms', ok: false, severity: 'recommended' },
        { key: 'contacts', ok: false, severity: 'required' },
        { key: 'bot_token', ok: false, severity: 'recommended' },
      ],
    });
    const { findByTestId, queryByTestId } = await renderWithProviders(<SetupScreen />);
    fireEvent.press(await findByTestId('setup-procedure_rooms'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/sanatorium-schedule' });
    fireEvent.press(await findByTestId('setup-contacts'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/sanatorium-settings', params: { tab: 'texts' } });
    mockPush.mockClear();
    fireEvent.press(await findByTestId('setup-bot_token'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(await findByTestId('setup-badge-contacts')).toHaveTextContent('Majburiy');
    expect(queryByTestId('setup-badge-rooms')).toHaveTextContent('Tayyor');
  });

  it('overview: shows only the returned tiles, the occupancy chart with the bed total and the activity feed', async () => {
    setRoles(['registrar']);
    mock.onGet('sanatorium/dashboard').reply(200, {
      roles: ['registrar'], today: '2026-11-25',
      stats: { total_beds: 50, occupied_beds: 20, free_beds: 30, in_house: 18, new_requests: 3, debt_total: '1500000.00' },
      occupancy_week: [{ date: '2026-11-25', occupied: 20 }, { date: '2026-11-26', occupied: 25 }],
      in_house_by_type: { treatment: 10, rest: 8 },
      recent_events: [{ id: 5, kind: 'checked_in', title: 'Joylashtirildi', created_at: '2026-11-25T10:00:00', guest_id: 7, guest_name: 'Aliyev Vali' }],
    });
    const { findByTestId, queryByTestId, getByText } = await renderWithProviders(<OverviewScreen />);
    expect(await findByTestId('tile-occupied_beds')).toBeTruthy();
    expect(getByText('20 / 50')).toBeTruthy();
    expect(queryByTestId('tile-meals_today')).toBeNull();
    expect(queryByTestId('tile-appointments_today')).toBeNull();
    expect(await findByTestId('dash-occupancy-chart-ref')).toBeTruthy();
    expect(await findByTestId('dash-by-type')).toBeTruthy();
    fireEvent.press(await findByTestId('dash-event-guest-5'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/sanatorium-guest', params: { id: '7' } });
    fireEvent.press(await findByTestId('tile-new_requests'));
    expect(mockPush).toHaveBeenLastCalledWith('/sanatorium-requests');
  });

  it('doctor desk: row shows duration + referral note, finish needs a field and sends nulls', async () => {
    setRoles(['doctor']);
    mock.onGet('sanatorium/appointments').reply(200, [
      { id: 2, stay_id: 1, guest_id: 9, scheduled_at: '2026-11-25T11:00:00', duration_min: 30, status: 'scheduled', specialty: 'Terapevt', referral_note: 'Yo\'llanma izohi', guest: { id: 9, full_name: 'Karimova N' } },
      { id: 1, stay_id: 1, guest_id: 8, scheduled_at: '2026-11-25T09:00:00', duration_min: 20, status: 'done', diagnosis: 'Gastrit', recommendation: 'Parhez', guest: { id: 8, full_name: 'Aliyev V' } },
    ]);
    mock.onPost('sanatorium/appointments/2/finish').reply(200, {});
    const { findByTestId, getByTestId, queryByTestId } = await renderWithProviders(<DoctorScreen />);
    expect(await findByTestId('appt-2')).toHaveTextContent(/30 daq/);
    expect(getByTestId('appt-note-2')).toHaveTextContent("Yo'llanma izohi");
    expect(getByTestId('appt-findings-1')).toHaveTextContent(/Gastrit/);
    // A finished appointment has no «finish» button; the other quick actions stay.
    expect(queryByTestId('appt-finish-1')).toBeNull();
    expect(getByTestId('appt-history-1')).toBeTruthy();
    expect(getByTestId('appt-refer-2')).toBeTruthy();
    expect(getByTestId('appt-proc-2')).toBeTruthy();
    fireEvent.press(getByTestId('appt-finish-2'));
    const save = await findByTestId('finish-save');
    fireEvent.press(save);
    expect(mock.history.post).toHaveLength(0);
    fireEvent.changeText(getByTestId('finish-diagnosis'), '  Gastrit  ');
    fireEvent.press(await findByTestId('finish-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ complaint: null, diagnosis: 'Gastrit', recommendation: null });
  });

  it('kitchen: the registrar opens it; today tab has the eating counter, child badge, diet and allergies', async () => {
    setRoles(['registrar']);
    mock.onGet('sanatorium/stays').reply(200, { items: [], total: 0 });
    mock.onGet('sanatorium/kitchen/counts').reply(200, { start: todayIso(), days: [], early_leaves: [] });
    mock.onGet('sanatorium/kitchen/day').reply(200, [
      { stay_id: 1, guest: { id: 1, full_name: 'Aliyev Vali' }, room: '204', diet_note: 'tuzsiz', diet_id: 3, diet_code: '5', allergies: 'yong\'oq', status: 'checked_in', is_child: false },
      { stay_id: 2, guest: { id: 2, full_name: 'Aliyev Bobur' }, room: '204', diet_note: null, status: 'checked_in', is_child: true },
      { stay_id: 3, guest: { id: 3, full_name: 'Zokirov' }, room: '305', diet_note: null, status: 'checked_in', is_child: false },
    ]);
    mock.onGet('sanatorium/diets').reply(200, [{ id: 3, code: '5', name_uz: 'Parhez 5', name_ru: 'Стол 5', name_en: null, description: null, sort_order: 1, is_active: true }]);
    const { findByTestId, findByText, getByTestId, queryByTestId } = await renderWithProviders(<KitchenScreen />);
    fireEvent.press(await findByText('Bugun ovqatlanadi'));
    expect(await findByTestId('kitchen-today')).toBeTruthy();
    expect(await findByTestId('kitchen-eating-count')).toHaveTextContent('3 kishi ovqatlanadi');
    expect(getByTestId('eat-child-2')).toBeTruthy();
    expect(getByTestId('eat-diet-1')).toHaveTextContent('Parhez 5, tuzsiz');
    expect(getByTestId('eat-allergy-1')).toHaveTextContent(/yong'oq/);
    fireEvent.changeText(getByTestId('kitchen-search'), 'zok');
    await waitFor(() => expect(queryByTestId('eat-1')).toBeNull());
    expect(getByTestId('kitchen-eating-count')).toHaveTextContent(/^1 kishi/);
  });

  it('week menu: the registrar edits Monday-aligned weeks; the chairman only reads', async () => {
    setRoles(['registrar']);
    mock.onGet('sanatorium/menu').reply(200, []);
    const first = await renderWithProviders(<MenuWeekScreen />);
    expect(await first.findByTestId('week-save')).toBeTruthy();
    const monday = mondayOf(todayIso());
    expect(mock.history.get.find((r) => r.url === 'sanatorium/menu')!.params).toMatchObject({ start: monday, days: 7 });
    expect(first.getByTestId(`week-${monday}`)).toBeTruthy();
    first.unmount();
    setRoles(['registrar'], { sanatorium_read_only: true });
    const second = await renderWithProviders(<MenuWeekScreen />);
    expect(await second.findByTestId(`week-${monday}`)).toBeTruthy();
    expect(second.queryByTestId('week-save')).toBeNull();
  });
});
