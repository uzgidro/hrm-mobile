import { visibleTabs, TAB_META, startTab, startRoute, tabRoute, tabRedirect as redirectFn } from '../tabs';
import { setNavOverrides } from '@/utils/roles';
import type { User } from '@/types';

const u = (x: Record<string, unknown>) => x as unknown as User;
const emp = u({ id: 1, type: 'employee', employee: { id: 1 } });

afterEach(() => setNavOverrides(undefined));

describe('visibleTabs — rolga qarab', () => {
  it('oddiy xodim', () => {
    expect(visibleTabs(emp)).toEqual(['index', 'attendance', 'documents', 'modules', 'profile']);
  });
  // Kiosk akkaunt: post ekrani birinchi + Modullar (v2 POST_ACCOUNT_KEYS: phone, guests).
  it('kpp kiosk', () => expect(visibleTabs(u({ id: 1, type: 'kpp' }))).toEqual(['post', 'modules', 'profile']));
  it('monitoring kiosk', () =>
    expect(visibleTabs(u({ id: 1, type: 'monitoring' }))).toEqual(['monitoring', 'modules', 'profile']));
  // KPP ROLIDAGI XODIM: v2 getNavForUser unga kpp roli uchun to'liq katalogni beradi
  // (buyruqlar, xatlar, o'z davomati…) — post tabi birinchi, qolganlari yo'qolmaydi.
  it('kpp rolidagi xodim (massivda) — post + davomat + hujjatlar + modullar', () => {
    const kppEmp = u({ id: 2, type: 'employee', employee: { id: 5, is_multi_org_user: true, multi_org_employee_role: ['kpp'] } });
    expect(visibleTabs(kppEmp)).toEqual(['post', 'attendance', 'documents', 'modules', 'profile']);
  });
  it("monitoring operatori xodim — monitoring birinchi, hujjatlar saqlanadi", () => {
    const monEmp = u({ id: 3, type: 'employee', employee: { id: 6, is_multi_org_user: true, multi_org_employee_role: 'monitoring_operator' } });
    const tabs = visibleTabs(monEmp);
    expect(tabs[0]).toBe('monitoring');
    expect(tabs).toEqual(expect.arrayContaining(['documents', 'modules', 'profile']));
  });
  it("devonxona — Asosiy tabi yo'q (v2 uni /orders ga yo'naltiradi)", () => {
    const ch = u({ id: 4, type: 'employee', employee: { id: 7, is_multi_org_user: true, multi_org_employee_role: 'chancellery' } });
    expect(visibleTabs(ch)).toEqual(['attendance', 'documents', 'modules', 'profile']);
  });
  // v2: mehmonning bosh sahifasi — RegistrationStatusPage. Mobil'da Asosiy tabining o'zi
  // ariza holatini ko'rsatadi (app/(tabs)/index.tsx), redirect emas — tablar qoladi.
  it('mehmon — Asosiy (ariza holati) + Modullar + Profil', () =>
    expect(visibleTabs(u({ id: 1, type: 'guest' }))).toEqual(['index', 'modules', 'profile']));
  // v2 DashboardPage: admin hisobi → /filiallar. Mobil'da Asosiy tabining o'zi Filiallar ekrani.
  it('filial admin akkaunti — Asosiy (Filiallar) + Modullar + Profil', () =>
    expect(visibleTabs(u({ id: 1, type: 'admin' }))).toEqual(['index', 'modules', 'profile']));
  it("filial admin akkaunti, Filiallar moduli o'chirilgan — Asosiy yo'q", () => {
    setNavOverrides({ branches: { enabled: false } });
    expect(visibleTabs(u({ id: 1, type: 'admin' }))).toEqual(['modules', 'profile']);
  });
  it("uchala hujjat moduli o'chirilsa documents tabi yo'q", () => {
    setNavOverrides({ orders: { enabled: false }, letters: { enabled: false }, documents: { enabled: false } });
    expect(visibleTabs(emp)).not.toContain('documents');
  });
  it("faqat bittasi qolsa ham documents tabi bor", () => {
    setNavOverrides({ orders: { enabled: false }, letters: { enabled: false } });
    expect(visibleTabs(emp)).toContain('documents');
  });
  it('har tabning meta ma\'lumoti bor', () => {
    for (const k of ['index', 'attendance', 'documents', 'modules', 'profile', 'post', 'monitoring'] as const) {
      expect(TAB_META[k].labelKey).toMatch(/^tabs\./);
    }
  });
});

describe('tabRedirect — rol o\u2019zgarsa yashirin tabda qolmaslik', () => {
  const { tabRedirect } = jest.requireActual('../tabs');
  it.each<[string | undefined, string[], string | null]>([
    ['post', ['monitoring', 'attendance', 'documents', 'modules', 'profile'], 'monitoring'],
    ['index', ['post', 'modules', 'profile'], 'post'],
    ['documents', ['index', 'attendance', 'documents', 'modules', 'profile'], null],
    ['orders', ['index', 'modules', 'profile'], null], // redirect-tablar — o'zi yo'naltiradi
    ['mehmonlar', ['index', 'modules', 'profile'], null], // barsiz ekran
    [undefined, ['index'], null],
  ])('%s → %s', (active, visible, expected) => expect(tabRedirect(active, visible)).toBe(expected));
});

describe("startTab / startRoute — ilova qaysi tabdan boshlanadi (v2 DashboardPage)", () => {
  const ch = u({ id: 4, type: 'employee', employee: { id: 7, is_multi_org_user: true, multi_org_employee_role: 'chancellery' } });
  // Filial devonxonasi (leadership_role='chancellery') — v2 isAnyChancellery.
  const branchCh = u({ id: 5, type: 'employee', employee: { id: 8 }, chancellery_branch_ids: [3] });

  it("devonxona — Davomat emas, Hujjatlar · Buyruqlar (v2 <Navigate to=\"/orders\">)", () => {
    expect(startTab(ch)).toBe('documents');
    expect(startRoute(ch)).toBe('/(tabs)/documents?seg=orders');
  });
  it('filial devonxonasi ham', () => {
    expect(startTab(branchCh)).toBe('documents');
    expect(startRoute(branchCh)).toBe('/(tabs)/documents?seg=orders');
  });
  it("master-admin devonxona rolida bo'lsa ham — o'z bosh sahifasi (v2: && !isMasterAdmin)", () => {
    const ma = u({ id: 6, type: 'master-admin', chancellery_branch_ids: [3] });
    expect(startTab(ma)).toBe('index');
  });
  it("devonxonada hujjat modullari o'chirilgan bo'lsa — birinchi ko'rinadigan tab", () => {
    setNavOverrides({ orders: { enabled: false }, letters: { enabled: false }, documents: { enabled: false } });
    expect(startTab(ch)).toBe(visibleTabs(ch)[0]);
    expect(startRoute(ch)).toBe(tabRoute(visibleTabs(ch)[0]!));
  });
  it.each<[string, User, string]>([
    ['xodim', emp, '/(tabs)'],
    ['kpp kiosk', u({ id: 1, type: 'kpp' }), '/(tabs)/post'],
    ['monitoring kiosk', u({ id: 1, type: 'monitoring' }), '/(tabs)/monitoring'],
    ['mehmon', u({ id: 1, type: 'guest' }), '/(tabs)'],
  ])('%s', (_l, user, route) => expect(startRoute(user)).toBe(route));

  it("devonxona yashirin Asosiy tabda (`/`) qolsa — Hujjatlarga yo'naltiriladi", () => {
    const visible = visibleTabs(ch);
    expect(redirectFn('index', visible, startTab(ch, visible))).toBe('documents');
  });
});
