import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { WORK_LEAVES_HR_LIST, EMPLOYEES_LIST } from '@/api/urls';
import TempOrdersScreen from '../screens/TempOrdersScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const hr = { id: 1, type: 'employee', employee: { id: 5, is_multi_org_user: true, multi_org_employee_role: 'hr' } };

describe('TempOrdersScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(WORK_LEAVES_HR_LIST).reply(200, {
      items: [{ id: 11, employee: { legal_name: 'Karimov Vali' }, type: 'kasal', start_date: '2026-10-01T00:00:00', end_date: '2026-10-03T23:59:59' }],
      total: 1,
      pages: 1,
    });
    mock.onGet(EMPLOYEES_LIST).reply(200, { items: [{ id: 7, legal_name: 'Aliyev Ali' }], total: 1 });
  });
  afterEach(() => mock.reset());

  it("kadr: ro'yxat — xodim, tur nomi, kunlar soni", async () => {
    useAuthStore.setState({ user: hr as never, isAuthenticated: true } as never);
    await renderWithProviders(<TempOrdersScreen />);
    expect(await screen.findByText('Karimov Vali')).toBeTruthy();
    expect(screen.getByText('Kasal')).toBeTruthy();
    expect(screen.getByText(/3 kun/)).toBeTruthy();
  });

  it("oddiy xodim — ruxsat yo'q, so'rov yo'q", async () => {
    useAuthStore.setState({ user: { id: 2, type: 'employee', employee: { id: 6 } } as never, isAuthenticated: true } as never);
    await renderWithProviders(<TempOrdersScreen />);
    expect(screen.getByText(i18n.t('tempOrders.noAccess'))).toBeTruthy();
    expect(mock.history.get.some((r) => r.url === WORK_LEAVES_HR_LIST)).toBe(false);
  });

  it("forma: xodimsiz saqlash — xato, so'rov yuborilmaydi", async () => {
    useAuthStore.setState({ user: hr as never, isAuthenticated: true } as never);
    await renderWithProviders(<TempOrdersScreen />);
    await fireEvent.press(await screen.findByTestId('temp-order-add'));
    await fireEvent.press(screen.getByTestId('temp-order-save'));
    // placeholder + xato matni (ikkalasi «Xodimni tanlang»)
    await waitFor(() => expect(screen.getAllByText(i18n.t('tempOrders.employeeRequired')).length).toBe(2));
    expect(mock.history.post).toHaveLength(0);
  });

  it("tahrir: mavjud buyruq ochiladi, o'chirish tugmasi bor", async () => {
    useAuthStore.setState({ user: hr as never, isAuthenticated: true } as never);
    await renderWithProviders(<TempOrdersScreen />);
    await fireEvent.press(await screen.findByText('Karimov Vali'));
    expect(screen.getByText(i18n.t('tempOrders.editTitle'))).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('temp-order-delete')).toBeTruthy());
  });
});
