// Single source of truth for module navigation. Both the phone Modules grid
// (app/(tabs)/modules.tsx) and the tablet NavRail render from here, so the
// role-filtered set is defined once. Pure: no React, no stores — the caller
// passes the resolved user + live badge counts. Filtering goes through
// canAccessPage so page visibility stays 1:1 with the web (web parity).
import type { TFunction } from 'i18next';
import type { IconName } from '../components/Icon';
import { canAccessPage, type PageKey } from './roles';
import type { User, Employee } from '../types';

export type NavItem = {
  key: string;
  icon: IconName;
  label: string;
  route: string;
  access: PageKey;
  badge?: number;
};
export type NavSection = { title: string; items: NavItem[] };
export type NavContext = {
  user: User | null | undefined;
  employee: Employee | undefined;
  pendingCount: number;
  unreadCount: number;
};

export function buildNavSections(t: TFunction, ctx: NavContext): NavSection[] {
  const { user, employee, pendingCount, unreadCount } = ctx;

  const raw: NavSection[] = [
    {
      title: t('modules.sections.activity'),
      items: [
        { key: 'attendance', icon: 'clock', label: t('modules.labels.attendance'), route: '/attendance-detail', access: 'attendance' },
        { key: 'timesheet', icon: 'calendar', label: t('modules.labels.timesheet'), route: '/tabel', access: 'timesheet' },
        // Web parity (navConfig.js): Navbatchilik pruned unless dept-level duty
        // or group membership.
        ...(user?.is_navbatchi || employee?.department?.has_navbatchilik
          ? [
              { key: 'navbatchilik', icon: 'clock' as IconName, label: t('modules.labels.navbatchilik'), route: '/navbatchilik', access: 'timesheet' as PageKey },
              { key: 'navbatchilikGrid', icon: 'calendar' as IconName, label: t('modules.labels.navbatchilikGrid'), route: '/navbatchilik-grid', access: 'timesheet' as PageKey },
            ]
          : []),
        { key: 'holidays', icon: 'sun', label: t('modules.labels.holidays'), route: '/bayramlar', access: 'timesheet' },
        { key: 'assistant', icon: 'target', label: t('modules.labels.assistant'), route: '/assistant', access: 'assistant' },
        { key: 'requests', icon: 'checklist', label: t('modules.labels.requests'), route: '/work-leaves', access: 'requests', badge: pendingCount },
        { key: 'chairman', icon: 'calendar', label: t('modules.labels.chairman'), route: '/chairman-tasks', access: 'chairman' },
        { key: 'projects', icon: 'board', label: t('modules.labels.projects'), route: '/loyihalar', access: 'projects' },
        { key: 'kpi', icon: 'target', label: t('modules.labels.kpi'), route: '/kpi', access: 'kpi' },
        { key: 'salary', icon: 'wallet', label: t('modules.labels.salary'), route: '/salary', access: 'salary' },
      ],
    },
    {
      title: t('modules.sections.team'),
      items: [
        { key: 'team', icon: 'users', label: t('modules.labels.team'), route: '/team', access: 'team' },
        { key: 'employees', icon: 'idcard', label: t('modules.labels.employees'), route: '/employees-list', access: 'employees' },
        { key: 'directory', icon: 'phone', label: t('modules.labels.directory'), route: '/phone-directory', access: 'directory' },
        { key: 'guests', icon: 'guest', label: t('modules.labels.guests'), route: '/(tabs)/mehmonlar', access: 'guests' },
        { key: 'birthdays', icon: 'gift', label: t('modules.labels.birthdays'), route: '/birthdays', access: 'birthdays' },
      ],
    },
    {
      title: t('modules.sections.other'),
      items: [
        { key: 'documents', icon: 'folder', label: t('modules.labels.documents'), route: '/hujjatlar', access: 'documents' },
        { key: 'support', icon: 'help', label: t('modules.labels.support'), route: '/texnik-yordam', access: 'support' },
        { key: 'news', icon: 'news', label: t('modules.labels.news'), route: '/news', access: 'news' },
        { key: 'notifications', icon: 'bell', label: t('modules.labels.notifications'), route: '/notifications', access: 'notifications', badge: unreadCount },
        { key: 'profile', icon: 'user', label: t('modules.labels.profile'), route: '/(tabs)/profile', access: 'profile' },
      ],
    },
  ];

  return raw
    .map((s) => ({ ...s, items: s.items.filter((it) => canAccessPage(user, it.access)) }))
    .filter((s) => s.items.length > 0);
}

export function flattenNavItems(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}
