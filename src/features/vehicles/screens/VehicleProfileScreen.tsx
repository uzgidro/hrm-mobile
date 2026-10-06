// Mashina profili — web v2 `VehicleProfilePage` porti: tavsif, haydovchi (sog'liq holati bilan),
// umumiy ko'rsatkichlar va safarlar tarixi. Jonli holat — faqat matn (harakatda / to'xtab
// turibdi / signal eski), operator va tasdiqlovchiga hamda trekker ulangan mashinaga, 20 s da
// yangilanadi. Xarita, marshrut va kunlik GPS tarixi — web'da (native xarita yo'q).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { useBreakpoint } from '@/utils/responsive';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  Skeleton,
  StatTile,
  Text,
} from '@/ui';
import { fleetAccessQuery, vehicleDetailQuery, vehicleLiveQuery, vehicleTripsQuery } from '../api/queries';
import { PlateChip } from '../components/FleetBits';
import { canSeeGps, dateRangeText, fmtConsumption, fmtDate, fmtMoney, liveStatus, type VehicleTrip } from '../utils/vehicles';

/** Safarlar tarixi (≤200) — Screen ichida birdaniga chizilmaydi: 30 tadan. */
const TRIPS_STEP = 30;

export default function VehicleProfileScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { sizeClass } = useBreakpoint();
  const { id: raw } = useLocalSearchParams<{ id?: string }>();
  const id = Number(raw) || 0;
  const detail = useQuery(vehicleDetailQuery(id));
  const trips = useQuery(vehicleTripsQuery(id));
  const access = useQuery(fleetAccessQuery());
  const v = detail.data;
  const gpsAllowed = canSeeGps(access.data);
  const canSeeLive = gpsAllowed && !!v?.gps_device_id;
  const live = useQuery(vehicleLiveQuery(id, canSeeLive));
  const [tripLimit, setTripLimit] = useState(TRIPS_STEP);

  if (detail.isPending && id > 0) {
    return (
      <Screen>
        <PageHeader title={t('vehicles.profileTitle')} />
        <Skeleton height={260} />
      </Screen>
    );
  }
  if (detail.isError && !v) {
    return (
      <Screen>
        <PageHeader title={t('vehicles.profileTitle')} />
        <ErrorState onRetry={() => detail.refetch()} />
      </Screen>
    );
  }
  if (!v) {
    return (
      <Screen>
        <PageHeader title={t('vehicles.profileTitle')} />
        <Card>
          <EmptyState title={t('vehicles.notFound')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const stats = v.stats;
  const spec: [string, string | number | null | undefined][] = [
    [t('vehicles.model'), v.model_name],
    [t('vehicles.color'), v.color],
    [t('vehicles.year'), v.year],
    [t('vehicles.seatsLabel'), v.seats],
    [t('vehicles.fuelType'), v.fuel_type_name],
    // v2 `VehicleProfilePage`: «km/l».
    [t('vehicles.consumption'), fmtConsumption(v.fuel_consumption, t('vehicles.unitKmL'))],
    [
      t('vehicles.fuelPriceLabel'),
      v.fuel_price != null
        ? `${fmtMoney(v.fuel_price)} ${t('vehicles.perUnit', { unit: v.fuel_unit ?? 'litr' })}`
        : v.fuel_price_pending
          ? t('vehicles.notApproved')
          : null,
    ],
    [t('vehicles.leader'), v.leader?.legal_name],
    [t('vehicles.leaderPosition'), v.leader_position],
    [t('vehicles.gpsDevice'), v.gps_device_id],
  ];
  const basis = sizeClass === 'compact' ? '47%' : '23%';
  const ls = liveStatus(live.data);
  const health = v.driver_health;

  return (
    <Screen
      refreshing={detail.isRefetching}
      onRefresh={() => void Promise.all([detail.refetch(), trips.refetch(), canSeeLive ? live.refetch() : null])}
    >
      <PageHeader
        title={`${v.plate_number ?? '—'} · ${v.model_name ?? ''}`.trim()}
        subtitle={[v.fuel_type_name, v.color].filter(Boolean).join(' · ') || undefined}
      />
      {v.is_active === false && (
        <Card style={[styles.banner, { backgroundColor: c.warningSoft }]}>
          <Text variant="body" style={{ color: c.warning }}>
            {t('vehicles.inRepair')}
          </Text>
        </Card>
      )}

      <View style={styles.tiles}>
        <View style={{ flexBasis: basis, flexGrow: 1 }}>
          <StatTile
            testID="vehicle-stat-trips"
            label={t('vehicles.statTrips', { finalized: stats?.finalized_count ?? 0 })}
            value={stats?.trip_count ?? 0}
            icon="briefcase"
            tint="violet"
          />
        </View>
        <View style={{ flexBasis: basis, flexGrow: 1 }}>
          <StatTile
            label={t('vehicles.statDistance')}
            // Butun songa, minglar ajratilgan; birlik pastda — plitkaga sig'adi.
            value={stats?.total_distance_km ? fmtMoney(Math.round(stats.total_distance_km)) : '—'}
            sub={stats?.total_distance_km ? t('vehicles.unitKm') : undefined}
            icon="mapPin"
            tint="drop"
          />
        </View>
        <View style={{ flexBasis: basis, flexGrow: 1 }}>
          <StatTile
            label={t('vehicles.statFuel')}
            value={stats?.total_fuel_liters ? fmtMoney(Math.round(stats.total_fuel_liters)) : '—'}
            sub={stats?.total_fuel_liters ? t('vehicles.unitL') : undefined}
            icon="target"
            tint="amber"
          />
        </View>
        <View style={{ flexBasis: basis, flexGrow: 1 }}>
          <StatTile
            label={t('vehicles.statCost')}
            value={fmtMoney(stats?.total_fuel_cost)}
            icon="wallet"
            tint="green"
          />
        </View>
      </View>

      <Card>
        {!!v.driver && (
          <View
            testID="vehicle-driver"
            style={[styles.driver, { backgroundColor: health?.blocking ? c.dangerSoft : c.surface2 }]}
          >
            <Avatar
              name={v.driver.legal_name ?? '?'}
              uri={v.driver.photo_path} thumb={v.driver.photo_thumb_path}
              size={38}
            />
            <View style={styles.flex}>
              <Text variant="body" weight="600" numberOfLines={1}>
                {v.driver.legal_name}
              </Text>
              <Text variant="caption" tone="subtle" selectable numberOfLines={1}>
                {[v.driver_position, v.driver_phone].filter(Boolean).join(' · ') || t('vehicles.driver')}
              </Text>
            </View>
            {!!health?.label && (
              <Badge
                label={health.label}
                tone={health.blocking ? 'danger' : health.status === 'limited' ? 'warning' : 'success'}
              />
            )}
          </View>
        )}
        <View style={styles.plateRow}>
          <PlateChip plate={v.plate_number} />
        </View>
        {spec.map(([label, value]) => (
          <View key={label} style={[styles.spec, { borderBottomColor: c.border }]}>
            <Text variant="caption" tone="subtle">
              {label}
            </Text>
            <Text variant="body" numberOfLines={1} style={styles.specValue}>
              {value || '—'}
            </Text>
          </View>
        ))}
        <View style={[styles.gps, { borderColor: c.border }]} testID="vehicle-gps">
          <Text variant="label" tone={v.gps_device_id ? 'success' : 'subtle'}>
            {v.gps_device_id ? t('vehicles.gpsLinked') : t('vehicles.gpsMissing')}
          </Text>
          {canSeeLive && live.isError && (
            <Text variant="caption" tone="danger">
              {t('vehicles.gpsUnreachable')}
            </Text>
          )}
          {canSeeLive && !live.isError && !live.isPending && (
            <Text variant="caption" tone="muted" testID="vehicle-live">
              {[
                t(ls.key),
                'speed' in ls ? `${ls.speed} ${t('vehicles.unitKmh')}` : null,
                'agoMin' in ls && ls.agoMin != null
                  ? ls.agoMin < 1
                    ? t('vehicles.gpsJustNow')
                    : t('vehicles.gpsAgo', { min: ls.agoMin })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          {!!v.gps_device_id && !gpsAllowed && (
            <Text variant="caption" tone="subtle">
              {t('vehicles.gpsManagerOnly')}
            </Text>
          )}
        </View>
      </Card>

      <Card title={t('vehicles.tripHistory')} style={styles.trips}>
        {!!stats?.last_trip_date && (
          <Text variant="caption" tone="subtle">
            {t('vehicles.lastTrip', { date: fmtDate(stats.last_trip_date) })}
          </Text>
        )}
        {trips.isError ? (
          <ErrorState onRetry={() => trips.refetch()} />
        ) : trips.isPending ? (
          <Skeleton height={140} />
        ) : (trips.data ?? []).length === 0 ? (
          <EmptyState title={t('vehicles.noTrips')} message={t('vehicles.noTripsHint')} />
        ) : (
          <>
            {(trips.data ?? []).slice(0, tripLimit).map((trip) => (
              <TripRow key={trip.request_id} trip={trip} />
            ))}
            {(trips.data ?? []).length > tripLimit && (
              <Button
                testID="vehicle-trips-more"
                label={`${t('vehicles.showMore')} (${(trips.data ?? []).length - tripLimit})`}
                variant="link"
                size="sm"
                onPress={() => setTripLimit((n) => n + TRIPS_STEP)}
              />
            )}
          </>
        )}
      </Card>
      <Text variant="caption" tone="subtle" style={styles.note}>
        {t('vehicles.profileWebOnly')}
      </Text>
    </Screen>
  );
}

function TripRow({ trip }: { trip: VehicleTrip }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const where = [...(trip.destination_names ?? []), ...(trip.regions ?? [])].filter(Boolean).join(', ');
  const distance = trip.actual_distance_km ?? trip.distance_km;
  const isActual = trip.actual_distance_km != null;
  const cost = trip.actual_fuel_cost ?? trip.fuel_cost;
  return (
    <View testID={`vehicle-trip-${trip.request_id}`} style={[styles.trip, { borderBottomColor: c.border }]}>
      <View style={styles.tripHead}>
        <Text variant="body" weight="600">
          {trip.letter_number || `#${trip.letter_id}`}
        </Text>
        <Text variant="caption" tone="subtle" style={styles.flex}>
          {dateRangeText(trip.start_date, trip.end_date)}
        </Text>
        {distance != null && (
          <Badge
            label={`${fmtMoney(distance)} ${t('vehicles.unitKm')}${isActual ? ` · ${t('vehicles.actual')}` : ''}`}
            tone={isActual ? 'success' : 'neutral'}
          />
        )}
      </View>
      {!!where && (
        <Text variant="caption" tone="muted">
          {where}
        </Text>
      )}
      <Text variant="caption" tone="subtle">
        {[
          trip.employee_name ? `${t('vehicles.traveller')}: ${trip.employee_name}` : null,
          trip.driver_name ? `${t('vehicles.driver')}: ${trip.driver_name}` : null,
          cost != null ? `${fmtMoney(cost)} ${t('vehicles.sum')}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, marginBottom: 10 },
  plateRow: { marginBottom: 6 },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  specValue: { flexShrink: 1, textAlign: 'right' },
  gps: { marginTop: 12, padding: 10, borderRadius: 12, borderWidth: 1, gap: 4 },
  trips: { marginTop: 12 },
  trip: { paddingVertical: 10, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth },
  tripHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0 },
  note: { marginTop: 12 },
});
