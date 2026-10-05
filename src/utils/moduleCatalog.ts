// v3 modul katalogi — web v2 `navConfig.ts` MODULES tartibida, har v2 modulning
// MOBIL ko'rinishi (route, ikonka, rang, bo'lim). Kim ko'rishini bu fayl HAL
// QILMAYDI — u `canAccessPage` (roles.ts: defaultRoles + darvozalar + nav.modules
// override + `ready`). Modullar ekrani, NavRail va qidiruv shu ro'yxatdan quriladi.
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import type { User } from '@/types';
import { canAccessPage, type NavModuleOverrides, type PageKey } from './roles';

export type CatalogSection = 'main' | 'documents' | 'stats' | 'admin';

export type CatalogEntry = {
  page: PageKey;
  /** v2 modul kaliti (`nav.modules` sozlamasidagi id). */
  moduleKey: string;
  route: string;
  icon: IconName;
  tint: ModuleTintKey;
  section: CatalogSection;
  /** i18n kaliti (`modules.labels.<page>`). */
  labelKey: string;
};

const e = (
  page: PageKey,
  moduleKey: string,
  route: string,
  icon: IconName,
  tint: ModuleTintKey,
  section: CatalogSection,
): CatalogEntry => ({ page, moduleKey, route, icon, tint, section, labelKey: `modules.labels.${page}` });

export const CATALOG: CatalogEntry[] = [
  e('home', 'home', '/', 'home', 'violet', 'main'),
  e('chairman', 'chairmanTasks', '/chairman-tasks', 'calendar', 'violet', 'main'),
  e('kpi', 'kpi', '/kpi', 'target', 'drop', 'main'),
  e('team', 'team', '/team', 'users', 'green', 'main'),
  e('services', 'services', '/interaktiv-xizmatlar', 'board', 'cyan', 'main'),
  e('support', 'support', '/texnik-yordam', 'help', 'pink', 'main'),
  e('zoom', 'zoom', '/zoom', 'globe', 'drop', 'main'),
  e('vehicles', 'vehicles', '/avtopark', 'mapPin', 'amber', 'main'),
  e('projects', 'projects', '/loyihalar', 'board', 'violet', 'main'),
  e('news', 'news', '/news', 'news', 'orange', 'main'),
  e('ijro', 'ijro', '/ijro', 'checklist', 'pink', 'main'),
  e('workPlan', 'workPlan', '/ish-rejasi', 'calendar', 'green', 'main'),
  e('medical', 'medical', '/tibbiy-korik', 'check', 'green', 'stats'),
  e('health', 'health', '/sogliq-korigi', 'check', 'pink', 'stats'),
  e('registrationStatus', 'registrationStatus', '/registratsiya-holati', 'idcard', 'drop', 'main'),

  e('orders', 'orders', '/documents?seg=orders', 'orders', 'orange', 'documents'),
  e('orderTypes', 'orderTypes', '/buyruq-turlari', 'checklist', 'orange', 'documents'),
  e('tempOrders', 'tempOrders', '/vaqtinchalik-buyruqlar', 'clock', 'orange', 'documents'),
  e('letters', 'letters', '/documents?seg=letters', 'mail', 'green', 'documents'),
  e('documents', 'documents', '/hujjatlar', 'folder', 'drop', 'documents'),

  e('employees', 'employees', '/employees-list', 'idcard', 'violet', 'stats'),
  e('attendance', 'attendance', '/attendance-detail', 'clock', 'green', 'stats'),
  e('timesheet', 'myAttendance', '/tabel', 'calendar', 'green', 'stats'),
  e('guests', 'guests', '/(tabs)/mehmonlar', 'guest', 'amber', 'stats'),
  e('directory', 'phone', '/phone-directory', 'phone', 'cyan', 'stats'),
  e('duty', 'duty', '/navbatchilik', 'clock', 'amber', 'stats'),
  e('requests', 'requestPermission', '/work-leaves', 'checklist', 'pink', 'stats'),
  e('staffPositions', 'staffPositions', '/shtat', 'briefcase', 'violet', 'stats'),
  e('structure', 'structure', '/tuzilma', 'building', 'cyan', 'stats'),
  e('responsibles', 'responsibles', '/masullar', 'user', 'grey', 'stats'),
  e('hrQuality', 'hrQuality', '/kadr-nazorati', 'eye', 'pink', 'stats'),
  e('trainings', 'trainings', '/malaka-oshirish', 'graduation', 'drop', 'stats'),
  e('learning', 'learning', '/oquv-markazi', 'graduation', 'green', 'stats'),
  e('inspections', 'inspections', '/auditlar', 'checklist', 'amber', 'stats'),
  e('reports', 'reports', '/hisobotlar', 'chart', 'violet', 'stats'),
  e('kpp', 'kpp', '/kpp', 'lock', 'amber', 'stats'),

  e('dictionaries', 'dictionaries', '/malumotnomalar', 'doc', 'grey', 'admin'),
  e('holidays', 'holidays', '/bayramlar', 'sun', 'amber', 'admin'),
  e('tabelSettings', 'tabelSettings', '/tabel-sozlamalari', 'settings', 'grey', 'admin'),
  e('monitoring', 'monitoring', '/monitoring-panel', 'eye', 'violet', 'admin'),
  e('videoGuide', 'videoGuide', '/video-qollanma', 'eye', 'pink', 'admin'),
  e('users', 'users', '/foydalanuvchilar', 'users', 'grey', 'admin'),
  e('registrations', 'registrations', '/registratsiyalar', 'idcard', 'grey', 'admin'),
  e('auditLog', 'auditLog', '/audit-log', 'doc', 'grey', 'admin'),
  e('branches', 'branches', '/filiallar', 'building', 'grey', 'admin'),
  e('turnstiles', 'turnstiles', '/turniketlar', 'fingerprint', 'grey', 'admin'),
  e('terminals', 'hik', '/terminallar', 'fingerprint', 'cyan', 'admin'),
  e('customFields', 'customFields', '/qoshimcha-maydonlar', 'edit', 'grey', 'admin'),
  e('sysHealth', 'sysHealth', '/tizim-holati', 'chart', 'grey', 'admin'),
  e('lms', 'lms', '/lms', 'globe', 'grey', 'admin'),
];

