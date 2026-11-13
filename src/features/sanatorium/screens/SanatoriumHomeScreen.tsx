// «Sihatgoh» dashboard: stat tiles, the role's shortcuts and today's lists (arrivals, my
// appointments, menu, kitchen week). Shown to every sanatorium role; content follows the roles.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { Badge, Card, EmptyState, ListRow, PageHeader, Screen, SectionHeader, StatTile, Text } from '@/ui';
import { dashboardQuery } from '../api/queries';
import { ApptRow } from '../components/ApptRow';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import type { Dashboard, SanRole, Stay } from '../types';
import { fmtDate, hasSanRole } from '../utils/sanatorium';

type Tile = { key: string; icon: IconName; tint: ModuleTintKey; roles?: SanRole[]; route?: string };
// Order = importance; `roles` limits a tile to the roles the server fills the number for.
const TILES: Tile[] = [
  { key: 'in_house', icon: 'users', tint: 'green' },
  { key: 'free_beds', icon: 'building', tint: 'cyan' },
  { key: 'arrivals_today', icon: 'arrowDown', tint: 'drop', roles: ['registrar', 'room_keeper'], route: '/sanatorium-stays' },
  { key: 'departures_today', icon: 'arrowUp', tint: 'amber', roles: ['registrar', 'room_keeper'], route: '/sanatorium-stays' },
  { key: 'new_requests', icon: 'inbox', tint: 'pink', roles: ['registrar'], route: '/sanatorium-requests' },
  { key: 'appointments_today', icon: 'checklist', tint: 'violet', roles: ['doctor', 'nurse'] },
  { key: 'meals_today', icon: 'gift', tint: 'orange', roles: ['kitchen', 'registrar'], route: '/sanatorium-kitchen' },
];

const LINKS: { route: string; icon: IconName; labelKey: string; roles: SanRole[] }[] = [
  { route: '/sanatorium-requests', icon: 'inbox', labelKey: 'sanatorium.nav.requests', roles: ['registrar'] },
  { route: '/sanatorium-guests', icon: 'guest', labelKey: 'sanatorium.nav.guests', roles: ['registrar'] },
  { route: '/sanatorium-stays', icon: 'building', labelKey: 'sanatorium.nav.stays', roles: ['registrar', 'room_keeper'] },
  { route: '/sanatorium-doctor', icon: 'checklist', labelKey: 'sanatorium.nav.doctor', roles: ['doctor'] },
  { route: '/sanatorium-nurse', icon: 'bell', labelKey: 'sanatorium.nav.nurse', roles: ['nurse'] },
  { route: '/sanatorium-kitchen', icon: 'gift', labelKey: 'sanatorium.nav.kitchen', roles: ['kitchen'] },
];

export default function SanatoriumHomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = useSanAccess();
  const q = useQuery(dashboardQuery(allowed));
  if (!allowed) return <Denied />;

  const stats = q.data?.stats ?? {};
  const value = (key: string) => (key === 'free_beds' ? stats.free_beds : stats[key]);
  const tiles = TILES.filter((x) => (!x.roles || hasSanRole(user, ...x.roles)) && value(x.key) !== undefined);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-screen">
      <PageHeader title={t('sanatorium.title')} subtitle={q.data ? fmtDate(q.data.today) : undefined} />
      <QueryBlock query={q}>
        {(d) => (
          <View style={styles.stack}>
            <View style={styles.tiles}>
              {tiles.map((x) => (
                <StatTile
                  key={x.key}
                  testID={`tile-${x.key}`}
                  label={t(`sanatorium.stats.${x.key}`)}
                  value={value(x.key) ?? 0}
                  sub={x.key === 'free_beds' ? `${t('sanatorium.of')} ${stats.total_beds ?? '–'}` : undefined}
                  icon={x.icon}
                  tint={x.tint}
                  labelLines={2}
                  style={styles.tile}
                  onPress={x.route ? () => router.push(x.route as never) : undefined}
                />
              ))}
            </View>
            <View style={styles.links}>
              {LINKS.filter((l) => hasSanRole(user, ...l.roles)).map((l) => (
                <ListRow
                  key={l.route}
                  pressable
                  testID={`link-${l.route.slice(1)}`}
                  title={t(l.labelKey)}
                  badge={l.route === '/sanatorium-requests' ? stats.new_requests : undefined}
                  chevron
                  onPress={() => router.push(l.route as never)}
                />
              ))}
            </View>
            <RoleSections d={d} />
          </View>
        )}
      </QueryBlock>
    </Screen>
  );
}

