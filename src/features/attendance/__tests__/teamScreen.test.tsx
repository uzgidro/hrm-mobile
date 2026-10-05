import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { EMPLOYEES_BIRTHDAYS, EMPLOYEES_MY_TEAM, WORK_LEAVES } from '@/api/urls';
import TeamScreen from '../screens/TeamScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
// «Mening jamoam» = web v2 MyTeamPage: GET employees/my-team?day= (QA 2026-10-05:
// the screen showed the whole branch, 153 people, from the branch categories).
const TEAM = {
  date: '2026-10-05',
  summary: {},
  items: [
    { id: 11, legal_name: 'Karimov Vali', job_position_name: 'Muhandis', via: 'direct', status: 'present', first_in: '08:50' },
    { id: 12, legal_name: 'Aliyeva Nodira', via: 'indirect', status: 'late', first_in: '09:30' },
    { id: 13, legal_name: 'Tursunov Bek', via: 'department', status: 'absent' },
    { id: 14, legal_name: 'Dam Oluvchi', via: 'direct', status: 'day_off' },
  ],
};

// Xarakteristika testi (W4 qayta chizish): ekran xatti-harakati o'zgarmaydi.
describe('TeamScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    (router.push as jest.Mock).mockClear();
    useAuthStore.setState({
      user: {
        id: 1,
        type: 'employee',
        employee: { id: 1, primary_organization_branch_id: 2, supervisor_id: 5 },
      } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(EMPLOYEES_MY_TEAM).reply(200, TEAM);
    mock.onGet(WORK_LEAVES).reply(200, {
      items: [
        {
          id: 3,
          type: 'Shaxsiy ish',
          status: 'pending',
          start_date: '2026-10-02T09:00:00',
          end_date: '2026-10-02T11:00:00',
          created_at: '2026-10-01T10:00:00',
          employee: { id: 11, legal_name: 'Karimov Vali' },
        },
      ],
    });
    mock
      .onGet(EMPLOYEES_BIRTHDAYS)
      .reply(200, [{ id: 20, legal_name: "Tug'ilgan Xodim", birth_date: '1990-10-02', days_left: 0 }]);
  });
  afterEach(() => mock.reset());

  it("davomat donut jami va legenda; so'rovlar, jamoa, tug'ilgan kunlar", async () => {
    await renderWithProviders(<TeamScreen />);
    expect(await screen.findByText('Shaxsiy ish')).toBeTruthy();
    // donut markazi — faqat jamoa, dam olishdagi hisobga kirmaydi (3, branch 153 emas)
    expect(await screen.findByText('3')).toBeTruthy();
    expect(screen.getByTestId('team-day-off')).toBeTruthy();
    expect(screen.getByText('Dam Oluvchi')).toBeTruthy();
    expect(screen.getByText(i18n.t('attendance.status.pending'))).toBeTruthy();
    expect(screen.getAllByText('Karimov Vali').length).toBeGreaterThan(0);
    expect(await screen.findByText(i18n.t('attendance.birthdayToday'))).toBeTruthy();
  });

  it("so'rov qatori → leave-detail; Batafsil → attendance-detail", async () => {
    await renderWithProviders(<TeamScreen />);
    await fireEvent.press(await screen.findByText('Shaxsiy ish'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/leave-detail', params: { id: 3 } });
    await fireEvent.press(screen.getByText(i18n.t('attendance.details')));
    expect(router.push).toHaveBeenCalledWith('/attendance-detail');
  });

  it('jamoa kun tanlanadi: oldingi kun → my-team?day= shu kun bilan', async () => {
    await renderWithProviders(<TeamScreen />);
    await screen.findByText('Karimov Vali');
    await fireEvent.press(screen.getByTestId('team-prev-day'));
    const days = mock.history.get.filter((g) => g.url === EMPLOYEES_MY_TEAM).map((g) => g.params?.day);
    expect(new Set(days).size).toBeGreaterThan(1);
    expect(screen.getByTestId('team-next-day')).toBeTruthy();
  });

  it("rahbari bor xodim — «So'rov yaratish» ko'rinadi", async () => {
    await renderWithProviders(<TeamScreen />);
    expect(await screen.findByText(i18n.t('attendance.createRequest'))).toBeTruthy();
  });
});
