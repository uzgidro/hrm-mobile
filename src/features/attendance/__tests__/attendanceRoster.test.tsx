import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n';
import { DASHBOARD_EMPLOYEES_BY_CATEGORY, TURNSTILE_ATTENDANCE_EVENTS } from '@/api/urls';
import { foldText, matchesQuery } from '@/utils/searchFold';
import AttendanceDetailScreen, { rosterCounts } from '../screens/AttendanceDetailScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));

const emp = (id: number, name: string, deptId: number, position = 'Muhandis') => ({
  id,
  legal_name: name,
  job_position: { id: 1, name: position },
  department: { id: deptId, name: deptId === 3 ? 'Kotibiyat' : 'Moliya' },
});

// Foydalanuvchi 2026-10-06: «eski dizaynda jamoani (filial xodimlari kelgan-kelmagani) ko'rsa
// bo'lar edi … bo'limidagi xodimlarni ko'rish ham yo'q … xodim qidirishni ham qo'sh».
describe('Jamoa ro\'yxati: qidiruv va «Mening bo\'limim»', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({
      user: { id: 1, type: 'employee', employee: { id: 1, primary_organization_branch_id: 1, department: { id: 3, name: 'Kotibiyat' } } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(DASHBOARD_EMPLOYEES_BY_CATEGORY).reply(200, {
      present_employees: [emp(11, "G'ofurov Anvar", 3)],
      absent_employees: [emp(12, 'Karimova Dilnoza', 5, 'Buxgalter'), emp(13, 'Tursunov Bek', 3)],
    });
    mock.onGet(new RegExp(TURNSTILE_ATTENDANCE_EVENTS)).reply(200, { items: [], total: 0 });
  });
  afterEach(() => mock.reset());

  it('qidiruv kirill/lotin va apostrofdan qat\'i nazar; donut soni filtrga mos', async () => {
    await renderWithProviders(<AttendanceDetailScreen embedded />);
    expect(await screen.findByText(/Barcha xodimlar \(3\)/)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('attendance.searchPlaceholder')), 'ғофуров');
    await waitFor(() => expect(screen.getByText(/Barcha xodimlar \(1\)/)).toBeTruthy());
    expect(screen.getByText("G'ofurov Anvar")).toBeTruthy();
    expect(screen.queryByText('Karimova Dilnoza')).toBeNull();
  });

  it('«Mening bo\'limim» — faqat o\'z bo\'limi xodimlari', async () => {
    await renderWithProviders(<AttendanceDetailScreen embedded />);
    await screen.findByText(/Barcha xodimlar \(3\)/);
    await fireEvent.press(screen.getByTestId('roster-scope-department'));
    expect(screen.getByText(/Barcha xodimlar \(2\)/)).toBeTruthy();
    expect(screen.queryByText('Karimova Dilnoza')).toBeNull();
    await fireEvent.press(screen.getByTestId('roster-clear'));
    expect(screen.getByText(/Barcha xodimlar \(3\)/)).toBeTruthy();
  });
});

describe('searchFold / rosterCounts', () => {
  it('foldText: kirill → lotin, apostroflar va registr', () => {
    expect(foldText('Ғофуров Ўткир')).toBe('gofurov otkir');
    expect(foldText("G'ofurov")).toBe(foldText('Gʻofurov'));
    expect(matchesQuery('anvar gof', "G'ofurov Anvar")).toBe(true);
    expect(matchesQuery('xyz', "G'ofurov Anvar")).toBe(false);
    expect(matchesQuery('', 'har qanday')).toBe(true);
  });
  it('rosterCounts', () => {
    const r = (status: 'present' | 'late' | 'onLeave' | 'absent') => ({ employee: { id: 1 }, status });
    expect(rosterCounts([r('present'), r('late'), r('absent'), r('absent')])).toEqual({
      total: 4, present: 1, late: 1, onLeave: 0, absent: 2,
    });
  });
});
