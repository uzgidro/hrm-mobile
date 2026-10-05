import fs from 'fs';
import path from 'path';
import { canAccessPage, setNavOverrides, isModuleReady } from '../roles';
import { visibleCatalog, catalogBySection, CATALOG } from '../moduleCatalog';
import type { User } from '@/types';
import i18n from '@/i18n';

const u = (x: Record<string, unknown>) => x as unknown as User;
const emp = (extra: Record<string, unknown> = {}) => u({ id: 1, type: 'employee', employee: { id: 10 }, ...extra });
const hr = emp({ employee: { id: 10, is_multi_org_user: true, multi_org_employee_role: ['hr'] } });
const master = u({ id: 2, type: 'master-admin', employee: { id: 11 } });
const kppAcc = u({ id: 3, type: 'kpp' });
const monAcc = u({ id: 4, type: 'monitoring' });

afterEach(() => setNavOverrides(undefined));

describe('modul katalogi — v2 paritet', () => {
  it("oddiy xodim orders ko'radi, employees/users ko'rmaydi", () => {
    expect(canAccessPage(emp(), 'orders')).toBe(true);
    expect(canAccessPage(emp(), 'employees')).toBe(false);
    expect(canAccessPage(emp(), 'users')).toBe(false);
  });

  it("HR (rol massivda) employees ko'radi", () => {
    expect(canAccessPage(hr, 'employees')).toBe(true);
  });

  it("post akkaunti faqat post sahifalari; kpp — kpp, monitoring — monitoring", () => {
    expect(canAccessPage(kppAcc, 'orders')).toBe(false);
    expect(canAccessPage(kppAcc, 'guests')).toBe(true);
    expect(canAccessPage(kppAcc, 'directory')).toBe(true);
    expect(canAccessPage(kppAcc, 'monitoring')).toBe(false);
    expect(canAccessPage(monAcc, 'kpp')).toBe(false);
  });

  it("ready:false modul hech kimga, hatto master adminga ham ko'rinmaydi", () => {
    const notReady = CATALOG.filter((e) => !isModuleReady(e.page));
    expect(notReady.length).toBeGreaterThan(0);
    for (const e of notReady) expect(canAccessPage(master, e.page)).toBe(false);
  });

  it("nav.modules override modulni o'chiradi (katalogdan ham)", () => {
    setNavOverrides({ news: { enabled: false } });
    expect(canAccessPage(emp(), 'news')).toBe(false);
    expect(visibleCatalog(emp()).some((e) => e.page === 'news')).toBe(false);
  });

  it('override rollarni almashtiradi', () => {
    setNavOverrides({ employees: { roles: ['employee'] } });
    expect(canAccessPage(emp(), 'employees')).toBe(true);
  });

  it("bo'sh bo'limlar tashlanadi, tartib v2 bo'yicha (main, documents, stats, admin)", () => {
    const groups = catalogBySection(visibleCatalog(emp()));
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    const order = ['main', 'documents', 'stats', 'admin'];
    const idx = groups.map((g) => order.indexOf(g.section));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('katalog v2 MODULES ning barcha kalitlarini qamraydi (designSystem dan tashqari)', () => {
    const v2Keys = [
      'home', 'chairmanTasks', 'kpi', 'team', 'services', 'support', 'zoom', 'vehicles', 'projects', 'news',
      'ijro', 'workPlan', 'medical', 'health', 'registrationStatus', 'orders', 'orderTypes', 'tempOrders',
      'letters', 'documents', 'employees', 'attendance', 'myAttendance', 'guests', 'phone', 'duty',
      'requestPermission', 'staffPositions', 'structure', 'responsibles', 'hrQuality', 'trainings', 'learning',
      'inspections', 'reports', 'dictionaries', 'holidays', 'tabelSettings', 'monitoring', 'kpp', 'videoGuide',
      'users', 'registrations', 'auditLog', 'branches', 'turnstiles', 'hik', 'customFields', 'sysHealth', 'lms',
    ];
    const covered = new Set(CATALOG.map((e) => e.moduleKey));
    expect(v2Keys.filter((k) => !covered.has(k))).toEqual([]);
  });

  it('har tayyor katalog yozuvi mavjud route faylga ishora qiladi', () => {
    const root = path.join(__dirname, '../../..');
    for (const e of CATALOG.filter((x) => isModuleReady(x.page))) {
      const clean = e.route.replace(/^\//, '').replace(/\?.*$/, '');
      const candidates = clean === '' ? ['app/(tabs)/index.tsx'] : [`app/${clean}.tsx`, `app/(tabs)/${clean}.tsx`];
      expect({ page: e.page, ok: candidates.some((p) => fs.existsSync(path.join(root, p))) }).toEqual({
        page: e.page,
        ok: true,
      });
    }
  });

  it("sog'liq ko'rigi — faqat hamshira (nurse_branch_ids) yoki bosh admin (v2 needsHealth)", () => {
    expect(canAccessPage(emp(), 'health')).toBe(false);
    expect(canAccessPage(emp({ nurse_branch_ids: [7] }), 'health')).toBe(true);
    expect(canAccessPage(master, 'health')).toBe(true);
  });

  it("zoom — hamma rol (v2 defaultRoles ALL, darvozasiz); post akkaunti yo'q; route /zoom", () => {
    expect(canAccessPage(emp(), 'zoom')).toBe(true);
    expect(canAccessPage(hr, 'zoom')).toBe(true);
    expect(canAccessPage(master, 'zoom')).toBe(true);
    expect(canAccessPage(kppAcc, 'zoom')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'zoom')?.route).toBe('/zoom');
  });

  it("KPI filialda o'chirilgan bo'lsa override ham qaytarolmaydi", () => {
    setNavOverrides({ kpi: { roles: ['employee'] } });
    expect(canAccessPage(emp({ kpi_enabled: false }), 'kpi')).toBe(false);
  });

  it('reports — oddiy xodim faqat rahbar bo\'lsa', () => {
    // reports hali ready emas; darvoza mantig'i ready bo'lganda ishlashi uchun gate funksiyasi tekshiriladi
    const { reportsGate } = jest.requireActual('../roles');
    expect(reportsGate(emp())).toBe(false);
    expect(reportsGate(emp({ is_line_manager: true }))).toBe(true);
  });

  it('har katalog yozuvining nomi 4 tilda tarjima qilingan (xom kalit chiqmaydi)', async () => {
    for (const lng of ['uz-Latn', 'uz-Cyrl', 'ru', 'en']) {
      await i18n.changeLanguage(lng);
      const missing = CATALOG.filter((e) => i18n.t(e.labelKey) === e.labelKey).map((e) => e.page);
      expect({ lng, missing }).toEqual({ lng, missing: [] });
    }
    await i18n.changeLanguage('uz-Latn');
  });
});

describe("marshrut to'qnashuvi yo'q", () => {
  it("app/X.tsx va app/(tabs)/X.tsx bir vaqtda yo'q (expo-router guruh ichidagisini tanlab, stack ekrani ochilmay qoladi)", () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const root = path.join(__dirname, '../../..');
    const tabs = fs.readdirSync(path.join(root, 'app/(tabs)')).filter((f) => f.endsWith('.tsx') && !f.startsWith('_'));
    const clashes = tabs.filter((f) => fs.existsSync(path.join(root, 'app', f)));
    expect(clashes).toEqual([]);
  });
});
