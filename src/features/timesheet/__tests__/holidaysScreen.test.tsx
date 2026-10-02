import React from 'react';
import dayjs from 'dayjs';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { DUTY_DAYS_LIST, HOLIDAYS_LIST } from '@/api/urls';
import HolidaysScreen from '../screens/HolidaysScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const today = dayjs().format('YYYY-MM-DD');

// Xarakteristika testi (W4 qayta chizish): ekran xatti-harakati o'zgarmaydi.
describe('HolidaysScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({
      user: { id: 1, type: 'employee', employee: { id: 1, primary_organization_branch_id: 3 } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(HOLIDAYS_LIST).reply(200, {
      items: [{ id: 1, name: 'Mustaqillik kuni', date_from: today, date_to: today, is_repeatable: true }],
    });
    mock.onGet(DUTY_DAYS_LIST).reply(200, {
      items: [{ id: 2, date_from: today, date_to: today, employees: [{ id: 5, legal_name: 'Karimov Vali' }] }],
    });
  });
  afterEach(() => mock.reset());

  it("bayramlar: nom, «davom etmoqda» va «har yili» belgilari; filial bo'yicha so'rov", async () => {
    await renderWithProviders(<HolidaysScreen />);
    expect(await screen.findByText('Mustaqillik kuni')).toBeTruthy();
    expect(screen.getByText(i18n.t('timesheet.ongoingBadge'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timesheet.repeatableBadge'))).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === HOLIDAYS_LIST)?.params).toEqual({
      size: 100,
      organization_branch_id: 3,
    });
  });

  it("navbatchilar tabi: xodimlar ro'yxati", async () => {
    await renderWithProviders(<HolidaysScreen />);
    await screen.findByText('Mustaqillik kuni');
    await fireEvent.press(screen.getByText(i18n.t('timesheet.offDutyTab')));
    expect(await screen.findByText('Karimov Vali')).toBeTruthy();
  });

  it("bo'sh — bo'sh holat", async () => {
    mock.onGet(HOLIDAYS_LIST).reply(200, { items: [] });
    await renderWithProviders(<HolidaysScreen />);
    expect(await screen.findByText(i18n.t('timesheet.holidaysEmpty'))).toBeTruthy();
  });
});
