/**
 * HAR BIR EKRAN uchun "yiqilmaydi" sinovi (smoke).
 *
 * 53 ta feature ekrani ikki rol (master-admin va oddiy xodim) ostida render
 * qilinadi; API BO'SH javob qaytaradi, ya'ni bu aynan "ma'lumot yo'q" yo'lini
 * tekshiradi — ro'yxatlar, bo'sh holatlar, rol darvozalari va import zanjiri.
 * Maqsad: yangi ekran yoki refaktor paytida biror ekran umuman ochilmay
 * qolishini (import xatosi, null'ga murojaat, console.error) DARHOL ushlash.
 *
 * Ma'lumotli holat har bir feature'ning O'Z testlarida tekshiriladi — bu yerda
 * jonli payload ATAYLAB ishlatilmaydi (PII repoga tushmasin).
 */
// Ekranlar RO'YXAT bo'ylab yuklanadi (har biri o'z testida alohida
// render qilinsin, biri yiqilsa boshqasi to'xtamasin) — shu bois import
// emas, lazy `require`.
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: '1', employeeId: '1', name: 'X', mode: 'view', date: '2026-07-01' }),
  useFocusEffect: (cb: () => void) => {
    const R = require('react');
    R.useEffect(() => { const c = cb(); return typeof c === 'function' ? c : undefined; }, []);
  },
  usePathname: () => '/',
  useSegments: () => [],
  Link: ({ children }: { children?: React.ReactNode }) => children ?? null,
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

const MASTER = { id: 1, type: 'master-admin' } as User;
const EMPLOYEE = {
  id: 2,
  type: 'employee',
  employee: {
    id: 20,
    legal_name: 'Test Xodim',
    department: { id: 3, name: "Bo'lim", organization_branch_id: 1 },
  },
} as User;

