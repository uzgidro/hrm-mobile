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

  it("tibbiy ko'rik — faqat medical_enabled (v2 needsMedical + RequireRole); bosh admin ham bayroqsiz kirmaydi; route /tibbiy-korik", () => {
    expect(canAccessPage(emp(), 'medical')).toBe(false);
    expect(canAccessPage(emp({ medical_enabled: true }), 'medical')).toBe(true);
    expect(canAccessPage(hr, 'medical')).toBe(false);
    expect(canAccessPage({ ...hr, medical_enabled: true } as never, 'medical')).toBe(true);
    expect(canAccessPage(master, 'medical')).toBe(false);
    expect(canAccessPage({ ...master, medical_enabled: true } as never, 'medical')).toBe(true);
    expect(CATALOG.find((e) => e.page === 'medical')?.route).toBe('/tibbiy-korik');
  });

  it("avtopark — v2 needsFleet (canSeeFleet): bosh admin, transport mas'uli yoki tasdiqlovchi; kadr bayroqsiz yo'q; route /avtopark", () => {
    expect(isModuleReady('vehicles')).toBe(true);
    expect(canAccessPage(emp(), 'vehicles')).toBe(false);
    expect(canAccessPage(hr, 'vehicles')).toBe(false);
    expect(canAccessPage(emp({ transport_branch_ids: [29] }), 'vehicles')).toBe(true);
    expect(canAccessPage(emp({ transport_approver_branch_ids: [1] }), 'vehicles')).toBe(true);
    expect(canAccessPage(emp({ transport_branch_ids: [] }), 'vehicles')).toBe(false);
    expect(canAccessPage(master, 'vehicles')).toBe(true);
    expect(canAccessPage(kppAcc, 'vehicles')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'vehicles')?.route).toBe('/avtopark');
  });

  it("KPI filialda o'chirilgan bo'lsa override ham qaytarolmaydi", () => {
    setNavOverrides({ kpi: { roles: ['employee'] } });
    expect(canAccessPage(emp({ kpi_enabled: false }), 'kpi')).toBe(false);
  });

  it("hisobotlar — v2 canSeeReports darvozasi: oddiy xodim faqat rahbar bo'lsa; kadr, bosh admin; post akkaunti yo'q; route /hisobotlar", () => {
    expect(isModuleReady('reports')).toBe(true);
    expect(canAccessPage(emp(), 'reports')).toBe(false);
    expect(canAccessPage(emp({ is_line_manager: true }), 'reports')).toBe(true);
    expect(canAccessPage(hr, 'reports')).toBe(true);
    expect(canAccessPage(master, 'reports')).toBe(true);
    expect(canAccessPage(kppAcc, 'reports')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'reports')?.route).toBe('/hisobotlar');
  });

  it("tizim holati — v2 ADMIN_ONLY, SYSTEM_ADMIN_KEYS da yo'q: faqat bosh admin; AKT/admin hisobi, ministr, kadr yo'q; route /tizim-holati", () => {
    expect(isModuleReady('sysHealth')).toBe(true);
    expect(canAccessPage(master, 'sysHealth')).toBe(true);
    expect(canAccessPage(emp(), 'sysHealth')).toBe(false);
    expect(canAccessPage(hr, 'sysHealth')).toBe(false);
    expect(canAccessPage(emp({ akt_branch_ids: [1] }), 'sysHealth')).toBe(false);
    expect(canAccessPage(u({ id: 5, type: 'admin' }), 'sysHealth')).toBe(false);
    expect(
      canAccessPage(emp({ employee: { id: 10, is_multi_org_user: true, multi_org_employee_role: 'ministr' } }), 'sysHealth'),
    ).toBe(false);
    expect(canAccessPage(kppAcc, 'sysHealth')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'sysHealth')?.route).toBe('/tizim-holati');
  });

  it("LMS — v2 ADMIN_ONLY, SYSTEM_ADMIN_KEYS da yo'q: faqat bosh admin; AKT/admin hisobi va kadr yo'q; route /lms", () => {
    expect(isModuleReady('lms')).toBe(true);
    expect(canAccessPage(master, 'lms')).toBe(true);
    expect(canAccessPage(emp(), 'lms')).toBe(false);
    expect(canAccessPage(hr, 'lms')).toBe(false);
    expect(canAccessPage(emp({ akt_branch_ids: [1] }), 'lms')).toBe(false);
    expect(canAccessPage(u({ id: 5, type: 'admin' }), 'lms')).toBe(false);
    expect(canAccessPage(kppAcc, 'lms')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'lms')?.route).toBe('/lms');
  });

  it("audit jurnali — v2 ADMIN_ONLY, SYSTEM_ADMIN_KEYS da yo'q: faqat bosh admin; admin hisobi/AKT, kadr yo'q; route /audit-log", () => {
    expect(isModuleReady('auditLog')).toBe(true);
    expect(canAccessPage(master, 'auditLog')).toBe(true);
    expect(canAccessPage(emp(), 'auditLog')).toBe(false);
    expect(canAccessPage(hr, 'auditLog')).toBe(false);
    expect(canAccessPage(emp({ akt_branch_ids: [1] }), 'auditLog')).toBe(false);
    expect(canAccessPage(u({ id: 5, type: 'admin' }), 'auditLog')).toBe(false);
    expect(canAccessPage(monAcc, 'auditLog')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'auditLog')?.route).toBe('/audit-log');
  });

  it("foydalanuvchilar — v2 ADMIN_ONLY, SYSTEM_ADMIN_KEYS da yo'q: faqat bosh admin; admin hisobi/AKT, kadr yo'q; route /foydalanuvchilar", () => {
    expect(isModuleReady('users')).toBe(true);
    expect(canAccessPage(master, 'users')).toBe(true);
    expect(canAccessPage(emp(), 'users')).toBe(false);
    expect(canAccessPage(hr, 'users')).toBe(false);
    expect(canAccessPage(emp({ akt_branch_ids: [1] }), 'users')).toBe(false);
    expect(canAccessPage(u({ id: 5, type: 'admin' }), 'users')).toBe(false);
    expect(canAccessPage(kppAcc, 'users')).toBe(false);
    expect(CATALOG.find((e) => e.page === 'users')?.route).toBe('/foydalanuvchilar');
  });

  it("registratsiyalar — v2 ADMIN_ONLY + SYSTEM_ADMIN_KEYS: bosh admin, admin hisobi, AKT xodimi; kadr/xodim/post yo'q; mehmon holati ekrani alohida; route /registratsiyalar", () => {
    expect(isModuleReady('registrations')).toBe(true);
    expect(canAccessPage(master, 'registrations')).toBe(true);
    expect(canAccessPage(u({ id: 5, type: 'admin' }), 'registrations')).toBe(true);
    expect(canAccessPage(emp({ akt_branch_ids: [1] }), 'registrations')).toBe(true);
    expect(canAccessPage(emp(), 'registrations')).toBe(false);
    expect(canAccessPage(hr, 'registrations')).toBe(false);
    expect(canAccessPage(kppAcc, 'registrations')).toBe(false);
    expect(canAccessPage(u({ id: 7, type: 'guest' }), 'registrations')).toBe(false);
    expect(canAccessPage(u({ id: 7, type: 'guest' }), 'registrationStatus')).toBe(true);
    expect(CATALOG.find((e) => e.page === 'registrations')?.route).toBe('/registratsiyalar');
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
