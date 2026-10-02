import React from 'react';
import dayjs from 'dayjs';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor, within } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { VISITORS_LIST, VISITOR_TURNSTILE_ATTENDANCE } from '@/api/urls';
import KppScreen from '../screens/KppScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const today = dayjs().format('YYYY-MM-DD');

describe('KppScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({ user: { id: 1, type: 'kpp' } as never, isAuthenticated: true } as never);
    mock.onGet(VISITORS_LIST).reply(200, {
      items: [
        { id: 7, legal_name: 'Karimov Aziz', organization_name: 'Suv MChJ', host_employee_name: 'Ali Valiyev', last_visit_time: `${today}T09:10:00`, visit_count: 3 },
        { id: 8, legal_name: 'Salimova Dilnoza', last_visit_time: undefined },
      ],
      total: 2,
    });
    mock.onGet(VISITOR_TURNSTILE_ATTENDANCE).reply((cfg) => [
      200,
      {
        items: cfg.params?.visitor_id
          ? [{ id: 1, visitor_id: 7, happen_time: `${today}T09:10:00`, direction_type: 'entrance', visitor: { legal_name: 'Karimov Aziz' } }]
          : [
              { id: 1, visitor_id: 7, happen_time: `${today}T09:10:00`, direction_type: 'entrance', visitor: { legal_name: 'Karimov Aziz' } },
              { id: 2, visitor_id: 9, happen_time: `${today}T10:00:00`, direction_type: 'exit', visitor: { legal_name: 'Boshqa Mehmon' } },
            ],
      },
    ]);
  });
  afterEach(() => mock.reset());

  it("mehmonlar kun bo'yicha guruhlangan, hisoblagichlar bugungi o'tishlardan", async () => {
    await renderWithProviders(<KppScreen />);
    expect((await screen.findAllByText('Karimov Aziz')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('kpp.noVisit'))).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId('kpp-entered')).getByText('1')).toBeTruthy());
    expect(within(screen.getByTestId('kpp-exited')).getByText('1')).toBeTruthy();
  });

  it("mehmonni tanlash o'tishlarni filtrlaydi, qayta bosish bekor qiladi", async () => {
    await renderWithProviders(<KppScreen />);
    await fireEvent.press(await screen.findByTestId('kpp-guest-7'));
    await waitFor(() => expect(mock.history.get.some((r) => r.url === VISITOR_TURNSTILE_ATTENDANCE && r.params?.visitor_id === 7)).toBe(true));
    await waitFor(() => expect(screen.queryByText('Boshqa Mehmon')).toBeNull());
    await fireEvent.press(screen.getByTestId('kpp-guest-7'));
    expect(await screen.findByText('Boshqa Mehmon')).toBeTruthy();
  });

  it("mehmonlar yuklanmasa — «topilmadi» emas, qayta urinish", async () => {
    mock.onGet(VISITORS_LIST).reply(500);
    await renderWithProviders(<KppScreen />);
    expect((await screen.findAllByText(i18n.t('common.retry'))).length).toBeGreaterThan(0);
    expect(screen.queryByText(i18n.t('kpp.noGuests'))).toBeNull();
  });
});