function StayLine({ s }: { s: Stay }) {
  const { t } = useTranslation();
  return (
    <ListRow
      title={s.guest?.full_name ?? '—'}
      subtitle={[s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom'), `${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`].join(' · ')}
      right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={s.status === 'checked_in' ? 'success' : 'info'} />}
      chevron={!!s.guest}
      onPress={s.guest ? () => router.push({ pathname: '/sanatorium-guest', params: { id: String(s.guest!.id) } }) : undefined}
    />
  );
}

function RoleSections({ d }: { d: Dashboard }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const showStays = hasSanRole(user, 'registrar', 'room_keeper');
  const appts = d.appointments_today ?? [];
  return (
    <>
      {showStays && (
        <>
          <SectionHeader title={t('sanatorium.arrivalsToday')} actionLabel={t('common.all')} onAction={() => router.push('/sanatorium-stays')} />
          <Card>
            {(d.arrivals ?? []).length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noArrivals')}</Text>}
            {(d.arrivals ?? []).slice(0, 5).map((s) => <StayLine key={s.id} s={s} />)}
          </Card>
          <SectionHeader title={t('sanatorium.departuresToday')} />
          <Card>
            {(d.departures ?? []).length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noDepartures')}</Text>}
            {(d.departures ?? []).slice(0, 5).map((s) => <StayLine key={s.id} s={s} />)}
          </Card>
        </>
      )}
      {hasSanRole(user, 'doctor', 'nurse') && (
        <>
          <SectionHeader title={t('sanatorium.myAppointments')} />
          <Card>
            {appts.length === 0 && <EmptyState title={t('sanatorium.noAppointments')} />}
            {appts.map((a) => (
              <ApptRow
                key={a.id}
                appt={a}
                onPress={() => router.push({ pathname: '/sanatorium-appointment', params: { id: String(a.id), guestId: String(a.guest_id) } })}
              />
            ))}
          </Card>
        </>
      )}
      {(d.menu_today ?? []).length > 0 && (
        <>
          <SectionHeader title={t('sanatorium.menuToday')} />
          <Card>
            {d.menu_today!.map((m) => (
              <View key={m.meal} style={styles.menuRow}>
                <Text variant="label" tone="brand">{t(`sanatorium.meal.${m.meal}`)}</Text>
                <Text variant="body">{m.dishes || '—'}</Text>
                {!!m.diet_dishes && <Text variant="caption" tone="muted">{t('sanatorium.diet')}: {m.diet_dishes}</Text>}
              </View>
            ))}
          </Card>
        </>
      )}
      {hasSanRole(user, 'kitchen') && (d.kitchen_week ?? []).length > 0 && (
        <>
          <SectionHeader title={t('sanatorium.kitchenWeek')} actionLabel={t('common.all')} onAction={() => router.push('/sanatorium-kitchen')} />
          <Card>
            {d.kitchen_week!.map((k) => (
              <ListRow key={k.date} title={fmtDate(k.date)} subtitle={`${t('sanatorium.adults')}: ${k.adults} · ${t('sanatorium.children')}: ${k.children} · ${t('sanatorium.diet')}: ${k.diet}`} right={<Text variant="heading">{k.total}</Text>} />
            ))}
          </Card>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  links: { gap: 8, marginTop: 8 },
  menuRow: { paddingVertical: 6, gap: 2 },
});
