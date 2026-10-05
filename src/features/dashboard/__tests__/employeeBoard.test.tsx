import React from 'react';
import dayjs from 'dayjs';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import {
  TURNSTILE_ATTENDANCE_EVENTS,
  TURNSTILE_ATTENDANCE_NORMALIZED,
  WORK_LEAVES,
  MENU_BADGES,
  EMPLOYEES_BIRTHDAYS,
} from '@/api/urls';
import { EmployeeBoard } from '../components/EmployeeBoard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const today = dayjs().format('YYYY-MM-DD');

describe('EmployeeBoard', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({
      user: {
        id: 1,
        type: 'employee',
        employee: {
          id: 7,
          legal_name: 'Nodirboyev Javoxir Nurmuhammad',
          working_hours_start: '09:00',
          working_hours_end: '18:00',
          job_position: { id: 1, name: '1-toifali mutaxassis' },
        },
      } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, {
      items: [{ id: 1, happen_time: `${today}T08:50:00`, direction_type: 'entrance', employee_id: 7 }],
      total: 1,
    });
    mock.onGet(WORK_LEAVES).reply(200, { items: [], total: 0 });
    mock.onGet(MENU_BADGES).reply(200, { letters: 1, orders: 2, support: 0, projects: 0, fleet: 0, documents: 0, unread_notifications: 4 });
  });

  afterEach(() => mock.reset());

  it("Mening kunim: ism, bugungi kelish vaqti, statistik tile'lar", async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, [{ id: 3, legal_name: 'Urunov Jasur', days_left: 4 }]);
    await renderWithProviders(<EmployeeBoard />);
    expect(await screen.findByText('Nodirboyev Javoxir Nurmuhammad')).toBeTruthy();
    expect(await screen.findByText('08:50')).toBeTruthy();
    expect(await screen.findByText('Urunov Jasur')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('stat-docs')).toHaveTextContent(/3/));
  });

  it("tug'ilgan kunlar xato bersa — faqat o'sha karta xato ko'rsatadi", async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(500);
    await renderWithProviders(<EmployeeBoard />);
    expect(await screen.findByText(i18n.t('common.retry'))).toBeTruthy();
    expect(screen.getByText('Nodirboyev Javoxir Nurmuhammad')).toBeTruthy();
  });

  // QA 2026-10-05: an approved-leave day read «Bugun — Kelmagan» on Home while the
  // Davomat tab said «Ruxsat» — the day status now comes from MY tabel (v2 useEmployeeBoard).
  it('«Oxirgi kunlar»: tasdiqlangan ruxsat kuni — «Ruxsat», «Kelmagan» emas', async () => {
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, []);
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: [], total: 0 });
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, {
      items: [
        { id: 99, attendance: { calendar: { [today]: 'absent' } } }, // someone else — never used
        { id: 7, attendance: { calendar: { [today]: 'work_leave' } } },
      ],
      total: 2,
    });
    await renderWithProviders(<EmployeeBoard />);
    await waitFor(() => expect(screen.getByTestId(`week-${today}`)).toHaveTextContent(i18n.t('timesheet.codeWorkLeave')));
    const req = mock.history.get.find((g) => g.url === TURNSTILE_ATTENDANCE_NORMALIZED);
    expect(req?.params).toMatchObject({ employee_id: 7, date_to: today });
  });
});
