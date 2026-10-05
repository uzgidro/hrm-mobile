import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { KPI_MY_SCORECARD, KPI_MY_TEAM } from '@/api/urls';
import MyKpiScreen from '../MyKpiScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

describe('MyKpiScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(KPI_MY_TEAM).reply(200, { employees: [] });
  });
  afterEach(() => mock.reset());

  it("xodim kartasi yo'q hisob (master-admin): so'rovsiz «faqat xodimlar uchun» holati, qayta urinish yo'q", async () => {
    setUser({
      id: 1,
      type: 'master-admin',
      employee: null,
      master_admin: { id: 1, email: 'm@x.uz' },
      kpi_enabled: true,
    });
    await renderWithProviders(<MyKpiScreen />);
    expect(await screen.findByText(i18n.t('kpi.noEmployeeTitle'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('common.retry'))).toBeNull();
    expect(mock.history.get.some((r) => r.url === KPI_MY_SCORECARD)).toBe(false);
  });

  it('server `not_an_employee` desa — xato emas, xuddi shu holat', async () => {
    mock.onGet(KPI_MY_SCORECARD).reply(400, {
      code: 'not_an_employee',
      i18n_key: 'errors.not_an_employee',
      message: 'Only employees can perform this action',
    });
    setUser({ id: 2, type: 'employee', employee: { id: 7, legal_name: 'X' } });
    await renderWithProviders(<MyKpiScreen />);
    expect(await screen.findByText(i18n.t('kpi.noEmployeeTitle'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('kpi.loadError'))).toBeNull();
  });
});
