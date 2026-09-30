import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor, within } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import {
  TURNSTILE_DAY_BOARD,
  DASHBOARD_EMPLOYEES_BY_CATEGORY,
  DASHBOARD_EMPLOYEE_COUNT,
  DASHBOARD_AGE_STATS,
  DASHBOARD_NATIONALITY_STATS,
  DASHBOARD_JOB_POSITION_STATS,
  DASHBOARD_OVERDUE_TASKS,
  EMPLOYEES_BIRTHDAYS,
} from '@/api/urls';
import { LeaderBoard } from '../components/LeaderBoard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const emp = (id: number, legal_name: string) => ({ id, legal_name });

const DAY_BOARD = {
  day: '2026-09-29',
  entries: 2,
  exits: 1,
  total: 3,
  max_id: 12,
  people: [
    { employee_id: 1, entry_id: 10, exit_id: null, last_id: 10, last_direction: 'entry' },
    { employee_id: 2, entry_id: 11, exit_id: 12, last_id: 12, last_direction: 'exit' },
  ],
  latest: [12, 11, 10],
  events: [
    { id: 10, employee_id: 1, happen_time: '2026-09-29T08:50:00', direction_type: 'entrance' },
    { id: 11, employee_id: 2, happen_time: '2026-09-29T09:40:00', direction_type: 'entrance' },
    { id: 12, employee_id: 2, happen_time: '2026-09-29T18:05:00', direction_type: 'exit' },
  ],
  employees: [emp(1, 'Abdiev Ali'), emp(2, 'Karimov Vali')],
  turnstiles: [],
};

describe('LeaderBoard', () => {
  const mock = new MockAdapter(apiClient);

  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (router.push as jest.Mock).mockClear();
    useAuthStore.setState({
      user: { id: 1, type: 'employee', employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: 'hr' } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(TURNSTILE_DAY_BOARD).reply(200, DAY_BOARD);
    mock.onGet(DASHBOARD_EMPLOYEES_BY_CATEGORY).reply(200, {
      present_employees: [emp(1, 'Abdiev Ali'), emp(2, 'Karimov Vali')],
      late_employees: [emp(2, 'Karimov Vali')],
      absent_employees: [emp(3, 'Salimov Olim')],
      on_vacation_employees: [emp(4, 'Toshev Bek')],
    });
    mock.onGet(DASHBOARD_OVERDUE_TASKS).reply(200, { total: 2, by_department: [{ department_name: 'Kadrlar', count: 2 }] });
    mock.onGet(EMPLOYEES_BIRTHDAYS).reply(200, []);
    mock.onGet(DASHBOARD_AGE_STATS).reply(200, { stats: { '31-40': 2 } });
    mock.onGet(DASHBOARD_NATIONALITY_STATS).reply(200, [{ nationality: "O'zbek", count: 4 }]);
    mock.onGet(DASHBOARD_JOB_POSITION_STATS).reply(200, [{ job_position_name: 'Bosh mutaxassis', count: 3 }]);
  });

  afterEach(() => mock.reset());

  it("bugungi tile'lar: tabel 4, kelgan 2, kech 1, kelmagan 1", async () => {
    mock.onGet(DASHBOARD_EMPLOYEE_COUNT).reply(200, { total_count: 4, gender_stats: { male: 3, female: 1, unknown: 0 } });
    await renderWithProviders(<LeaderBoard />);
    await waitFor(() => expect(within(screen.getByTestId('tile-roster')).getByText('4')).toBeTruthy());
    expect(within(screen.getByTestId('tile-arrived')).getByText('2')).toBeTruthy();
    expect(within(screen.getByTestId('tile-late')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('tile-absent')).getByText('1')).toBeTruthy();
  });

  it("kech qoldi tile'i filtrlangan davomatga olib boradi", async () => {
    mock.onGet(DASHBOARD_EMPLOYEE_COUNT).reply(200, { total_count: 4 });
    await renderWithProviders(<LeaderBoard />);
    await waitFor(() => expect(within(screen.getByTestId('tile-late')).getByText('1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('tile-late'));
    expect(router.push).toHaveBeenCalledWith('/attendance-detail?filter=late');
  });

  it('jonli tashrif: kirish/chiqish soni va so\'nggi harakatlar', async () => {
    mock.onGet(DASHBOARD_EMPLOYEE_COUNT).reply(200, { total_count: 4 });
    await renderWithProviders(<LeaderBoard />);
    const live = await screen.findByTestId('card-live');
    await waitFor(() => expect(within(live).getAllByText('Karimov Vali').length).toBeGreaterThan(0));
    expect(within(live).getByTestId('live-entries')).toHaveTextContent(/2/);
    expect(within(live).getByTestId('live-exits')).toHaveTextContent(/1/);
  });

  it("tarkib manbalari xato bersa ham qolgan kartalar ishlaydi; muddati o'tgan topshiriqlar ko'rinadi", async () => {
    mock.onGet(DASHBOARD_EMPLOYEE_COUNT).reply(500);
    await renderWithProviders(<LeaderBoard />);
    await waitFor(() => expect(within(screen.getByTestId('tile-roster')).getByText('4')).toBeTruthy());
    const disc = await screen.findByTestId('card-discipline');
    await waitFor(() => expect(within(disc).getByText('Kadrlar')).toBeTruthy());
  });
});
