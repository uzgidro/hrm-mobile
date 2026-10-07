// 2026-10-07: «Jonli tashrifni ustiga bosib batafsil ko'radigan, eventdagi rasmi va scroll qilib
// boshqa eventlarni ham ko'radigan qilish kerak».
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { TURNSTILE_DAY_BOARD } from '@/api/urls';
import LiveFeedScreen from '../screens/LiveFeedScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true }, useLocalSearchParams: () => ({}) }));

const board = {
  day: '2026-10-07', entries: 2, exits: 1, total: 3, max_id: 3, people: [],
  latest: [3, 2, 1],
  events: [
    { id: 1, employee_id: 10, turnstile_id: 5, happen_time: '2026-10-07T08:55:00', direction_type: 'entrance', photo_path: 'https://x/snap1.jpg', photo_thumb_path: 'https://x/snap1_t.png' },
    { id: 2, employee_id: 11, turnstile_id: 5, happen_time: '2026-10-07T09:10:00', direction_type: 'entrance', photo_path: null },
    { id: 3, employee_id: 10, turnstile_id: 5, happen_time: '2026-10-07T13:02:00', direction_type: 'exit', photo_path: 'https://x/snap3.jpg' },
  ],
  employees: [
    { id: 10, legal_name: "G'ofurov Anvar", job_position: { id: 1, name: 'Muhandis' } },
    { id: 11, legal_name: 'Karimova Dilnoza', job_position: { id: 2, name: 'Buxgalter' } },
  ],
  turnstiles: [{ id: 5, acs_dev_name: 'Bosh kirish' }],
};

describe('«Jonli tashrif» ekrani', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({ user: { id: 1, type: 'employee', employee: { id: 99, primary_organization_branch_id: 1 } } as never, isAuthenticated: true } as never);
    mock.onGet(TURNSTILE_DAY_BOARD).reply(200, board);
  });
  afterEach(() => mock.reset());

  it("butun kun (latest=-1), filtr, kirill qidiruv, bosilganda o'tish surati bilan tafsilot", async () => {
    await renderWithProviders(<LiveFeedScreen />);
    expect(await screen.findByTestId('live-event-3')).toBeTruthy();
    expect(mock.history.get[0].params).toMatchObject({ latest: -1, organization_branch_id: 1, include_cross_branch: true });
    expect(screen.getByTestId('feed-entries')).toHaveTextContent('2');

    await fireEvent.press(screen.getByText('Chiqish'));
    expect(screen.queryByTestId('live-event-1')).toBeNull();
    expect(screen.getByTestId('live-event-3')).toBeTruthy();
    await fireEvent.press(screen.getByText('Hammasi'));

    await fireEvent.changeText(screen.getByTestId('feed-search'), 'каримова');
    await waitFor(() => expect(screen.queryByTestId('live-event-1')).toBeNull());
    expect(screen.getByTestId('live-event-2')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('feed-search'), '');

    await fireEvent.press(screen.getByTestId('live-event-1'));
    const detail = await screen.findByTestId('attendance-event-detail');
    expect(detail).toHaveTextContent(/G'ofurov Anvar/);
    expect(detail).toHaveTextContent(/Bosh kirish/);
  });

  it("kun almashtirish — oldingi kun so'raladi, ertangi kunga o'tib bo'lmaydi", async () => {
    await renderWithProviders(<LiveFeedScreen />);
    await screen.findByTestId('live-event-3');
    expect(screen.getByTestId('feed-next').props.accessibilityState?.disabled ?? true).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feed-prev'));
    await waitFor(() => expect(mock.history.get.length).toBeGreaterThan(1));
    const days = mock.history.get.map((r) => r.params.day);
    expect(new Set(days).size).toBe(2);
  });
});
