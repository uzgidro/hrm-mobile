import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { WORK_PLANS, WORK_PLANS_SUMMARY } from '@/api/urls';
import WorkPlanScreen from '../screens/WorkPlanScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const emp = (role?: string) => ({
  id: 1,
  type: 'employee',
  employee: role ? { id: 5, is_multi_org_user: true, multi_org_employee_role: role } : { id: 5 },
});
const lastParams = (m: MockAdapter) => m.history.get.filter((r) => r.url === WORK_PLANS).at(-1)?.params;

describe('WorkPlanScreen (v2 WorkPlanPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock
      .onGet(WORK_PLANS_SUMMARY)
      .reply(200, { all: 9, overdue: 2, planned: 3, in_progress: 3, done: 1, cancelled: 0 });
    mock.onGet(WORK_PLANS).reply(200, {
      items: [
        {
          id: 4,
          title: 'Hisobot tayyorlash',
          employee_name: 'Karimov Vali',
          period_type: 'month',
          start_date: '2026-09-01',
          end_date: '2026-09-30',
          status: 'in_progress',
          weight: 20,
          planned_result: '4 ta hisobot',
        },
        {
          id: 5,
          title: 'Arxiv',
          department_name: 'Kotibiyat',
          start_date: '2026-10-01',
          end_date: '2026-12-31',
          status: 'planned',
        },
      ],
      total: 2,
      pages: 1,
    });
    mock.onPatch(`${WORK_PLANS}/4`).reply(200, {});
    mock.onDelete(`${WORK_PLANS}/4`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("sanoqlar plitkasi serverdan; ro'yxat: nom, mas'ul, holat", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<WorkPlanScreen />);
    expect(await screen.findByText('Hisobot tayyorlash')).toBeTruthy();
    expect(screen.getByText('Karimov Vali')).toBeTruthy();
    expect(screen.getByText('Kotibiyat')).toBeTruthy();
    expect(screen.getByTestId('workplan-status-overdue')).toBeTruthy();
  });

  it('holat filtri serverga: «overdue» ham status sifatida', async () => {
    setUser(emp('hr'));
    await renderWithProviders(<WorkPlanScreen />);
    await screen.findByText('Hisobot tayyorlash');
    await fireEvent.press(screen.getByTestId('workplan-status-overdue'));
    await waitFor(() => expect(lastParams(mock)).toEqual({ page: 1, size: 20, status: 'overdue' }));
  });

  it("yozish huquqisiz (oddiy xodim): FAB va tahrir yo'q", async () => {
    setUser(emp());
    await renderWithProviders(<WorkPlanScreen />);
    await fireEvent.press(await screen.findByText('Hisobot tayyorlash'));
    expect(screen.queryByTestId('workplan-add')).toBeNull();
    expect(screen.queryByTestId('workplan-done')).toBeNull();
    expect(screen.queryByTestId('workplan-edit')).toBeNull();
  });

  it("deputy yozishi mumkin (v2: canManageStructure || ministr || deputy): bajarildi → PATCH {status:'done'}", async () => {
    setUser(emp('deputy'));
    await renderWithProviders(<WorkPlanScreen />);
    await fireEvent.press(await screen.findByText('Hisobot tayyorlash'));
    await fireEvent.press(await screen.findByTestId('workplan-done'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'done' });
  });

  it("o'chirish: tasdiq → DELETE", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<WorkPlanScreen />);
    await fireEvent.press(await screen.findByText('Hisobot tayyorlash'));
    await fireEvent.press(await screen.findByTestId('workplan-delete'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });

  it("yangi reja: nom bo'sh — so'rov yo'q", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<WorkPlanScreen />);
    await screen.findByText('Hisobot tayyorlash');
    await fireEvent.press(screen.getByTestId('workplan-add'));
    await fireEvent.press(screen.getByTestId('workplan-save'));
    expect(await screen.findByText(i18n.t('workPlan.titleRequired'))).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
  });

  it("so'rov xatosi — ErrorState", async () => {
    setUser(emp('hr'));
    mock.onGet(WORK_PLANS).reply(500);
    await renderWithProviders(<WorkPlanScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
