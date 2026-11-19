// 2026-10-07: «qo'shimcha roli bor xodimlarda ruxsat so'rovlarini yaratish yoki tasdiqlashni asosiy
// sahifada ko'rsatsa bo'ladimi?»
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { MENU_BADGES, WORK_LEAVES } from '@/api/urls';
import { HomeLeavesCard } from '../HomeLeavesCard';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const leave = (id: number, empId: number, supervisorId: number | null, status = 'pending') => ({
  id, employee_id: empId, status, type: 'work_leave',
  start_date: '2026-10-08T10:00:00', end_date: '2026-10-08T12:00:00',
  employee: { id: empId, legal_name: `Xodim ${empId}`, supervisor_id: supervisorId },
  signers: [], assigned_signers: [],
});

describe('bosh sahifa: ruxsat so\'rovlari kartasi', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockPush.mockClear();
    useAuthStore.setState({ user: { id: 1, type: 'employee', employee: { id: 6 } } as never, isAuthenticated: true } as never);
  });
  afterEach(() => mock.reset());

  it("tasdig'ini kutayotganlar soni va qatorlari; o'z so'rovi ro'yxatda emas; tugmalar", async () => {
    mock.onGet(MENU_BADGES).reply(200, { documents: 0, leaves: 1 });
    mock.onGet(WORK_LEAVES).reply(200, { items: [leave(11, 7, 6), leave(12, 6, 3)], total: 2, page: 1, pages: 1 });
    await renderWithProviders(<HomeLeavesCard />);
    await waitFor(() => expect(screen.getByTestId('home-leaves-count')).toHaveTextContent("Tasdig'ingizni kutmoqda: 1"));
    expect(await screen.findByTestId('home-leave-11')).toBeTruthy();
    expect(screen.queryByTestId('home-leave-12')).toBeNull();
    expect(mock.history.get.find((r) => r.url === WORK_LEAVES)?.params).toMatchObject({ status: 'pending', action_first: true, slim: true });
    await fireEvent.press(screen.getByTestId('home-leave-11'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/leave-detail', params: { id: 11 } });
    await fireEvent.press(screen.getByTestId('home-leave-create'));
    expect(mockPush).toHaveBeenCalledWith('/create-leave');
  });

  it("xodim kartasi yo'q hisob — karta chizilmaydi", async () => {
    useAuthStore.setState({ user: { id: 2, type: 'master-admin', employee: null } as never, isAuthenticated: true } as never);
    await renderWithProviders(<HomeLeavesCard />);
    expect(screen.queryByTestId('home-leaves-card')).toBeNull();
  });
});