const SCREENS: [string, () => any][] = [
  ['assistant/AssistantScreen', () => require('@/features/assistant/screens/AssistantScreen')],
  ['attendance/AttendanceDetailScreen', () => require('@/features/attendance/screens/AttendanceDetailScreen')],
  ['attendance/TeamScreen', () => require('@/features/attendance/screens/TeamScreen')],
  ['birthdays/BirthdaysScreen', () => require('@/features/birthdays/screens/BirthdaysScreen')],
  ['chairmanTasks/ChairmanTaskFormScreen', () => require('@/features/chairmanTasks/screens/ChairmanTaskFormScreen')],
  ['chairmanTasks/ChairmanTasksScreen', () => require('@/features/chairmanTasks/screens/ChairmanTasksScreen')],
  ['dashboard/HomeScreen', () => require('@/features/dashboard/screens/HomeScreen')],
  ['directory/PhoneDirectoryScreen', () => require('@/features/directory/screens/PhoneDirectoryScreen')],
  ['documents/DocumentViewerScreen', () => require('@/features/documents/screens/DocumentViewerScreen')],
  ['documents/DocumentsListScreen', () => require('@/features/documents/screens/DocumentsListScreen')],
  ['employees/EmployeeCalendarScreen', () => require('@/features/employees/screens/EmployeeCalendarScreen')],
  ['employees/EmployeeDetailScreen', () => require('@/features/employees/screens/EmployeeDetailScreen')],
  ['employees/EmployeesListScreen', () => require('@/features/employees/screens/EmployeesListScreen')],
  ['kpi/KpiEntryScreen', () => require('@/features/kpi/screens/KpiEntryScreen')],
  ['kpi/KpiTeamScreen', () => require('@/features/kpi/screens/KpiTeamScreen')],
  ['kpi/MyKpiScreen', () => require('@/features/kpi/screens/MyKpiScreen')],
  ['leaves/CreateLeaveScreen', () => require('@/features/leaves/screens/CreateLeaveScreen')],
  ['leaves/LeaveDetailScreen', () => require('@/features/leaves/screens/LeaveDetailScreen')],
  ['leaves/TeamLeavesScreen', () => require('@/features/leaves/screens/TeamLeavesScreen')],
  ['leaves/WorkLeavesScreen', () => require('@/features/leaves/screens/WorkLeavesScreen')],
  ['letters/CreateLetterScreen', () => require('@/features/letters/screens/CreateLetterScreen')],
  ['letters/LetterDetailScreen', () => require('@/features/letters/screens/LetterDetailScreen')],
  ['letters/LetterDocumentScreen', () => require('@/features/letters/screens/LetterDocumentScreen')],
  ['letters/LettersListScreen', () => require('@/features/letters/screens/LettersListScreen')],
  ['letters/SubmitReportScreen', () => require('@/features/letters/screens/SubmitReportScreen')],
  ['news/NewsFormScreen', () => require('@/features/news/screens/NewsFormScreen')],
  ['news/NewsScreen', () => require('@/features/news/screens/NewsScreen')],
  ['notifications/NotificationsScreen', () => require('@/features/notifications/screens/NotificationsScreen')],
  ['orders/CreateOrderScreen', () => require('@/features/orders/screens/CreateOrderScreen')],
  ['orders/OrderDetailScreen', () => require('@/features/orders/screens/OrderDetailScreen')],
  ['orders/OrderDocumentScreen', () => require('@/features/orders/screens/OrderDocumentScreen')],
  ['orders/OrdersListScreen', () => require('@/features/orders/screens/OrdersListScreen')],
  ['profile/ProfileEditScreen', () => require('@/features/profile/screens/ProfileEditScreen')],
  ['profile/ProfileScreen', () => require('@/features/profile/screens/ProfileScreen')],
  ['projects/CardDetailScreen', () => require('@/features/projects/screens/CardDetailScreen')],
  ['projects/ProjectDetailScreen', () => require('@/features/projects/screens/ProjectDetailScreen')],
  ['projects/ProjectFormScreen', () => require('@/features/projects/screens/ProjectFormScreen')],
  ['projects/ProjectsListScreen', () => require('@/features/projects/screens/ProjectsListScreen')],
  ['security/ChangePinScreen', () => require('@/features/security/screens/ChangePinScreen')],
  ['security/PinSetupScreen', () => require('@/features/security/screens/PinSetupScreen')],
  ['security/UnlockScreen', () => require('@/features/security/screens/UnlockScreen')],
  ['support/SupportDetailScreen', () => require('@/features/support/screens/SupportDetailScreen')],
  ['support/SupportFormScreen', () => require('@/features/support/screens/SupportFormScreen')],
  ['support/SupportListScreen', () => require('@/features/support/screens/SupportListScreen')],
  ['terminals/TerminalsScreen', () => require('@/features/terminals/screens/TerminalsScreen')],
  ['timesheet/HolidaysScreen', () => require('@/features/timesheet/screens/HolidaysScreen')],
  ['timesheet/MyDutyGridScreen', () => require('@/features/timesheet/screens/MyDutyGridScreen')],
  ['timesheet/MyDutyScreen', () => require('@/features/timesheet/screens/MyDutyScreen')],
  ['timesheet/MyTimesheetScreen', () => require('@/features/timesheet/screens/MyTimesheetScreen')],
  ['timesheet/NavbatchilikScreen', () => require('@/features/timesheet/screens/NavbatchilikScreen')],
  ['visitors/VisitorDetailScreen', () => require('@/features/visitors/screens/VisitorDetailScreen')],
  ['visitors/VisitorFormScreen', () => require('@/features/visitors/screens/VisitorFormScreen')],
  ['visitors/VisitorsListScreen', () => require('@/features/visitors/screens/VisitorsListScreen')],
];

describe('ekran smoke (bo\'sh API javobi)', () => {
  let mock: MockAdapter;
  let errors: string[];
  let origErr: typeof console.error;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    // Har qanday so'rov — bo'sh ro'yxat. Ekran "ma'lumot yo'q" holatini
    // chizishi va YIQILMASLIGI kerak.
    mock.onAny().reply(200, []);
    errors = [];
    origErr = console.error;
    console.error = (...a: unknown[]) => { errors.push(a.map(String).join(' ')); };
  });

  afterEach(() => { mock.restore(); console.error = origErr; });

  for (const [name, load] of SCREENS) {
    for (const [roleName, user] of [['master', MASTER], ['xodim', EMPLOYEE]] as const) {
      it(`${name} [${roleName}]`, async () => {
        useAuthStore.setState({ user, isAuthenticated: true } as never);
        const mod = load();
        const Comp = mod.default ?? Object.values(mod)[0];
        const r = await renderWithProviders(<Comp />);
        await waitFor(() => expect(r.toJSON()).toBeTruthy());
        const real = errors.filter((e) => !/not wrapped in act|VirtualizedList|deprecated/i.test(e));
        if (real.length) {
          throw new Error(`${name} [${roleName}] console.error:\n` + real.slice(0, 3).join('\n---\n'));
        }
      });
    }
  }
});
