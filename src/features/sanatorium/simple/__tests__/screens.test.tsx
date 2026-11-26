import React from 'react';
import dayjs from 'dayjs';
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
    { key: 'stay-5', kind: 'arrival_today', urgency: 'today', guest: { id: 1, full_name: 'Aliyev Vali', phone: null }, stay_id: 5, request_id: null, room: { id: 2, number: '204' }, action: 'arrive', missing: ['doctor'] },
  ],
};
const DAY = (n: number) => dayjs().add(n, 'day').format('YYYY-MM-DD');
const PREFILL = { source: 'request', request_id: 12, stay_ids: [], start: DAY(0), end: DAY(10), guest_type: 'treatment', party_size: 1, members: [{ full_name: 'Karimova Nodira', phone: '+998901234567' }] };
const OPTIONS = {
  prefill: PREFILL,
  rooms: [{ id: 7, number: '101', building: 'A', capacity: 2, free_beds: 2, price_per_day: '300000.00', ready: true, fits: true }],
  suggested_room_id: 7,
  doctors: [{ staff_id: 3, full_name: 'Dr Ahmedov', specialty: 'Terapevt', cabinet: '12', load: 4, next_slots: ['2026-11-26T10:20:00'] }],
  suggested_doctor_id: 3,
  suggested_exam_at: '2026-11-26T10:20:00',
  nurses: [], suggested_nurse_id: null, diets: [], default_diet_id: null, packages: [],
  exam_required: true, warnings: [],
};

