import { visibleTabs, TAB_META } from '../tabs';
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
  it('filial admin akkaunti — Modullar va Profil', () =>
    expect(visibleTabs(u({ id: 1, type: 'admin' }))).toEqual(['modules', 'profile']));
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
