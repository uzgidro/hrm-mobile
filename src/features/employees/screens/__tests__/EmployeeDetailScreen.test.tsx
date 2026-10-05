import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { DICTIONARY_OPTIONS, EMPLOYEE_DETAIL } from '@/api/urls';
import EmployeeDetailScreen from '../EmployeeDetailScreen';

const mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

describe('EmployeeDetailScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    delete mockParams.id;
  });
  afterEach(() => mock.reset());

  it("xodim kartasi yo'q hisob (master / admin) — cheksiz skelet emas, izoh; so'rov yo'q", async () => {
    setUser({ id: 1, username: 'master', type: 'master-admin', employee: null });
    await renderWithProviders(<EmployeeDetailScreen />);
    expect(await screen.findByText(i18n.t('employees.noEmployeeCard'))).toBeTruthy();
    expect(mock.history.get).toEqual([]);
  });

  it("o'z kartasi: millat ma'lumotnomadan nom bilan, ish soati soniyasiz", async () => {
    setUser({ id: 2, type: 'employee', employee: { id: 7, legal_name: 'Aliyev Vali' } });
    mock.onGet(EMPLOYEE_DETAIL(7)).reply(200, {
      id: 7,
      legal_name: 'Aliyev Vali',
      nationality: 'uzb',
      working_hours_start: '08:00:00',
      working_hours_end: '20:00:00',
      lunch_start_time: '13:00:00',
      lunch_end_time: '14:00:00',
    });
    mock.onGet(DICTIONARY_OPTIONS('nationalities')).reply(200, [
      { code: 'uzbek', name: "O'zbek" },
      { code: 'rus', name: 'Rus' },
    ]);
    await renderWithProviders(<EmployeeDetailScreen />);
    expect(await screen.findByText("O'zbek")).toBeTruthy();
    expect(screen.queryByText('uzb')).toBeNull();
    expect(screen.getByText('08:00 – 20:00')).toBeTruthy();
    expect(screen.getByText('13:00 – 14:00')).toBeTruthy();
  });
});
