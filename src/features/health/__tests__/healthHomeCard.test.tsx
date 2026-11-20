import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { HEALTH_CHECKS_ACCESS, HEALTH_CHECKS_ROSTER } from '@/api/urls';
import { HealthHomeCard } from '../components/HealthHomeCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const DAY = dayjs().format('YYYY-MM-DD');

describe('HealthHomeCard', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(HEALTH_CHECKS_ACCESS).reply(200, { can_check: true, nurse_branch_ids: [7] });
    mock.onGet(HEALTH_CHECKS_ROSTER).reply(200, [
      { employee_id: 1, legal_name: 'A', status: 'good' },
      { employee_id: 2, legal_name: 'B', status: null },
      { employee_id: 3, legal_name: 'C', status: null },
    ]);
  });
  afterEach(() => mock.reset());

  it("nurse: today's queue size, tap opens the health screen", async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 5 }, nurse_branch_ids: [7] });
    await renderWithProviders(<HealthHomeCard />);
    expect(await screen.findByText("2 ta xodim ko'rik kutmoqda (3 tadan)")).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === HEALTH_CHECKS_ROSTER)!.params).toEqual({ branch_id: 7, day: DAY });
    await fireEvent.press(screen.getByTestId('health-home-card'));
    expect(router.push).toHaveBeenCalledWith('/sogliq-korigi');
  });

  it('not a nurse: nothing, no requests', async () => {
    setUser({ id: 2, type: 'employee', employee: { id: 6 } });
    await renderWithProviders(<HealthHomeCard />);
    expect(screen.queryByTestId('health-home-card')).toBeNull();
    expect(mock.history.get).toHaveLength(0);
  });
});
