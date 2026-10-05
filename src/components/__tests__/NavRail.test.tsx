import React from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { NavRail } from '../NavRail';
import { useAuthStore } from '../../store/authStore';

// Joriy yo'l — har testda boshqarilsin (rail endi root layout'da, har ekran yonida).
const mockRoute: { pathname: string; seg?: string } = { pathname: '/' };
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  usePathname: () => mockRoute.pathname,
  useGlobalSearchParams: () => ({ seg: mockRoute.seg }),
}));

// v3: NavRail = planshetdagi tab bar — `visibleTabs` (asosiy qator) + v2 katalogi
// bo'limlari (canAccessPage orqali) bitta manbadan.
describe('NavRail', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, is_multi_org_user: false } } as any,
      isAuthenticated: true,
    } as any);
  });

  it('xodim uchun asosiy tablar', async () => {
    const { getByTestId } = await renderWithProviders(<NavRail />);
    expect(getByTestId('rail-index')).toBeTruthy();
    expect(getByTestId('rail-documents')).toBeTruthy();
    expect(getByTestId('rail-modules')).toBeTruthy();
  });

  it("KPP post akkaunti: faqat Post va Profil, hujjatlar yo'q (web-parity)", async () => {
    useAuthStore.setState({ user: { type: 'kpp' } as any, isAuthenticated: true } as any);
    const { queryByTestId, getByTestId } = await renderWithProviders(<NavRail />);
    expect(getByTestId('rail-post')).toBeTruthy();
    expect(getByTestId('rail-profile')).toBeTruthy();
    expect(queryByTestId('rail-index')).toBeNull();
    expect(queryByTestId('rail-documents')).toBeNull();
  });

  it("katalog bo'limidagi ruxsatsiz modul chiqmaydi", async () => {
    const { queryByTestId, getByTestId } = await renderWithProviders(<NavRail />);
    expect(getByTestId('rail-mod-news')).toBeTruthy();
    expect(queryByTestId('rail-mod-employees')).toBeNull();
  });
});

describe('NavRail — safe area', () => {
  it("yuqori/chap/pastki xavfsiz chegaralarni hisobga oladi (notch ostida qolmaydi)", async () => {
    const { StyleSheet } = jest.requireActual('react-native');
    useAuthStore.setState({ user: { type: 'employee', employee: { id: 1 } } as any, isAuthenticated: true } as any);
    const { getByTestId } = await renderWithProviders(<NavRail />);
    const style = StyleSheet.flatten(getByTestId('nav-rail').props.style);
    expect(style.paddingTop).toBeGreaterThanOrEqual(47); // test metrics: insets.top = 47
    expect(style.paddingBottom).toBeGreaterThanOrEqual(34);
  });
});

describe('NavRail — takror yo\u2019q', () => {
  it("tab sifatida chiqqan modul (monitoring) katalog bo'limida takrorlanmaydi", async () => {
    useAuthStore.setState({
      user: { type: 'employee', employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: 'monitoring' } } as any,
      isAuthenticated: true,
    } as any);
    const { getByTestId, queryByTestId } = await renderWithProviders(<NavRail />);
    expect(getByTestId('rail-monitoring')).toBeTruthy();
    expect(queryByTestId('rail-mod-monitoring')).toBeNull();
  });
});

describe('NavRail — ochiq modul ekrani faol (push qilingan ekranda ham)', () => {
  const hr = { type: 'employee', employee: { id: 1, is_multi_org_user: true, multi_org_employee_role: 'hr' } } as any;
  const selected = (el: { props: { accessibilityState?: { selected?: boolean } } }) => !!el.props.accessibilityState?.selected;
  beforeEach(() => useAuthStore.setState({ user: hr, isAuthenticated: true } as any));
  afterEach(() => {
    mockRoute.pathname = '/';
    mockRoute.seg = undefined;
  });

  it('modul ekrani (/zoom) — Zoom bandi faol, Asosiy emas', async () => {
    mockRoute.pathname = '/zoom';
    const { getByTestId } = await renderWithProviders(<NavRail />);
    expect(selected(getByTestId('rail-mod-zoom'))).toBe(true);
    expect(selected(getByTestId('rail-index'))).toBe(false);
  });

  it("detal ekrani (/hisobot) o'z moduliga — Hisobotlar — ergashadi", async () => {
    mockRoute.pathname = '/hisobot';
    const { getByTestId } = await renderWithProviders(<NavRail />);
    expect(selected(getByTestId('rail-mod-reports'))).toBe(true);
    expect(selected(getByTestId('rail-mod-zoom'))).toBe(false);
  });

  it('Hujjatlar tabi ?seg=letters — tab va Xatlar bandi faol', async () => {
    mockRoute.pathname = '/documents';
    mockRoute.seg = 'letters';
    const { getByTestId } = await renderWithProviders(<NavRail />);
    expect(selected(getByTestId('rail-documents'))).toBe(true);
    expect(selected(getByTestId('rail-mod-letters'))).toBe(true);
    expect(selected(getByTestId('rail-mod-orders'))).toBe(false);
  });
});
