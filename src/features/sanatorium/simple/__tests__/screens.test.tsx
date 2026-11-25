import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { fireEvent, renderWithProviders, waitFor } from '@/test/renderWithProviders';
import SanatoriumHomeScreen from '../../screens/SanatoriumHomeScreen';
import WizardScreen from '../screens/WizardScreen';
import AllSectionsScreen from '../screens/AllSectionsScreen';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}));

const TODAY = {
  date: '2026-11-25',
  counts: { arrival_today: 1, request_new: 1 },
  totals: { arriving: 2, in_house: 30, leaving: 1, free_beds: 12 },
  items: [
    { key: 'req-12', kind: 'request_new', urgency: 'overdue', guest: { id: 9, full_name: 'Karimova Nodira', phone: null }, stay_id: null, request_id: 12, room: null, action: 'accept' },
    { key: 'stay-5', kind: 'arrival_today', urgency: 'today', guest: { id: 1, full_name: 'Aliyev Vali', phone: null }, stay_id: 5, request_id: null, room: { id: 2, number: '204' }, action: 'arrive' },
  ],
};
const OPTIONS = {
  rooms: [{ id: 7, number: '101', building: 'A', capacity: 2, free_beds: 2, price_per_day: '300000.00', ready: true, fits: true }],
  suggested_room_id: 7,
  doctors: [{ staff_id: 3, full_name: 'Dr Ahmedov', specialty: 'Terapevt', cabinet: '12', load: 4, next_slots: ['2026-11-26T10:20:00'] }],
  suggested_doctor_id: 3,
  suggested_exam_at: '2026-11-26T10:20:00',
  nurses: [], suggested_nurse_id: null, diets: [], default_diet_id: null, packages: [],
  exam_required: true, warnings: [],
};
const REQUEST = { id: 12, source: 'bot', status: 'new', full_name: 'Karimova Nodira', birth_date: null, passport: null, phone: '+998901234567', organization_name: null, referral_from: null, referral_to: null, guest_type: 'treatment', note: null, reject_reason: null, guest_id: null, created_at: null };

