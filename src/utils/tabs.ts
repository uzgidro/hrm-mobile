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
  if (board === 'post') return ['post', 'profile'];
  if (board === 'monitoring') return ['monitoring', 'profile'];
  const tabs: TabKey[] = ['index'];
  if (canAccessPage(user, 'timesheet') || canAccessPage(user, 'attendance')) tabs.push('attendance');
  if (canAccessPage(user, 'orders') || canAccessPage(user, 'letters') || canAccessPage(user, 'documents')) {
    tabs.push('documents');
  }
  tabs.push('modules', 'profile');
  return tabs;
}
