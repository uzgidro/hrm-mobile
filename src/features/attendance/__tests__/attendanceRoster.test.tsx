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

const emp = (id: number, name: string, deptId: number, position = 'Muhandis', razryad: number | null = null) => ({
  id,
  legal_name: name,
  job_position: { id: 1, name: position, razryad },
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

// 2026-10-06: «Mening bo'limim qismida ketma-ketlikni razryadga qarab chiqadigan qilish kerak».
describe("«Mening bo'limim» razryad bo'yicha", () => {
  // Fayl yig'ilishida yaratilsa yuqoridagi describe'ning adapterini almashtirib qo'yadi.
  let mock: MockAdapter;
  beforeEach(async () => {
    mock = new MockAdapter(apiClient);
    await i18n.changeLanguage('uz-Latn');
    useAuthStore.setState({
      user: { id: 1, type: 'employee', employee: { id: 1, primary_organization_branch_id: 1, department: { id: 3, name: 'Kotibiyat' } } } as never,
      isAuthenticated: true,
    } as never);
    mock.onGet(DASHBOARD_EMPLOYEES_BY_CATEGORY).reply(200, {
      present_employees: [emp(21, 'Aliyev Bobur', 3, 'Mutaxassis', 9)],
      absent_employees: [
        emp(22, 'Botirov Sardor', 3, 'Inspektor', null),
        emp(23, 'Valiyev Jasur', 3, "Bo'lim boshlig'i", 15),
        emp(24, 'Gulova Nilufar', 3, 'Bosh mutaxassis', 12),
        emp(25, 'Abdullayev Aziz', 5, 'Direktor', 20),
      ],
    });
    mock.onGet(new RegExp(TURNSTILE_ATTENDANCE_EVENTS)).reply(200, { items: [], total: 0 });
  });
  afterEach(() => mock.restore());

  it("razryad kattasi tepada, razryadsiz oxirida; filial ro'yxati alifbo tartibida", async () => {
    await renderWithProviders(<AttendanceDetailScreen embedded />);
    await screen.findByText(/Barcha xodimlar \(5\)/);
    // getAllByText daraxt (ekran) tartibida qaytaradi.
    const order = () =>
      screen.getAllByText(/^(Aliyev Bobur|Botirov Sardor|Valiyev Jasur|Gulova Nilufar|Abdullayev Aziz)$/).map((n) => n.props.children);
    expect(order()).toEqual(['Abdullayev Aziz', 'Aliyev Bobur', 'Botirov Sardor', 'Gulova Nilufar', 'Valiyev Jasur']);
    await fireEvent.press(screen.getByTestId('roster-scope-department'));
    expect(order()).toEqual(['Valiyev Jasur', 'Gulova Nilufar', 'Aliyev Bobur', 'Botirov Sardor']);
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
