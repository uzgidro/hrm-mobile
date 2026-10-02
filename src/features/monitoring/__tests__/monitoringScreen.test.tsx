import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, waitFor, within } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import {
  DASHBOARD_MAIN,
  DASHBOARD_LATE_EMPLOYEES,
  DASHBOARD_LATE_EMPLOYEES_FREQUENT,
  VISITOR_TURNSTILE_ATTENDANCE,
} from '@/api/urls';
import MonitoringScreen from '../screens/MonitoringScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const setUser = (u: Record<string, unknown>) => useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

describe('MonitoringScreen', () => {
  const mock = new MockAdapter(apiClient);
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
    expect(await screen.findByText('Karimov Vali')).toBeTruthy();
    expect(screen.getByText('+24 daq')).toBeTruthy();
    expect(await screen.findByText('Salimov Olim')).toBeTruthy();
    expect(await screen.findByText('Mehmon Aziz')).toBeTruthy();
  });

  it("kiosk akkaunt (v2 canSeeLateness yo'q) — kechikish kartalari va so'rovlari yo'q", async () => {
    setUser({ id: 1, type: 'monitoring', organization_branch_id: 3 });
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(within(screen.getByTestId('mon-total')).getByText('147')).toBeTruthy());
    expect(screen.queryByText(i18n.t('monitoring.lateLive'))).toBeNull();
    expect(mock.history.get.some((r) => r.url === DASHBOARD_LATE_EMPLOYEES)).toBe(false);
  });

  it("filial aniqlanmasa — so'rovsiz bo'sh holat", async () => {
    setUser({ id: 1, type: 'monitoring' });
    await renderWithProviders(<MonitoringScreen />);
    expect(screen.getByText(i18n.t('monitoring.noBranch'))).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url !== 'system-settings')).toEqual([]);
  });

  it("statistika yuklanmasa — 0 lar emas, qayta urinish", async () => {
    mock.onGet(DASHBOARD_MAIN).reply(500);
    setUser({ id: 1, type: 'monitoring', organization_branch_id: 3 });
    await renderWithProviders(<MonitoringScreen />);
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(screen.queryByTestId('mon-total')).toBeNull();
  });

  it("mehmonlar yuklanmasa — «mehmon yo'q» emas, kartada xato", async () => {
    mock.onGet(VISITOR_TURNSTILE_ATTENDANCE).reply(500);
    setUser({ id: 1, type: 'monitoring', organization_branch_id: 3 });
    await renderWithProviders(<MonitoringScreen />);
    await waitFor(() => expect(within(screen.getByTestId('mon-total')).getByText('147')).toBeTruthy());
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('monitoring.noGuests'))).toBeNull();
  });
});

