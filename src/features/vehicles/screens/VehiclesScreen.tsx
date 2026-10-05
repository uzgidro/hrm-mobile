// v3 Avtopark — web v2 `VehiclesPage` porti: xizmat safarlariga beriladigan mashinalar, ularga
// so'rovlar navbati va yoqilg'i narx kitobi. Qaysi tab va tugma ko'rinishini `vehicles/access`
// (SERVER) hal qiladi, so'rov amallari — qator `can_*` bayroqlari. Bildirishnoma `?tab=` bilan
// ochadi (fuel_* → yoqilg'i, vehicle_* → so'rovlar). Xarita, GPS trek va kunlik tarix, ommaviy
// amallar — web'da (native xarita yo'q).
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useBreakpoint } from '@/utils/responsive';
import { Card, EmptyState, ErrorState, Fab, PageHeader, Screen, Segmented, Skeleton, StatTile, Text } from '@/ui';
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import { fleetAccessQuery, requestsCountQuery, vehicleKeys, vehiclesQuery } from '../api/queries';
import { DriverScopesTab } from '../components/DriverScopesTab';
import { FleetTab } from '../components/FleetTab';
import { FuelTab } from '../components/FuelTab';
import { RequestsTab, type RequestTabState } from '../components/RequestsTab';
import { VehicleFormSheet } from '../components/VehicleFormSheet';
import { VisitsTab } from '../components/VisitsTab';
import {
  canSeeGps,
  defaultRequestStatus,
  EMPTY_FLEET_FILTERS,
  fleetOverview,
  resolveTab,
  tabsFor,
  today as todayIso,
  type FleetFilters,
  type FleetTab as Tab,
  type Vehicle,
} from '../utils/vehicles';

const TAB_LABEL: Record<Tab, string> = {
  fleet: 'vehicles.tabFleet',
  requests: 'vehicles.tabRequests',
  fuel: 'vehicles.tabFuel',
  visits: 'vehicles.tabVisits',
  drivers: 'vehicles.tabDrivers',
};

type TileKey = 'total' | 'free' | 'onTrip' | 'requested' | 'inactive' | 'gps' | 'queue';
const TILES: { key: TileKey; icon: IconName; tint: ModuleTintKey; fleet?: Partial<FleetFilters> }[] = [
  { key: 'total', icon: 'grid', tint: 'grey', fleet: {} },
  { key: 'free', icon: 'check', tint: 'green', fleet: { avail: 'free' } },
  { key: 'onTrip', icon: 'mapPin', tint: 'drop', fleet: { avail: 'busy' } },
  { key: 'requested', icon: 'clock', tint: 'amber', fleet: { avail: 'pending' } },
  { key: 'inactive', icon: 'settings', tint: 'pink', fleet: { state: 'inactive' } },
  { key: 'gps', icon: 'globe', tint: 'violet', fleet: { gps: '1' } },
  { key: 'queue', icon: 'inbox', tint: 'amber' },
];

