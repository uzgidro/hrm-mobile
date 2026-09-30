import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import MonitoringTab from '../../../../app/(tabs)/monitoring';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));

describe('Monitoring tabi', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet().reply(200, { items: [], total: 0 });
  });
  afterEach(() => mock.reset());

  it("monitoring kiosk (filialsiz) — Monitoring ekrani, so'rovsiz «filial aniqlanmadi»", async () => {
    useAuthStore.setState({ user: { id: 1, type: 'monitoring' } as never, isAuthenticated: true } as never);
    await renderWithProviders(<MonitoringTab />);
    expect(screen.getByText(i18n.t('monitoring.noBranch'))).toBeTruthy();
    // Faqat modul sozlamalari o'qiladi — davomat/roster so'rovi yo'q.
    expect(mock.history.get.map((r) => r.url).filter((u) => u !== 'system-settings')).toEqual([]);
  });

  it("monitoring moduli ham, davomat ham yo'q — «tez orada»", async () => {
    useAuthStore.setState({ user: { id: 1, type: 'kpp' } as never, isAuthenticated: true } as never);
    await renderWithProviders(<MonitoringTab />);
    expect(screen.getByText(i18n.t('tabs.monitoringSoon'))).toBeTruthy();
  });
});
