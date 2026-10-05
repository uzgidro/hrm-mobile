// v3 tab tuzilmasi — rolga qarab (spec §5). Post/monitoring akkauntlari o'z
// ish ekrani + profil; qolganlar: Asosiy · Davomat · Hujjatlar · Modullar · Profil.
// Tab ko'rinishi canAccessPage (v2 katalogi + nav.modules) orqali.
import type { User } from '@/types';
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import { canAccessPage } from './roles';
import { homeBoardFor } from './homeBoard';

export type TabKey = 'index' | 'attendance' | 'documents' | 'modules' | 'profile' | 'post' | 'monitoring';

export const ALL_TABS: TabKey[] = ['index', 'attendance', 'documents', 'modules', 'profile', 'post', 'monitoring'];

export const TAB_META: Record<TabKey, { icon: IconName; tint: ModuleTintKey; labelKey: string; testID: string }> = {
  index: { icon: 'home', tint: 'violet', labelKey: 'tabs.home', testID: 'tab-home' },
  attendance: { icon: 'clock', tint: 'green', labelKey: 'tabs.attendance', testID: 'tab-attendance' },
  documents: { icon: 'orders', tint: 'orange', labelKey: 'tabs.documents', testID: 'tab-documents' },
  modules: { icon: 'grid', tint: 'drop', labelKey: 'tabs.modules', testID: 'tab-modules' },
  profile: { icon: 'user', tint: 'pink', labelKey: 'tabs.profile', testID: 'tab-profile' },
  post: { icon: 'lock', tint: 'amber', labelKey: 'tabs.post', testID: 'tab-post' },
  monitoring: { icon: 'eye', tint: 'violet', labelKey: 'tabs.monitoring', testID: 'tab-monitoring' },
};

export function visibleTabs(user: User | null | undefined): TabKey[] {
  const board = homeBoardFor(user);
  // Post/monitoring paneli — birinchi tab o'sha ish ekrani. Qolgan tablar baribir
  // canAccessPage bo'yicha: KPP/monitoring ROLIDAGI xodim v2'da to'liq katalogni
  // ko'radi, kiosk akkaunt esa Modullar orqali ma'lumotnoma/mehmonlarga kiradi.
  // Devonxona uchun Bosh sahifa yo'q (v2 uni /orders ga yo'naltiradi) — Asosiy tab
  // ko'rsatilmaydi, Hujjatlar tabi o'z o'rnida. Mehmonning Asosiy tabi — ariza holati
  // (v2 RegistrationStatusPage), admin hisobiniki — Filiallar (v2 DashboardPage →
  // /filiallar); ikkalasi ham app/(tabs)/index.tsx da. Filiallar moduli o'chirilgan
  // bo'lsa admin Modullardan boshlaydi.
  const homeTab =
    board === 'employee' ||
    board === 'leader' ||
    board === 'guest' ||
    (board === 'admin' && canAccessPage(user, 'branches'));
  const tabs: TabKey[] = board === 'post' ? ['post'] : board === 'monitoring' ? ['monitoring'] : homeTab ? ['index'] : [];
  if (canAccessPage(user, 'timesheet') || canAccessPage(user, 'attendance')) tabs.push('attendance');
  if (canAccessPage(user, 'orders') || canAccessPage(user, 'letters') || canAccessPage(user, 'documents')) {
    tabs.push('documents');
  }
  tabs.push('modules', 'profile');
  return tabs;
}

/** Tabning expo-router yo'li (`index` — guruh ildizi). */
export function tabRoute(key: TabKey): string {
  return key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
}

/**
 * Ilova qaysi tabdan boshlanadi. Odatda — birinchi ko'rinadigan tab; devonxona esa
 * v2 `DashboardPage` kabi buyruqlar reyestridan (`<Navigate to="/orders">`, mobil:
 * Hujjatlar tabi, Buyruqlar segmenti) — o'z tabelidan emas.
 */
export function startTab(user: User | null | undefined, visible: TabKey[] = visibleTabs(user)): TabKey | undefined {
  if (homeBoardFor(user) === 'chancellery' && visible.includes('documents')) return 'documents';
  return visible[0];
}

/** `startTab` ning yo'li; devonxona uchun Buyruqlar segmenti bilan. */
export function startRoute(user: User | null | undefined, visible: TabKey[] = visibleTabs(user)): string | null {
  const tab = startTab(user, visible);
  if (!tab) return null;
  return homeBoardFor(user) === 'chancellery' && tab === 'documents' ? '/(tabs)/documents?seg=orders' : tabRoute(tab);
}

/**
 * Faol tab foydalanuvchiga ko'rinmasa (rol auth/me dan keyin o'zgardi — keshdagi
 * foydalanuvchi bilan ochilgan tablar qotib qoladi), qaysi tabga o'tish kerak.
 * Faqat asosiy tablar tekshiriladi; redirect-tablar (orders/letters) va barsiz
 * ekranlar (mehmonlar) o'z yo'lini o'zi hal qiladi. Yo'nalish — boshlang'ich tab
 * (`startTab`): devonxona `/` ni ochsa (Asosiy tabi yashirin) Hujjatlarga tushadi.
 */
export function tabRedirect(
  active: string | undefined,
  visible: TabKey[],
  start: TabKey | undefined = visible[0],
): TabKey | null {
  if (!active || !(ALL_TABS as string[]).includes(active)) return null;
  return visible.includes(active as TabKey) ? null : (start ?? null);
}
