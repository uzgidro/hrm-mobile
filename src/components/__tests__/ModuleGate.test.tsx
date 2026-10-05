import React from 'react';
import { Text } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { SYSTEM_SETTINGS } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { setNavOverrides } from '@/utils/roles';
import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ModuleGate } from '../ModuleGate';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() } }));

const setUser = (u: Record<string, unknown> | null) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: !!u } as never);
const employee = { id: 5, type: 'employee', employee: { id: 7 } };
const master = { id: 1, type: 'master-admin' };

describe('ModuleGate (root Stack sahifa darvozasi)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    setNavOverrides(undefined);
    mock.onGet(SYSTEM_SETTINGS).reply(200, { values: {} });
  });
  afterEach(() => {
    mock.reset();
    setNavOverrides(undefined);
  });
  afterAll(() => setUser(null));

  it('oddiy xodim /foydalanuvchilar — ekran o\'rniga «Ruxsat yo\'q»', async () => {
    setUser(employee);
    const view = await renderWithProviders(
      <ModuleGate routeName="foydalanuvchilar">
        <Text>ADMIN EKRAN</Text>
      </ModuleGate>,
    );
    expect(await view.findByTestId('module-gate-denied')).toBeTruthy();
    expect(view.queryByText('ADMIN EKRAN')).toBeNull();
    expect(view.getByText("Ruxsat yo'q")).toBeTruthy();
  });

  it('master admin — ekran o\'zi', async () => {
    setUser(master);
    const view = await renderWithProviders(
      <ModuleGate routeName="foydalanuvchilar">
        <Text>ADMIN EKRAN</Text>
      </ModuleGate>,
    );
    expect(view.getByText('ADMIN EKRAN')).toBeTruthy();
  });

  it('nav.modules sozlamasi modulni rolga ochsa — ruxsat (yuklangach)', async () => {
    setUser(employee);
    mock.onGet(SYSTEM_SETTINGS).reply(200, { values: { 'nav.modules': { users: { roles: ['employee'] } } } });
    const view = await renderWithProviders(
      <ModuleGate routeName="foydalanuvchilar">
        <Text>ADMIN EKRAN</Text>
      </ModuleGate>,
    );
    expect(await view.findByText('ADMIN EKRAN')).toBeTruthy();
  });

  it('darvozasiz route (tafsilot) — har doim ekran', async () => {
    setUser(employee);
    const view = await renderWithProviders(
      <ModuleGate routeName="order-detail">
        <Text>TAFSILOT</Text>
      </ModuleGate>,
    );
    expect(view.getByText('TAFSILOT')).toBeTruthy();
  });
});