describe('sanatorium simplified screens', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(() => {
    mockParams = {};
    useAuthStore.setState({ user: { type: 'employee', sanatorium_roles: ['registrar'] } as never, isAuthenticated: true } as never);
    mock.onGet('sanatorium/me').reply(200, { features: {} });
    mock.onGet('sanatorium/setup-status').reply(200, { done: 5, total: 9, items: [{ key: 'rooms', ok: true, severity: 'required' }] });
    mock.onGet('sanatorium/guests').reply(200, { items: [], total: 0 });
  });
  afterEach(() => mock.reset());

  it('queue: shows the grouped cards with one main button and opens the wizard', async () => {
    mock.onGet('sanatorium/today').reply(200, TODAY);
    const { findByTestId, getByText } = await renderWithProviders(<SanatoriumHomeScreen />);
    expect(await findByTestId('today-arrived')).toBeTruthy();
    expect(getByText('Kechikkan (1)')).toBeTruthy();
    expect(getByText('Aliyev Vali')).toBeTruthy();
    expect(await findByTestId('setup-banner')).toBeTruthy();
    fireEvent.press(await findByTestId('queue-act-req-12'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/sanatorium-arrive', params: { request: '12' } });
    fireEvent.press(await findByTestId('queue-act-stay-5'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/sanatorium-arrive', params: { stay: '5' } });
    fireEvent.press(await findByTestId('today-arrived'));
    expect(mockPush).toHaveBeenLastCalledWith('/sanatorium-arrive');
  });

  it('queue: search narrows the cards', async () => {
    mock.onGet('sanatorium/today').reply(200, TODAY);
    const { findByTestId, queryByText } = await renderWithProviders(<SanatoriumHomeScreen />);
    fireEvent.changeText(await findByTestId('today-search'), 'aliyev');
    await waitFor(() => expect(queryByText('Karimova Nodira')).toBeNull());
    expect(queryByText('Aliyev Vali')).toBeTruthy();
  });

  it('404 on the queue: falls back to the classic home (flat links, no wizard button)', async () => {
    mock.onGet('sanatorium/today').reply(404, { detail: 'Not Found' });
    mock.onGet('sanatorium/dashboard').reply(200, { roles: ['registrar'], today: '2026-11-25', stats: { in_house: 3, free_beds: 5, total_beds: 8 } });
    const { findByTestId, queryByTestId } = await renderWithProviders(<SanatoriumHomeScreen />);
    expect(await findByTestId('link-sanatorium-requests')).toBeTruthy();
    expect(queryByTestId('today-arrived')).toBeNull();
  });

  it('wizard: request -> five steps with suggestions -> place -> route sheet and one-time login', async () => {
    mockParams = { request: '12' };
    mock.onGet('sanatorium/requests').reply(200, { items: [REQUEST], total: 1 });
    mock.onGet('sanatorium/arrivals/options').reply(200, OPTIONS);
    mock.onGet('sanatorium/specialties').reply(200, []);
    let body: Record<string, unknown> = {};
    mock.onPost('sanatorium/arrivals').reply((cfg) => {
      body = JSON.parse(cfg.data);
      return [200, {
        stays: [{ id: 31, guest: { id: 9, full_name: 'Karimova Nodira' } }],
        credentials: [{ guest_id: 9, full_name: 'Karimova Nodira', login_code: 'KN1234', password: 'secret-pw' }],
        route_sheet: { steps: [{ key: 'room', done: true, title_uz: 'Xona', text_uz: 'A blok, 101' }, { key: 'doctor', done: false, title_uz: 'Shifokor', person: 'Dr Ahmedov' }] },
      }];
    });
    const { findByTestId, getByTestId, getByText } = await renderWithProviders(<WizardScreen />);
    expect(await findByTestId('wizard-step')).toHaveTextContent(/1-qadam, jami 5/);
    expect(getByTestId('wiz-name-0')).toBeTruthy();
    fireEvent.press(getByTestId('wizard-next')); // who -> room
    await waitFor(() => expect(getByTestId('wizard-step')).toHaveTextContent(/2-qadam/));
    await waitFor(() => expect(getByText(/101/)).toBeTruthy());
    fireEvent.press(getByTestId('wizard-next')); // room -> doctor
    await waitFor(() => expect(getByTestId('wizard-step')).toHaveTextContent(/3-qadam/));
    expect(getByText('Dr Ahmedov')).toBeTruthy();
    fireEvent.press(getByTestId('wizard-next')); // doctor -> meal
    fireEvent.press(await findByTestId('wizard-next')); // meal -> review
    await waitFor(() => expect(getByTestId('wizard-step')).toHaveTextContent(/5-qadam/));
    fireEvent.press(getByTestId('wizard-place'));
    expect(await findByTestId('result-title')).toHaveTextContent(/Mehmon joylashtirildi/);
    expect(getByTestId('result-route')).toBeTruthy();
    expect(getByTestId('result-password-9')).toHaveTextContent('secret-pw');
    expect(body).toMatchObject({ request_id: 12, room_id: 7, doctor_staff_id: 3, exam: { at: '2026-11-26T10:20:00' }, check_in: true, guest_type: 'treatment' });
  }, 30000);

  it('wizard: «Faqat bron» sends check_in false and a server error stays on the review step with its translated text', async () => {
    mockParams = { request: '12' };
    mock.onGet('sanatorium/requests').reply(200, { items: [REQUEST], total: 1 });
    mock.onGet('sanatorium/arrivals/options').reply(200, OPTIONS);
    mock.onPost('sanatorium/arrivals').reply(409, { detail: { code: 'same_room' } });
    const { findByTestId, getByTestId } = await renderWithProviders(<WizardScreen />);
    await findByTestId('wizard-step');
    for (let i = 0; i < 4; i++) {
      fireEvent.press(await findByTestId('wizard-next'));
      await waitFor(() => expect(getByTestId('wizard-step')).toHaveTextContent(new RegExp(`${i + 2}-qadam`)));
    }
    fireEvent.press(getByTestId('wizard-book'));
    expect(await findByTestId('wizard-error')).toHaveTextContent(/allaqachon shu xonada/);
    expect(JSON.parse(mock.history.post[0]!.data).check_in).toBe(false);
  }, 30000);

  it('all sections: four groups for the registrar', async () => {
    const { findByTestId, getByTestId } = await renderWithProviders(<AllSectionsScreen />);
    expect(await findByTestId('section-group-guests')).toBeTruthy();
    for (const g of ['rooms', 'service', 'manage']) expect(getByTestId(`section-group-${g}`)).toBeTruthy();
    expect(getByTestId('link-sanatorium-settings')).toBeTruthy();
  });
});