export default function VehiclesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{ tab?: string }>();
  const { sizeClass } = useBreakpoint();
  const access = useQuery(fleetAccessQuery());
  const a = access.data;
  const [day] = useState(todayIso);
  const [tabPick, setTab] = useState<Tab | null>(null);
  const [fleetFilters, setFleetFilters] = useState<FleetFilters>(EMPTY_FLEET_FILTERS);
  const [fleetSearch, setFleetSearch] = useState('');
  const fleetDebounced = useDebouncedValue(fleetSearch);
  const [req, setReq] = useState<RequestTabState | null>(null);
  const reqDebounced = useDebouncedValue(req?.search ?? '', 300);
  const [form, setForm] = useState<{ vehicle: Vehicle | null; n: number } | null>(null);

  const allowed = a?.can_view === true;
  const queueVisible = canSeeGps(a);
  // Hooklar tartibi o'zgarmas: plitkalar bugungi ro'yxatdan (FleetTab bilan bir xil kesh kaliti).
  const today = useQuery(vehiclesQuery('', false, { from: day, to: day }, allowed));
  const qPending = useQuery(requestsCountQuery('pending', allowed && queueVisible));
  const qAwaiting = useQuery(requestsCountQuery('awaiting_approval', allowed && queueVisible));
  const qc = useQueryClient();
  // Tortib yangilash — butun modul (ochiq tab ro'yxati ham), o'z bayrog'i bilan.
  const [pulling, setPulling] = useState(false);
  const pull = async () => {
    setPulling(true);
    try {
      await qc.invalidateQueries({ queryKey: vehicleKeys.all });
    } finally {
      setPulling(false);
    }
  };

  const header = <PageHeader title={t('vehicles.title')} subtitle={t('vehicles.subtitle')} />;

  if (access.isPending) {
    return (
      <Screen>
        {header}
        <Skeleton height={220} />
      </Screen>
    );
  }
  if (access.isError) {
    return (
      <Screen>
        {header}
        <ErrorState onRetry={() => access.refetch()} />
      </Screen>
    );
  }
  if (!a || !allowed) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('vehicles.noAccess')} message={t('vehicles.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const tabs = tabsFor(a, user);
  const tab = tabPick && tabs.includes(tabPick) ? tabPick : resolveTab(params.tab, tabs);
  const reqState: RequestTabState = req ?? {
    status: defaultRequestStatus(a.can_approve),
    search: '',
    from: '',
    to: '',
    vehicleId: null,
  };
  const o = fleetOverview(today.data ?? []);
  const queue = (qPending.data ?? 0) + (qAwaiting.data ?? 0);
  const value = (k: TileKey) => {
    if (k === 'queue') return qPending.isPending || qAwaiting.isPending ? '…' : queue;
    if (today.isError) return '—';
    return today.isPending ? '…' : o[k];
  };
  const pickTile = (x: (typeof TILES)[number]) => {
    if (x.key === 'queue') {
      setReq({ ...reqState, status: 'pending' });
      setTab('requests');
      return;
    }
    setFleetFilters({ ...EMPTY_FLEET_FILTERS, ...x.fleet });
    setFleetSearch('');
    setTab('fleet');
  };
  const tileWidth = sizeClass === 'compact' ? 150 : 170;

  return (
    <View style={styles.root}>
      <Screen refreshing={pulling} onRefresh={() => void pull()}>
        {header}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
          {TILES.filter((x) => x.key !== 'queue' || queueVisible).map((x) => (
            <StatTile
              key={x.key}
              testID={`vehicles-tile-${x.key}`}
              style={{ width: tileWidth }}
              label={t(`vehicles.stat_${x.key}`)}
              value={value(x.key)}
              icon={x.icon}
              tint={x.tint}
              onPress={() => pickTile(x)}
            />
          ))}
        </ScrollView>
        {tabs.length > 1 && (
          <View style={styles.tabs}>
            <Segmented<Tab>
              testID="vehicles-tabs"
              options={tabs.map((x) => ({ value: x, label: t(TAB_LABEL[x]) }))}
              value={tab}
              onChange={setTab}
            />
          </View>
        )}
        {tab === 'fleet' && (
          <FleetTab
            today={day}
            canManage={a.can_manage}
            filters={fleetFilters}
            setFilters={setFleetFilters}
            search={fleetSearch}
            setSearch={setFleetSearch}
            debounced={fleetDebounced}
            onEdit={(v) => setForm({ vehicle: v, n: Date.now() })}
          />
        )}
        {tab === 'requests' && (
          <RequestsTab
            canApprove={a.can_approve}
            state={reqState}
            setState={(p) => setReq({ ...reqState, ...p })}
            debounced={reqDebounced}
          />
        )}
        {tab === 'fuel' && <FuelTab canManage={a.can_manage} canApprove={a.can_approve} />}
        {tab === 'visits' && <VisitsTab />}
        {tab === 'drivers' && <DriverScopesTab fleetBranchId={a.provider_branch_id} />}
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('vehicles.webOnly')}
        </Text>
        {a.can_manage && tab === 'fleet' && <View style={styles.fabSpace} />}
      </Screen>
      {a.can_manage && tab === 'fleet' && (
        <Fab
          testID="vehicles-add"
          accessibilityLabel={t('vehicles.add')}
          onPress={() => setForm({ vehicle: null, n: Date.now() })}
        />
      )}
      {form && a.can_manage && <VehicleFormSheet key={form.n} vehicle={form.vehicle} onClose={() => setForm(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { gap: 10, paddingBottom: 4 },
  tabs: { marginVertical: 12 },
  note: { marginTop: 12 },
  fabSpace: { height: 72 },
});
