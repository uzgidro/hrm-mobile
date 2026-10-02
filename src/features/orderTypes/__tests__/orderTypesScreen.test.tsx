import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { ORDER_ACT_CATEGORIES } from '@/api/urls';
import OrderTypesScreen from '../screens/OrderTypesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

describe('OrderTypesScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(ORDER_ACT_CATEGORIES).reply(200, [
      { id: 1, name: "Mehnat ta'tili", creator_role: 'hr' },
      { id: 2, name: 'Xizmat safari', creator_role: 'employee' },
    ]);
  });
  afterEach(() => mock.reset());

  it("ro'yxat va oqim belgisi", async () => {
    setUser({ id: 1, type: 'master-admin' });
    await renderWithProviders(<OrderTypesScreen />);
    expect(await screen.findByText("Mehnat ta'tili")).toBeTruthy();
    expect(screen.getAllByText(i18n.t('orderTypes.flowHr')).length).toBeGreaterThan(0);
  });

  it("yozish huquqi yo'q (deputy) — qo'shish tugmasi yo'q", async () => {
    setUser({ id: 2, type: 'employee', employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: 'deputy' } });
    await renderWithProviders(<OrderTypesScreen />);
    await screen.findByText("Mehnat ta'tili");
    expect(screen.queryByTestId('order-type-add')).toBeNull();
  });

  it("boshqaruvchi: yangi tur — nomsiz saqlash xato, POST yo'q", async () => {
    setUser({ id: 1, type: 'master-admin' });
    await renderWithProviders(<OrderTypesScreen />);
    await fireEvent.press(await screen.findByTestId('order-type-add'));
    await fireEvent.press(screen.getByTestId('order-type-save'));
    expect(await screen.findByText(i18n.t('orderTypes.nameRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
  });

  it('oqim filtri serverga yuboriladi', async () => {
    setUser({ id: 1, type: 'master-admin' });
    await renderWithProviders(<OrderTypesScreen />);
    await screen.findByText("Mehnat ta'tili");
    await fireEvent.press(screen.getAllByText(i18n.t('orderTypes.flowEmployee'))[0]);
    await waitFor(() => expect(mock.history.get.some((r) => r.params?.creator_role === 'employee')).toBe(true));
  });
});