const posted = (m: MockAdapter, url: string) => m.history.post.filter((r) => r.url === url);

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

  it('queue: a family card opens the wizard for all its stays; an unknown kind and action never crash the list', async () => {
    const family = { key: 'g-1', kind: 'arrival_today', urgency: 'today', guest: { id: 1, full_name: 'Aliyev Vali', phone: null }, stay_id: 5, request_id: null, group_key: 'g', group_size: 2, missing: [], members: [{ stay_id: 5, guest_id: 1, full_name: 'Aliyev Vali' }, { stay_id: 6, guest_id: 2, full_name: 'Aliyeva Zarina' }], room: null, action: 'arrive' };
    const future = { key: 'x-1', kind: 'brand_new_kind', urgency: 'some_day', guest: null, stay_id: 77, request_id: null, room: null, action: 'teleport', title_params: { name: 'Kelajak' } };
    mock.onGet('sanatorium/today').reply(200, { ...TODAY, items: [family, future] });
    const { findByTestId, getByText } = await renderWithProviders(<SanatoriumHomeScreen />);
    fireEvent.press(await findByTestId('queue-act-g-1'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/sanatorium-arrive', params: { stay: '5,6' } });
    expect(getByText('Kelajak')).toBeTruthy();
    fireEvent.press(await findByTestId('queue-act-x-1'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/sanatorium-stay', params: { id: '77' } });
  });

  it('queue: a guest who left with a debt gets the payment sheet, the whole debt in one tap', async () => {
    const left = { key: 'dl-1', kind: 'debt_left', urgency: 'soon', guest: { id: 1, full_name: 'Qarzdor Vali', phone: null }, stay_id: 9, request_id: null, group_size: 1, members: [{ stay_id: 9, guest_id: 1, full_name: 'Qarzdor Vali' }], room: null, debt: '150000.00', action: 'take_payment', alt_action: null };
    mock.onGet('sanatorium/today').reply(200, { ...TODAY, items: [left] });
    mock.onGet('sanatorium/stays/9').reply(200, { id: 9, status: 'checked_out', debt: '150000.00', paid_amount: '0.00' });
    mock.onPost('sanatorium/stays/9/payments').reply(200, { stay: { id: 9 }, stays: [], warnings: [] });
    const { findByTestId, queryByTestId } = await renderWithProviders(<SanatoriumHomeScreen />);
    fireEvent.press(await findByTestId('queue-act-dl-1'));
    fireEvent.press(await findByTestId('pay-all'));
    fireEvent.press(await findByTestId('payment-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toMatchObject({ amount: '150000' });
    expect(JSON.parse(mock.history.post[0]!.data).client_ref).toBeTruthy();
    await waitFor(() => expect(queryByTestId('payment-add-sheet')).toBeNull());
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
    expect(await findByTestId('wizard-title')).toHaveTextContent(/Kim keldi/);
    expect(getByText('Karimova Nodira')).toBeTruthy();
    fireEvent.press(getByTestId('wizard-next')); // who -> room
    expect(await findByTestId('room-101')).toBeTruthy();
    fireEvent.press(getByTestId('wizard-next')); // room -> doctor
    expect(await findByTestId('doctor-3')).toBeTruthy();
    expect(getByText('Dr Ahmedov')).toBeTruthy();
    fireEvent.press(getByTestId('wizard-next')); // doctor -> meals
    expect(await findByTestId('meals-yes')).toBeTruthy();
    fireEvent.press(getByTestId('wizard-next')); // meals -> review
    fireEvent.press(await findByTestId('wizard-finish'));
    expect(await findByTestId('result-title')).toHaveTextContent(/Mehmon joylashtirildi/);
    expect(getByTestId('result-route')).toBeTruthy();
    expect(getByTestId('result-password-9')).toHaveTextContent('secret-pw');
    expect(body).toMatchObject({ request_id: 12, room_id: 7, doctor_staff_id: 3, check_in: true, guest_type: 'treatment' });
    expect(body.member_exams).toEqual([{ index: 0, at: '2026-11-26T10:20:00', doctor_staff_id: 3 }]);
  }, 30000);

  it('wizard: «Faqat bron» sends check_in false and a server error stays on the review step with its translated text', async () => {
    mockParams = { request: '12' };
    mock.onGet('sanatorium/arrivals/options').reply(200, OPTIONS);
    mock.onPost('sanatorium/arrivals').reply(409, { detail: { code: 'same_room' } });
    const { findByTestId, getByTestId } = await renderWithProviders(<WizardScreen />);
    await findByTestId('wizard-title');
    for (const next of ['room-list', 'doctor-3', 'meals-yes', 'wiz-review']) {
      fireEvent.press(getByTestId('wizard-next'));
      await findByTestId(next);
    }
    fireEvent.press(getByTestId('wizard-book'));
    expect(await findByTestId('wizard-error')).toHaveTextContent(/allaqachon shu xonada/);
    expect(JSON.parse(posted(mock, 'sanatorium/arrivals')[0]!.data).check_in).toBe(false);
  }, 30000);

  it('wizard: a booked family with its own rooms opens on the review and two people settle in one press', async () => {
    mockParams = { stay: '5' };
    const prefill = { source: 'stay', request_id: null, stay_ids: [5, 6], group_key: 'g', start: PREFILL.start, end: PREFILL.end, guest_type: 'rest', party_size: 2, room_id: null, with_meals: true,
      members: [{ stay_id: 5, guest_id: 1, full_name: 'Aliyev Vali', room_id: 7, room_number: '101' }, { stay_id: 6, guest_id: 2, full_name: 'Aliyeva Zarina', room_id: 8, room_number: '102' }] };
    mock.onGet('sanatorium/arrivals/options').reply(200, { ...OPTIONS, prefill, rooms_assigned: true, doctors: [], suggested_doctor_id: null, exam_required: false });
    mock.onGet(/sanatorium\/stays\/\d+$/).reply(200, { id: 5, debt: '0.00' });
    mock.onPost('sanatorium/arrivals').reply(200, { stays: [{ id: 5 }, { id: 6 }], route_sheet: { steps: [] } });
    const { findByTestId, getByTestId, queryByTestId } = await renderWithProviders(<WizardScreen />);
    expect(await findByTestId('rev-room')).toHaveTextContent(/102-xona/);
    expect(queryByTestId('wizard-next')).toBeNull();
    fireEvent.press(getByTestId('wizard-finish'));
    await waitFor(() => expect(posted(mock, 'sanatorium/arrivals')).toHaveLength(1));
    const sent = JSON.parse(posted(mock, 'sanatorium/arrivals')[0]!.data);
    expect(sent).toMatchObject({ stay_ids: [5, 6], check_in: true });
    expect(sent.room_id).toBeUndefined();
    expect(sent.members).toBeUndefined();
  }, 30000);

  it('wizard: a repeated press (duplicate_submit) shows what was created, without passwords', async () => {
    mockParams = { request: '12' };
    mock.onGet('sanatorium/arrivals/options').reply(200, OPTIONS);
    mock.onPost('sanatorium/arrivals').reply(409, { detail: { code: 'duplicate_submit', params: { stay_ids: [31] } } });
    mock.onGet('sanatorium/stays/31').reply(200, { id: 31, status: 'checked_in', guest: { id: 9, full_name: 'Karimova Nodira' }, planned_from: PREFILL.start, planned_to: PREFILL.end });
    mock.onGet('sanatorium/stays/31/route-sheet').reply(200, { stay_id: 31, steps: [] });
    const { findByTestId, getByTestId } = await renderWithProviders(<WizardScreen />);
    await findByTestId('wizard-title');
    for (const next of ['room-list', 'doctor-3', 'meals-yes', 'wiz-review']) {
      fireEvent.press(getByTestId('wizard-next'));
      await findByTestId(next);
    }
    fireEvent.press(getByTestId('wizard-finish'));
    expect(await findByTestId('replayed')).toBeTruthy();
    expect(getByTestId('replayed-9')).toBeTruthy();
  }, 30000);

  it('all sections: four groups for the registrar', async () => {
    const { findByTestId, getByTestId } = await renderWithProviders(<AllSectionsScreen />);
    expect(await findByTestId('section-group-guests')).toBeTruthy();
    for (const g of ['rooms', 'service', 'manage']) expect(getByTestId(`section-group-${g}`)).toBeTruthy();
    expect(getByTestId('link-sanatorium-settings')).toBeTruthy();
  });
});
