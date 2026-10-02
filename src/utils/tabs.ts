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
  // Devonxona / admin uchun Bosh sahifa yo'q (v2 ularni boshqa sahifaga
  // yo'naltiradi) — tablar to'g'ridan-to'g'ri o'sha joydan boshlanadi. Mehmonning
  // Asosiy tabi — ariza holati (v2 RegistrationStatusPage, app/(tabs)/index.tsx).
  const tabs: TabKey[] =
    board === 'post'
      ? ['post']
      : board === 'monitoring'
        ? ['monitoring']
        : board === 'employee' || board === 'leader' || board === 'guest'
          ? ['index']
          : [];
  if (canAccessPage(user, 'timesheet') || canAccessPage(user, 'attendance')) tabs.push('attendance');
  if (canAccessPage(user, 'orders') || canAccessPage(user, 'letters') || canAccessPage(user, 'documents')) {
    tabs.push('documents');
  }
  tabs.push('modules', 'profile');
  return tabs;
}

/**
 * Faol tab foydalanuvchiga ko'rinmasa (rol auth/me dan keyin o'zgardi — keshdagi
 * foydalanuvchi bilan ochilgan tablar qotib qoladi), qaysi tabga o'tish kerak.
 * Faqat asosiy tablar tekshiriladi; redirect-tablar (orders/letters) va barsiz
 * ekranlar (mehmonlar) o'z yo'lini o'zi hal qiladi.
 */
export function tabRedirect(active: string | undefined, visible: TabKey[]): TabKey | null {
  if (!active || !(ALL_TABS as string[]).includes(active)) return null;
  return visible.includes(active as TabKey) ? null : (visible[0] ?? null);
}
