import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, waitFor, within, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import {
  DASHBOARD_MAIN,
  DASHBOARD_LATE_EMPLOYEES,
  DASHBOARD_LATE_EMPLOYEES_FREQUENT,
  ORGANIZATION_BRANCHES,
  VISITOR_TURNSTILE_ATTENDANCE,
} from '@/api/urls';
import MonitoringScreen from '../screens/MonitoringScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

// REAL `/auth/me` (qa.monitoring, TEST bazasi 2026-10-05): `employee: null`, filial FAQAT
// `multi_modal_user.organization_branch_ids` da — yuqori darajadagi `organization_branch_id` YO'Q.
const kiosk = (branchIds: number[] = [3]) => ({
  id: 931117,
  username: 'qa.monitoring',
  type: 'monitoring',
  employee: null,
  admin: null,
  master_admin: null,
  multi_modal_user: {
    id: 552,
    role: 'monitoring',
    username: 'qa.monitoring',
    organization_branch_ids: branchIds,
    legal_name: 'QA MONITORING Post',
  },
});
const master = {
  id: 1,
  username: 'master',
  type: 'master-admin',
  employee: null,
  admin: null,
  master_admin: { id: 1, email: 'm@x.uz' },
  multi_modal_user: null,
};

describe('MonitoringScreen', () => {
  const mock = new MockAdapter(apiClient);
  const branchOf = (url: string) =>
    mock.history.get.filter((r) => r.url === url).map((r) => r.params?.organization_branch_id);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(DASHBOARD_MAIN).reply(200, { total_employees_count: 147, present_employees_count: 99, late_employees_count: 9, absent_employees_count: 45 });
    mock.onGet(DASHBOARD_LATE_EMPLOYEES).reply(200, [{ employee_id: 1, employee: { legal_name: 'Karimov Vali' }, happen_time: '2026-09-30T09:24:00', late_minutes: 24 }]);
    mock.onGet(DASHBOARD_LATE_EMPLOYEES_FREQUENT).reply(200, [{ employee_id: 2, employee_name: 'Salimov Olim', late_count: 6 }]);
    mock.onGet(VISITOR_TURNSTILE_ATTENDANCE).reply(200, { items: [{ id: 1, happen_time: '2026-09-30T10:00:00', direction_type: 'entrance', visitor: { legal_name: 'Mehmon Aziz' } }] });
  });
  afterEach(() => mock.reset());

  it("monitoring operatori (kechikishni ko'radi): statistika, kechikkanlar, mehmonlar", async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 5, department: { id: 1, name: 'x', organization_branch_id: 3 }, is_multi_org_user: true, multi_org_employee_role: 'monitoring' } });
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(within(screen.getByTestId('mon-total')).getByText('147')).toBeTruthy());
    expect(screen.getByText('+24 daq')).toBeTruthy();
    expect(await screen.findByText('Karimov Vali')).toBeTruthy();
    expect(await screen.findByText('Salimov Olim')).toBeTruthy();
    expect(await screen.findByText('Mehmon Aziz')).toBeTruthy();
  });

  it("kiosk akkaunt (real /auth/me): filial multi_modal_user dan; v2 canSeeLateness yo'q — kechikish so'rovlari yo'q", async () => {
    setUser(kiosk([3]));
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(within(screen.getByTestId('mon-total')).getByText('147')).toBeTruthy());
    expect(branchOf(DASHBOARD_MAIN)).toEqual([3]);
    expect(screen.queryByText(i18n.t('monitoring.lateLive'))).toBeNull();
    expect(mock.history.get.some((r) => r.url === DASHBOARD_LATE_EMPLOYEES)).toBe(false);
    // Bitta filialli post — tanlagich ham, filiallar so'rovi ham yo'q (v2 BranchSelector statik).
    expect(screen.queryByTestId('mon-branch')).toBeNull();
    expect(mock.history.get.some((r) => r.url === ORGANIZATION_BRANCHES)).toBe(false);
  });

  it("ko'p filialli kiosk — tanlagich faqat o'z filiallari bilan, tanlash taxtani almashtiradi", async () => {
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, {
      items: [{ id: 3, name: 'Chorvoq GES' }, { id: 7, name: 'Farhod GES' }, { id: 9, name: 'Begona' }],
    });
    setUser(kiosk([3, 7]));
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(branchOf(DASHBOARD_MAIN)).toContain(3));
    await fireEvent.press(await screen.findByTestId('mon-branch'));
    expect(await screen.findByText('Farhod GES')).toBeTruthy();
    expect(screen.queryByText('Begona')).toBeNull();
    await fireEvent.press(screen.getByText('Farhod GES'));
    await waitFor(() => expect(branchOf(DASHBOARD_MAIN)).toContain(7));
  });

  it("master-admin (o'z filiali yo'q) — v2 kabi bosh filial bilan boshlanadi, istalgan filialni tanlaydi", async () => {
    mock.onGet(ORGANIZATION_BRANCHES).reply(200, {
      items: [{ id: 5, name: 'Farhod GES' }, { id: 12, name: 'Bosh ofis', is_head_office: true }],
    });
    setUser(master);
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(branchOf(DASHBOARD_MAIN)).toEqual([12]));
    await waitFor(() => expect(within(screen.getByTestId('mon-branch')).getByText('Bosh ofis')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('mon-branch'));
    await fireEvent.press(await screen.findByText('Farhod GES'));
    await waitFor(() => expect(branchOf(DASHBOARD_MAIN)).toContain(5));
  });

  it("filial aniqlanmasa (filialsiz kiosk) — so'rovsiz bo'sh holat", async () => {
    setUser(kiosk([]));
    await renderWithProviders(<MonitoringScreen />);
    expect(screen.getByText(i18n.t('monitoring.noBranch'))).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url !== 'system-settings')).toEqual([]);
  });

  it('statistika yuklanmasa — 0 lar emas, qayta urinish', async () => {
    mock.onGet(DASHBOARD_MAIN).reply(500);
    setUser(kiosk([3]));
    await renderWithProviders(<MonitoringScreen />);
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(screen.queryByTestId('mon-total')).toBeNull();
  });

  it("mehmonlar yuklanmasa — «mehmon yo'q» emas, kartada xato", async () => {
    mock.onGet(VISITOR_TURNSTILE_ATTENDANCE).reply(500);
    setUser(kiosk([3]));
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(within(screen.getByTestId('mon-total')).getByText('147')).toBeTruthy());
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('monitoring.noGuests'))).toBeNull();
  });
});