/** Foydalanuvchi ko'ra oladigan modullar (katalog tartibida). */
export function visibleCatalog(user: User | null | undefined, overrides?: NavModuleOverrides): CatalogEntry[] {
  return CATALOG.filter((m) =>
    overrides === undefined ? canAccessPage(user, m.page) : canAccessPage(user, m.page, overrides),
  );
}

/**
 * Ichki (detal / forma) ekranlar — qaysi modulga tegishli. v2 `isPathAllowed` kabi «detal o'z
 * ro'yxatiga ergashadi» (`/employees/7` → `/employees`), faqat mobil yo'llar tekis bo'lgani uchun
 * prefiks o'rniga aniq jadval. NavRail shu modulni faol qilib ko'rsatadi.
 */
export const DETAIL_OWNER: Readonly<Record<string, PageKey>> = {
  '/hisobot': 'reports',
  '/avtomobil': 'vehicles',
  '/loyiha-detail': 'projects',
  '/loyiha-card-detail': 'projects',
  '/loyiha-form': 'projects',
  '/texnik-yordam-detail': 'support',
  '/texnik-yordam-form': 'support',
  '/mehmon-detail': 'guests',
  '/mehmon-form': 'guests',
  '/order-detail': 'orders',
  '/create-order': 'orders',
  '/order-document': 'orders',
  '/letter-detail': 'letters',
  '/create-letter': 'letters',
  '/letter-document': 'letters',
  '/submit-report': 'letters',
  '/hujjat-viewer': 'documents',
  '/kpi-entry': 'kpi',
  '/kpi-team': 'kpi',
  '/navbatchilik-grid': 'duty',
  '/chairman-task-form': 'chairman',
  '/leave-detail': 'requests',
  '/create-leave': 'requests',
  '/team-leaves': 'requests',
  '/create-news': 'news',
  '/employee-calendar': 'employees',
};

function barePath(route: string): string {
  return route.split('?')[0]!.replace('/(tabs)', '').replace(/\/+$/, '') || '/';
}

/**
 * Hozir ochiq ekran qaysi katalog moduliga tegishli (NavRail faol bandi). `pathname` —
 * expo-router `usePathname()` (guruhlarsiz), `seg` — Hujjatlar tabining segmenti.
 * Tab ildizlari (`/`, `/attendance`, `/modules`…) — modul emas (`null`), Hujjatlar tabi
 * esa ochiq segment moduli (`?seg=letters` → `letters`).
 */
export function activeModule(pathname: string, seg?: string | string[]): PageKey | null {
  const path = barePath(pathname);
  const segment = Array.isArray(seg) ? seg[0] : seg;
  if (path === '/documents') {
    return segment === 'orders' || segment === 'letters' || segment === 'documents' ? segment : null;
  }
  if (path === '/') return null;
  const own = CATALOG.find((m) => barePath(m.route) === path);
  if (own) return own.page;
  return DETAIL_OWNER[path] ?? null;
}

const SECTION_ORDER: CatalogSection[] = ['main', 'documents', 'stats', 'admin'];

/** v2 `groupNav`: bo'limlar tartibi saqlanadi, bo'sh bo'lim tashlanadi. */
export function catalogBySection(entries: CatalogEntry[]): { section: CatalogSection; items: CatalogEntry[] }[] {
  return SECTION_ORDER.map((section) => ({ section, items: entries.filter((x) => x.section === section) })).filter(
    (g) => g.items.length > 0,
  );
}
