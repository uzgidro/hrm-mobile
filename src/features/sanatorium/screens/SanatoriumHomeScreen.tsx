// «Sihatgoh» dashboard: the role's shortcuts and the dashboard overview (tiles, occupancy chart, today's
// lists, kitchen week, activity). Shown to every non-registrar role and when the work queue is unavailable.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { IconName } from '@/components/Icon';
import { useAuthStore } from '@/store/authStore';
import { ListRow, LoadingView, PageHeader, Screen } from '@/ui';
import { dashboardQuery } from '../api/queries';
import { DashboardOverview } from '../components/DashboardOverview';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import { todayQuery } from '../simple/api';
import { ArrivalsStrip } from '../simple/components/ArrivalsStrip';
import { MyGuestsLink } from '../simple/components/MyGuestsLink';
import { TodayHome } from '../simple/screens/TodayHome';
import { Sections2Links } from '../components/sections2/Sections2Links';
import type { SanRole } from '../types';
import { useSanFeatures, type SanFeatureKey } from '../utils/features';
import { fmtDate, hasSanRole } from '../utils/sanatorium';
import { externalMayOpen, isExternalDoctorUser } from '../utils/staffParity';

const LINKS: { route: string; icon: IconName; labelKey: string; roles: SanRole[]; feature?: SanFeatureKey }[] = [
  { route: '/sanatorium-requests', icon: 'inbox', labelKey: 'sanatorium.nav.requests', roles: ['registrar'] },
  { route: '/sanatorium-guests', icon: 'guest', labelKey: 'sanatorium.nav.guests', roles: ['registrar', 'room_keeper', 'doctor'] },
  { route: '/sanatorium-bookings', icon: 'orders', labelKey: 'sanatorium.nav.bookings', roles: ['registrar', 'room_keeper'] },
  { route: '/sanatorium-rooms', icon: 'building', labelKey: 'sanatorium.nav.rooms', roles: ['registrar', 'room_keeper'] },
  { route: '/sanatorium-settings', icon: 'settings', labelKey: 'sanatorium.nav.settings', roles: ['registrar'] },
  { route: '/sanatorium-stays', icon: 'building', labelKey: 'sanatorium.nav.stays', roles: ['registrar', 'room_keeper'] },
  { route: '/sanatorium-doctor', icon: 'checklist', labelKey: 'sanatorium.nav.doctor', roles: ['doctor'] },
  { route: '/sanatorium-nurse', icon: 'bell', labelKey: 'sanatorium.nav.nurse', roles: ['nurse'] },
  { route: '/sanatorium-kitchen', icon: 'gift', labelKey: 'sanatorium.nav.kitchen', roles: ['registrar', 'kitchen'], feature: 'kitchen_menu' },
  // Sections round: each one hides when the registrar switches its section off.
  { route: '/sanatorium-journey', icon: 'target', labelKey: 'san1.nav.journey', roles: ['registrar', 'room_keeper', 'doctor', 'nurse'], feature: 'journey' },
  { route: '/sanatorium-waitlist', icon: 'clock', labelKey: 'san1.nav.waitlist', roles: ['registrar'], feature: 'waitlist' },
  { route: '/sanatorium-transfers', icon: 'arrowDown', labelKey: 'san1.nav.transfers', roles: ['registrar'], feature: 'transfer' },
  { route: '/sanatorium-housekeeping', icon: 'checklist', labelKey: 'san1.nav.housekeeping', roles: ['registrar', 'room_keeper', 'housekeeper'], feature: 'housekeeping' },
  { route: '/sanatorium-info', icon: 'news', labelKey: 'san1.nav.info', roles: ['registrar'], feature: 'info_sections' },
  { route: '/sanatorium-broadcasts', icon: 'mail', labelKey: 'san1.nav.broadcasts', roles: ['registrar'], feature: 'broadcasts' },
  { route: '/sanatorium-location', icon: 'mapPin', labelKey: 'san1.nav.location', roles: ['registrar'], feature: 'location_map' },
  { route: '/sanatorium-territory', icon: 'board', labelKey: 'san1.nav.territory', roles: ['registrar'], feature: 'territory_map' },
];

export default function SanatoriumHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = useSanAccess();
  const q = useQuery(dashboardQuery(allowed));
  const { on } = useSanFeatures();
  const registrar = hasSanRole(user, 'registrar');
  // The work queue replaces the old home for the registrar; an older server (404) keeps the classic one.
  const today = useQuery(todayQuery(allowed && registrar));
  // The work queue is open to the registrar, the chairman and the room keeper (the kitchen gets 403).
  const keeper = hasSanRole(user, 'room_keeper') && !registrar;
  const keeperToday = useQuery(todayQuery(allowed && keeper));
  if (!allowed) return <Denied />;
  if (registrar && today.isPending) {
    return (
      <Screen testID="sanatorium-screen">
        <PageHeader title={t('sanatorium.title')} />
        <LoadingView rows={3} />
      </Screen>
    );
  }
  if (registrar && today.data) return <TodayHome data={today.data} refreshing={today.isRefetching} onRefresh={() => void today.refetch()} />;

  const external = isExternalDoctorUser(user);
  const links = LINKS.filter((l) => hasSanRole(user, ...l.roles) && (!l.feature || on(l.feature)) && !(external && !externalMayOpen(l.route)));
  const stripOn = keeper && !!keeperToday.data;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-screen">
      <PageHeader title={t('sanatorium.title')} subtitle={q.data ? fmtDate(q.data.today) : undefined} />
      <QueryBlock query={q}>
        {(d) => (
          <DashboardOverview
            d={stripOn ? { ...d, arrivals: undefined, departures: undefined } : d}
            afterTiles={
              <View style={styles.stack}>
                <View style={styles.links}>
                  {links.map((l) => (
                    <ListRow
                      key={l.route}
                      pressable
                      testID={`link-${l.route.slice(1)}`}
                      title={t(l.labelKey)}
                      badge={l.route === '/sanatorium-requests' ? d.stats?.new_requests : undefined}
                      chevron
                      onPress={() => router.push(l.route as never)}
                    />
                  ))}
                </View>
                <MyGuestsLink enabled={hasSanRole(user, 'doctor', 'nurse')} />
                <Sections2Links />
                {stripOn && <ArrivalsStrip enabled />}
              </View>
            }
          />
        )}
      </QueryBlock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4 },
  links: { gap: 8, marginTop: 8 },
});
