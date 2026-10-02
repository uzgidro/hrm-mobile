import React from 'react';
import dayjs from 'dayjs';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { TASKS_OVERDUE } from '@/api/urls';
import IjroScreen from '../screens/IjroScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const past = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
const setUser = (u: Record<string, unknown>) =>
  useAuthStore.setState({ user: u as never, isAuthenticated: true } as never);

describe('IjroScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mock.onGet(`${TASKS_OVERDUE}/summary`).reply(200, { open: 4, late: 1, late_done: 0, done: 7, all: 12 });
    mock
      .onGet(TASKS_OVERDUE)
      .reply(200, [
        {
          id: 3,
          task_index: '12/45',
          description: 'Hisobot tayyorlash',
          deadline_date: past,
          task_completed: null,
          employee: { id: 7, legal_name: 'Karimov Vali' },
        },
      ]);
    mock.onPatch(`${TASKS_OVERDUE}/3`).reply(200, {});
  });
  afterEach(() => mock.reset());

  it("ro'yxat: raqam, ijrochi, holat va kechikish; xulosa soni segmentda", async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 1 } });
    await renderWithProviders(<IjroScreen />);
    expect(await screen.findByText('12/45 · Karimov Vali')).toBeTruthy();
    expect(screen.getByText(i18n.t('ijro.daysLate', { count: 3 }))).toBeTruthy();
    await waitFor(() => expect(screen.getByText('12')).toBeTruthy()); // «Barchasi» soni
  });

  it("yuritmaydigan foydalanuvchi: qo'shish va bajarildi tugmalari yo'q", async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 1 } });
    await renderWithProviders(<IjroScreen />);
    await fireEvent.press(await screen.findByText('12/45 · Karimov Vali'));
    expect(screen.getAllByText('Hisobot tayyorlash').length).toBe(2); // ro'yxat + tafsilot
    expect(screen.queryByTestId('ijro-add')).toBeNull();
    expect(screen.queryByText(i18n.t('ijro.markDone'))).toBeNull();
  });

  it('ijro yurituvchi: bajarildi — bugungi sana bilan PATCH', async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 1 }, is_ijro_manager: true });
    await renderWithProviders(<IjroScreen />);
    expect(await screen.findByTestId('ijro-add')).toBeTruthy();
    await fireEvent.press(await screen.findByText('12/45 · Karimov Vali'));
    await fireEvent.press(screen.getByText(i18n.t('ijro.markDone')));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ task_completed: dayjs().format('YYYY-MM-DD') });
  });

  it("o'chirish: ilova ichidagi tasdiq → DELETE", async () => {
    setUser({ id: 1, type: 'employee', employee: { id: 1 }, is_ijro_manager: true });
    mock.onDelete(`${TASKS_OVERDUE}/3`).reply(200, {});
    await renderWithProviders(<IjroScreen />);
    await fireEvent.press(await screen.findByText('12/45 · Karimov Vali'));
    await fireEvent.press(await screen.findByTestId('ijro-delete'));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });
});
