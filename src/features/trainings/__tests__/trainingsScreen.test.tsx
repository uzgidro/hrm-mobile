import React from 'react';
import dayjs from 'dayjs';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { TRAININGS, TRAININGS_SUMMARY } from '@/api/urls';
import TrainingsScreen from '../screens/TrainingsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);
const emp = (role?: string) => ({
  id: 1,
  type: 'employee',
  employee: role ? { id: 5, is_multi_org_user: true, multi_org_employee_role: role } : { id: 5 },
});
const lastParams = (m: MockAdapter) => m.history.get.filter((r) => r.url === TRAININGS).at(-1)?.params;
const soon = dayjs().add(10, 'day').format('YYYY-MM-DD');
const past = dayjs().subtract(3, 'day').format('YYYY-MM-DD');

describe('TrainingsScreen (v2 TrainingsPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock
      .onGet(TRAININGS_SUMMARY)
      .reply(200, { total: 12, completed: 8, planned: 4, total_hours: 240, total_cost: 12500000, expiring_soon: 2 });
    mock.onGet(TRAININGS).reply(200, {
      items: [
        {
          id: 1,
          employee_id: 7,
          employee_name: 'Karimov Vali',
          training_type: 'attestation',
          program_name: 'Attestatsiya 2026',
          status: 'completed',
          certificate_expires_at: soon,
        },
        {
          id: 2,
          employee_id: 8,
          employee_name: 'Aliyeva Nodira',
          training_type: 'course',
          program_name: 'Energetika kursi',
          status: 'completed',
          certificate_expires_at: past,
        },
      ],
      total: 2,
      pages: 1,
    });
    mock.onDelete(`${TRAININGS}/1`).reply(200, {});
    mock.onPatch(`${TRAININGS}/1`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("xulosa plitkalari va ro'yxat: muddati yaqin — ogohlantirish, o'tgan — xato", async () => {
    setUser(emp());
    await renderWithProviders(<TrainingsScreen />);
    expect(await screen.findByText('Attestatsiya 2026')).toBeTruthy();
    expect(screen.getByText(i18n.t('trainings.expiresIn', { count: 10 }))).toBeTruthy();
    expect(screen.getByText(i18n.t('trainings.expiredAgo', { count: 3 }))).toBeTruthy();
    expect(screen.getByTestId('training-stat-expiring')).toBeTruthy();
  });

  it('«muddati yaqinlari» → expiring_only; tur filtri → training_type', async () => {
    setUser(emp());
    await renderWithProviders(<TrainingsScreen />);
    await screen.findByText('Attestatsiya 2026');
    await fireEvent.press(screen.getByTestId('training-expiring'));
    await waitFor(() => expect(lastParams(mock)).toEqual({ page: 1, size: 20, expiring_only: true }));
    await fireEvent.press(screen.getByTestId('training-type-course'));
    await waitFor(() => expect(lastParams(mock)).toMatchObject({ training_type: 'course', expiring_only: true }));
  });

  it("rahbar (deputy): yozish tugmalari yo'q", async () => {
    setUser(emp('deputy'));
    await renderWithProviders(<TrainingsScreen />);
    await fireEvent.press(await screen.findByText('Attestatsiya 2026'));
    expect(screen.queryByTestId('training-add')).toBeNull();
    expect(screen.queryByTestId('training-edit')).toBeNull();
  });

  it('ministr yozishi mumkin (v2: canManageEmployees || ministr)', async () => {
    setUser(emp('ministr'));
    await renderWithProviders(<TrainingsScreen />);
    expect(await screen.findByTestId('training-add')).toBeTruthy();
  });

  it("HR: o'chirish → tasdiq → DELETE", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<TrainingsScreen />);
    await fireEvent.press(await screen.findByText('Attestatsiya 2026'));
    await fireEvent.press(await screen.findByTestId('training-delete'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });

  it("HR: tahrir — dastur nomi bo'sh bo'lsa so'rov yo'q", async () => {
    setUser(emp('hr'));
    await renderWithProviders(<TrainingsScreen />);
    await fireEvent.press(await screen.findByText('Attestatsiya 2026'));
    await fireEvent.press(await screen.findByTestId('training-edit'));
    await fireEvent.changeText(screen.getByTestId('training-program'), '');
    await fireEvent.press(screen.getByTestId('training-save'));
    expect(await screen.findByText(i18n.t('trainings.programRequired'))).toBeTruthy();
    expect(mock.history.patch).toHaveLength(0);
  });

  it("so'rov xatosi — ErrorState", async () => {
    setUser(emp());
    mock.onGet(TRAININGS).reply(500);
    await renderWithProviders(<TrainingsScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
