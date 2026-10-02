import React from 'react';
import dayjs from 'dayjs';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, within } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { LOCATIONS_LIST, TURNSTILE_ATTENDANCE_EVENTS, TURNSTILE_ATTENDANCE_NORMALIZED } from '@/api/urls';
import MyTimesheetScreen from '../screens/MyTimesheetScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const month = dayjs().startOf('month');
const d1 = month.format('YYYY-MM-DD');
const d2 = month.add(1, 'day').format('YYYY-MM-DD');

// Xarakteristika testi (W4 qayta chizish): ekran xatti-harakati o'zgarmaydi.
describe('MyTimesheetScreen', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({
      user: { id: 1, type: 'employee', employee: { id: 7 } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, {
      items: [
        {
          working_hours_start: '09:00:00',
          working_hours_end: '18:00:00',
          attendance: {
            calendar: { [d1]: 'present', [d2]: 'late' },
            daily_late_minutes: { [d2]: 12 },
            present_days_count: 14,
            late_days_count: 3,
            absent_days_count: 1,
            work_duration_hours: 151.26,
          },
        },
      ],
    });
    mock.onGet(TURNSTILE_ATTENDANCE_EVENTS).reply(200, { items: [] });
    mock.onGet(LOCATIONS_LIST).reply(200, []);
  });
  afterEach(() => mock.reset());

  it('oy xulosasi, ish jadvali va kun tafsiloti; kech qolgan kunda daqiqalar', async () => {
    await renderWithProviders(<MyTimesheetScreen />);
    expect(within(await screen.findByTestId('tabel-present')).getByText('14')).toBeTruthy();
    expect(within(screen.getByTestId('tabel-late')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('tabel-absent')).getByText('1')).toBeTruthy();
    expect(screen.getByText(i18n.t('timesheet.hoursValue', { value: 151.3 }))).toBeTruthy();
    expect(screen.getByText(i18n.t('timesheet.scheduleTitle'))).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === TURNSTILE_ATTENDANCE_NORMALIZED)?.params).toMatchObject({
      employee_id: 7,
      size: 1,
    });
    await fireEvent.press(screen.getByTestId(`tabel-day-${d2}`));
    expect(await screen.findByText(i18n.t('timesheet.lateByMinutes', { value: 12 }))).toBeTruthy();
  });

  it("ma'lumot yo'q — bo'sh holat", async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(200, { items: [] });
    await renderWithProviders(<MyTimesheetScreen />);
    expect(await screen.findByText(i18n.t('timesheet.empty'))).toBeTruthy();
  });

  it('xato — ErrorState', async () => {
    mock.onGet(TURNSTILE_ATTENDANCE_NORMALIZED).reply(500);
    await renderWithProviders(<MyTimesheetScreen />);
    expect(await screen.findByText(i18n.t('timesheet.loadError'))).toBeTruthy();
  });

  it("xodim kartasi yo'q akkaunt (so'rov o'chiq) — skeletda qotib qolmaydi", async () => {
    useAuthStore.setState({ user: { id: 1, type: 'master-admin' } as never, isAuthenticated: true } as never);
    await renderWithProviders(<MyTimesheetScreen />);
    expect(await screen.findByText(i18n.t('timesheet.empty'))).toBeTruthy();
  });
});
