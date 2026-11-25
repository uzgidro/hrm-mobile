// Numbers, charts and lists of the sanatorium dashboard (web «DashboardOverview»): KPI tiles the server
// filled in, the 7-day occupancy chart against the bed total, leaving-tomorrow list, today's lists,
// kitchen week and the activity feed. Shared by the role home, the classic registrar home and the overview screen.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, ListRow, SectionHeader, StatTile, Text } from '@/ui';
import type { Dashboard, DashboardEvent, Stay } from '../types';
import { useSanFeatures } from '../utils/features';
import { fmtDate, fmtDateTime, fmtMoney, hasSanRole } from '../utils/sanatorium';
import { dashboardTiles, eventIcon, splitDepartures } from '../utils/staffParity';
import { ApptRow } from './ApptRow';
import { BarChart } from './sections2/kit';

function StayLine({ s, testID }: { s: Stay; testID?: string }) {
  const { t } = useTranslation();
  return (
    <ListRow
      testID={testID}
      title={s.guest?.full_name ?? '—'}
      subtitle={[s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom'), `${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`].join(' · ')}
      right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={s.status === 'checked_in' ? 'success' : 'info'} />}
      chevron
      onPress={() => router.push({ pathname: '/sanatorium-stay', params: { id: String(s.id) } })}
    />
  );
}

function EventRow({ e }: { e: DashboardEvent }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.event} testID={`dash-event-${e.id}`}>
      <View style={[styles.eventIcon, { backgroundColor: c.brandSoft }]}>
        <Icon name={eventIcon(e.kind)} size={15} color={c.brandStrong} />
      </View>
      <View style={styles.flex}>
        {!!e.guest_name && !!e.guest_id && (
          <Text variant="label" tone="link" testID={`dash-event-guest-${e.id}`} onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(e.guest_id) } })}>
            {e.guest_name}
          </Text>
        )}
        <Text variant="body">{e.title}</Text>
        {!!e.details && <Text variant="caption" tone="muted">{e.details}</Text>}
        <Text variant="caption" tone="subtle">{[fmtDateTime(e.created_at), e.actor_name].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

/** `afterTiles` lets a screen put its shortcuts between the KPI tiles and the charts. */
export function DashboardOverview({ d, afterTiles }: { d: Dashboard; afterTiles?: React.ReactNode }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { on } = useSanFeatures();
  const stats = d.stats ?? {};
  const tiles = dashboardTiles(stats);
  const totalBeds = Number(stats.total_beds ?? 0) || 0;
  const week = d.occupancy_week ?? [];
  const flowRole = hasSanRole(user, 'registrar', 'room_keeper');
  const keeper = hasSanRole(user, 'room_keeper') && !hasSanRole(user, 'registrar');
  const { today: leavingToday, tomorrow: leavingTomorrow } = splitDepartures(d.departures ?? [], d.today);
  const appts = d.appointments_today;
  const byType = Object.entries(d.in_house_by_type ?? {});
  const menu = (d.menu_today ?? []).filter((m) => m.dishes || m.diet_dishes);

  return (
    <View style={styles.stack} testID="dash-overview">
      {tiles.length > 0 && (
        <View style={styles.tiles}>
          {tiles.map((x) => (
            <StatTile
              key={x.key}
              testID={`tile-${x.key}`}
              label={t(`sanatorium.stats.${x.key}`)}
              value={x.key === 'debt_total' ? fmtMoney(x.value) : x.value}
              sub={
                x.hint?.kind === 'free' ? t('sanStaff.dash.free', { n: x.hint.n })
                : x.hint?.kind === 'overdue' ? t('sanStaff.dash.overdue', { n: x.hint.n })
                : x.hint?.kind === 'appointments' ? t('sanStaff.dash.apptHint')
                : undefined
              }
              icon={x.icon}
              tint={x.tint}
              labelLines={2}
              style={styles.tile}
              onPress={x.route ? () => router.push(x.route as never) : undefined}
            />
          ))}
        </View>
      )}

      {afterTiles}

      {week.length > 0 && (
        <Card title={t('sanStaff.dash.occupancyWeek')} icon="chart" tint="cyan" testID="dash-occupancy">
          <BarChart
            testID="dash-occupancy-chart"
            values={week.map((o) => o.occupied)}
            labels={week.map((o) => dayjs(o.date).format('DD.MM'))}
            reference={totalBeds || undefined}
            max={Math.max(totalBeds, 1)}
            height={120}
            allLabels
            showValues
          />
          {totalBeds > 0 && <Text variant="caption" tone="muted" testID="dash-total-beds">{t('sanStaff.dash.totalBeds', { n: totalBeds })}</Text>}
          {byType.length > 0 && (
            <View style={styles.badges} testID="dash-by-type">
              {byType.map(([k, n]) => <Badge key={k} tone="brand" label={`${t(`sanatorium.guestType.${k}`, { defaultValue: k })}: ${n}`} />)}
            </View>
          )}
        </Card>
      )}

      {keeper && <Button testID="dash-open-stays" label={t('sanStaff.dash.openStays')} icon="building" variant="soft" full onPress={() => router.push('/sanatorium-stays')} />}

      {flowRole && (d.arrivals || d.departures) && (
        <>
          <SectionHeader title={`${t('sanatorium.arrivalsToday')} (${(d.arrivals ?? []).length})`} actionLabel={t('common.all')} onAction={() => router.push('/sanatorium-stays')} />
          <Card testID="dash-arrivals">
            {(d.arrivals ?? []).length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noArrivals')}</Text>}
            {(d.arrivals ?? []).slice(0, 8).map((s) => <StayLine key={s.id} s={s} testID={`dash-arrival-${s.id}`} />)}
          </Card>
          <SectionHeader title={`${t('sanatorium.departuresToday')} (${leavingToday.length})`} />
          <Card testID="dash-departures">
            {leavingToday.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.noDepartures')}</Text>}
            {leavingToday.slice(0, 8).map((s) => <StayLine key={s.id} s={s} testID={`dash-departure-${s.id}`} />)}
          </Card>
          {leavingTomorrow.length > 0 && (
            <>
              <SectionHeader title={`${t('sanatorium.stats.leaving_tomorrow')} (${leavingTomorrow.length})`} />
              <Card testID="dash-leaving-tomorrow">
                {leavingTomorrow.slice(0, 8).map((s) => <StayLine key={s.id} s={s} testID={`dash-tomorrow-${s.id}`} />)}
              </Card>
            </>
          )}
        </>
      )}

      {appts !== undefined && (
        <>
          <SectionHeader title={t('sanatorium.myAppointments')} />
          <Card testID="dash-appointments">
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

      {on('kitchen_menu') && menu.length > 0 && (
        <>
          <SectionHeader title={t('sanatorium.menuToday')} />
          <Card testID="dash-menu">
            {menu.map((m) => (
              <View key={m.meal} style={styles.menuRow}>
                <Text variant="label" tone="brand">{t(`sanatorium.meal.${m.meal}`)}</Text>
                <Text variant="body">{m.dishes || '—'}</Text>
                {!!m.diet_dishes && <Text variant="caption" tone="muted">{t('sanatorium.diet')}: {m.diet_dishes}</Text>}
              </View>
            ))}
          </Card>
        </>
      )}

      {d.kitchen_week !== undefined && (
        <>
          <SectionHeader title={t('sanatorium.kitchenWeek')} actionLabel={t('common.all')} onAction={() => router.push('/sanatorium-kitchen')} />
          <Card testID="dash-kitchen-week">
            {d.kitchen_week.map((k) => (
              <ListRow
                key={k.date}
                title={fmtDate(k.date)}
                subtitle={`${t('sanatorium.adults')}: ${k.adults} · ${t('sanatorium.children')}: ${k.children} · ${t('sanatorium.diet')}: ${k.diet}`}
                right={<Text variant="heading">{k.total}</Text>}
              />
            ))}
          </Card>
        </>
      )}

      {d.recent_events !== undefined && (
        <>
          <SectionHeader title={t('sanStaff.dash.recentEvents')} />
          <Card testID="dash-events">
            {d.recent_events.length === 0 ? <EmptyState title={t('sanStaff.dash.noEvents')} /> : d.recent_events.map((e) => <EventRow key={e.id} e={e} />)}
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4 },
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  menuRow: { paddingVertical: 6, gap: 2 },
  event: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  eventIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
