// The registrar's flat list of sections regrouped into four groups («Barcha bo'limlar»).
// Roles and section switches are the same as the old flat links, so nothing becomes reachable by mistake.
import type { IconName } from '@/components/Icon';
import type { SanRole } from '../types';
import type { SanFeatureKey } from '../utils/features';

export type SectionLink = { route: string; icon: IconName; labelKey: string; roles: SanRole[]; feature?: SanFeatureKey };
export type SectionGroup = { key: 'guests' | 'rooms' | 'service' | 'manage'; icon: IconName; links: SectionLink[] };
const R: SanRole[] = ['registrar'];

export const SECTION_GROUPS: SectionGroup[] = [
  {
    key: 'guests', icon: 'users', links: [
      { route: '/sanatorium-requests', icon: 'inbox', labelKey: 'sanatorium.nav.requests', roles: R },
      { route: '/sanatorium-guests', icon: 'guest', labelKey: 'sanatorium.nav.guests', roles: ['registrar', 'room_keeper', 'doctor'] },
      { route: '/sanatorium-bookings', icon: 'orders', labelKey: 'sanatorium.nav.bookings', roles: ['registrar', 'room_keeper'] },
      { route: '/sanatorium-stays', icon: 'building', labelKey: 'sanatorium.nav.stays', roles: ['registrar', 'room_keeper'] },
      { route: '/sanatorium-waitlist', icon: 'clock', labelKey: 'san1.nav.waitlist', roles: R, feature: 'waitlist' },
      { route: '/sanatorium-journey', icon: 'target', labelKey: 'san1.nav.journey', roles: ['registrar', 'room_keeper', 'doctor', 'nurse'], feature: 'journey' },
    ],
  },
  {
    key: 'rooms', icon: 'building', links: [
      { route: '/sanatorium-rooms', icon: 'building', labelKey: 'sanatorium.nav.rooms', roles: ['registrar', 'room_keeper'] },
      { route: '/sanatorium-housekeeping', icon: 'checklist', labelKey: 'san1.nav.housekeeping', roles: ['registrar', 'room_keeper', 'housekeeper'], feature: 'housekeeping' },
      { route: '/sanatorium-transfers', icon: 'arrowDown', labelKey: 'san1.nav.transfers', roles: R, feature: 'transfer' },
    ],
  },
  {
    key: 'service', icon: 'gift', links: [
      { route: '/sanatorium-kitchen', icon: 'gift', labelKey: 'sanatorium.nav.kitchen', roles: ['registrar', 'kitchen'], feature: 'kitchen_menu' },
      { route: '/sanatorium-diets', icon: 'checklist', labelKey: 'sanatorium.s2.diets', roles: ['registrar', 'kitchen'], feature: 'diet' },
      { route: '/sanatorium-schedule', icon: 'board', labelKey: 'sanatorium.s2.schedule', roles: ['registrar', 'doctor', 'nurse'], feature: 'procedure_schedule' },
      { route: '/sanatorium-services', icon: 'orders', labelKey: 'sanatorium.s2.services', roles: R, feature: 'paid_services' },
    ],
  },
  {
    key: 'manage', icon: 'settings', links: [
      { route: '/sanatorium-packages', icon: 'gift', labelKey: 'sanatorium.s2.packages', roles: R, feature: 'packages' },
      { route: '/sanatorium-seasons', icon: 'calendar', labelKey: 'sanatorium.s2.seasons', roles: R, feature: 'seasonal_pricing' },
      { route: '/sanatorium-quote', icon: 'wallet', labelKey: 'sanatorium.s2.quote', roles: R },
      { route: '/sanatorium-orgs', icon: 'briefcase', labelKey: 'sanatorium.s2.organizations', roles: R, feature: 'documents' },
      { route: '/sanatorium-doc-templates', icon: 'doc', labelKey: 'sanatorium.s2.docTemplates', roles: R, feature: 'documents' },
      { route: '/sanatorium-territory', icon: 'board', labelKey: 'san1.nav.territory', roles: R, feature: 'territory_map' },
      { route: '/sanatorium-location', icon: 'mapPin', labelKey: 'san1.nav.location', roles: R, feature: 'location_map' },
      { route: '/sanatorium-info', icon: 'news', labelKey: 'san1.nav.info', roles: R, feature: 'info_sections' },
      { route: '/sanatorium-broadcasts', icon: 'mail', labelKey: 'san1.nav.broadcasts', roles: R, feature: 'broadcasts' },
      { route: '/sanatorium-feedback', icon: 'news', labelKey: 'sanatorium.s2.feedback', roles: R, feature: 'feedback' },
      { route: '/sanatorium-overview', icon: 'chart', labelKey: 'sanStaff.nav.overview', roles: R },
      { route: '/sanatorium-analytics', icon: 'chart', labelKey: 'sanatorium.s2.analytics', roles: R, feature: 'analytics' },
      { route: '/sanatorium-settings', icon: 'settings', labelKey: 'sanatorium.nav.settings', roles: R },
      { route: '/sanatorium-setup', icon: 'checklist', labelKey: 'sanSimple.setup.title', roles: R },
    ],
  },
];

/** Groups with only the links the user may see; empty groups are dropped. */
export function visibleGroups(has: (...r: SanRole[]) => boolean, on: (k: SanFeatureKey) => boolean): SectionGroup[] {
  return SECTION_GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => has(...l.roles) && (!l.feature || on(l.feature))) })).filter((g) => g.links.length > 0);
}
