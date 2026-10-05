// «Mashinalar» tabi (v2 FleetTab): bugungi oraliq bilan ro'yxat — server har mashina uchun
// safarda/so'ralganini hisoblaydi. Qidiruv serverda, qolgan toraytirish mijozda (o'nlab mashina).
// Qator — mashina profiliga yo'l; tahrir/o'chirish faqat `can_manage`. Ommaviy amallar — web'da.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { PickerModal } from '@/components/PickerModal';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Card, Chip, EmptyState, ErrorState, IconButton, SearchField, Skeleton, Text } from '@/ui';
import { fuelTypesQuery, vehiclesQuery } from '../api/queries';
import { useRemoveVehicle } from '../api/mutations';
import {
  EMPTY_FLEET_FILTERS,
  filterVehicles,
  fleetFilterCount,
  fmtMoney,
  type FleetFilters,
  type Vehicle,
} from '../utils/vehicles';
import { AvailabilityBadge, GpsMark, PlateChip } from './FleetBits';

export function FleetTab({
  today,
  canManage,
  filters,
  setFilters,
  search,
  setSearch,
  debounced,
  onEdit,
}: {
  today: string;
  canManage: boolean;
  filters: FleetFilters;
  setFilters: (f: FleetFilters) => void;
  search: string;
  setSearch: (v: string) => void;
  debounced: string;
  onEdit: (v: Vehicle) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(fleetFilterCount(filters) > 0);
  const [fuelPicker, setFuelPicker] = useState(false);
  const list = useQuery(vehiclesQuery(debounced, false, { from: today, to: today }));
  const fuels = useQuery(fuelTypesQuery(fuelPicker || filters.fuel != null));
  const remove = useRemoveVehicle();
  const rows = filterVehicles(list.data ?? [], filters);
  const count = fleetFilterCount(filters);
  const patch = (p: Partial<FleetFilters>) => setFilters({ ...filters, ...p });

  const del = async (v: Vehicle) => {
    const ok = await confirm({
      title: t('vehicles.deleteTitle'),
      message: t('vehicles.deleteConfirm', { plate: v.plate_number ?? '' }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(v.id);
      toast.success(t('vehicles.removed'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const fuelName =
    filters.fuel != null ? fuels.data?.find((f) => f.id === filters.fuel)?.name || `#${filters.fuel}` : '';

  return (
    <View style={styles.wrap}>
      <SearchField value={search} onChangeText={setSearch} placeholder={t('vehicles.searchPlaceholder')} />
      <View style={styles.chips}>
        <Chip
          testID="vehicles-filters-toggle"
          label={t('vehicles.filters')}
          count={count || undefined}
          selected={open}
          onPress={() => setOpen((o) => !o)}
        />
        {count > 0 && (
          <Chip
            testID="vehicles-filters-reset"
            label={t('common.clearFilters')}
            onPress={() => setFilters(EMPTY_FLEET_FILTERS)}
          />
        )}
        <Text variant="caption" tone="subtle" style={styles.count} testID="vehicles-count">
          {t('vehicles.countCars', { count: rows.length })}
        </Text>
      </View>
      {open && (
        <Card>
          <View style={styles.panel}>
            <FilterRow
              label={t('vehicles.colState')}
              value={filters.state}
              options={[
                ['active', t('vehicles.inService')],
                ['inactive', t('vehicles.inactive')],
              ]}
              onChange={(v) => patch({ state: v as FleetFilters['state'] })}
              testID="vehicles-filter-state"
            />
            <FilterRow
              label={t('vehicles.colToday')}
              value={filters.avail}
              options={[
                ['free', t('vehicles.availFree')],
                ['busy', t('vehicles.availOnTrip')],
                ['pending', t('vehicles.availRequested')],
              ]}
              onChange={(v) => patch({ avail: v as FleetFilters['avail'] })}
              testID="vehicles-filter-avail"
            />
            <FilterRow
              label="GPS"
              value={filters.gps}
              options={[
                ['1', t('vehicles.filterGpsYes')],
                ['0', t('vehicles.filterGpsNo')],
              ]}
              onChange={(v) => patch({ gps: v as FleetFilters['gps'] })}
              testID="vehicles-filter-gps"
            />
            <FilterRow
              label={t('vehicles.colDriver')}
              value={filters.drv}
              options={[
                ['1', t('vehicles.filterDriverYes')],
                ['0', t('vehicles.filterDriverNo')],
              ]}
              onChange={(v) => patch({ drv: v as FleetFilters['drv'] })}
              testID="vehicles-filter-drv"
            />
            <Text variant="label" tone="muted">
              {t('vehicles.colFuel')}
            </Text>
            <View style={styles.chips}>
              <Chip
                label={t('vehicles.fuelAll')}
                selected={filters.fuel == null}
                onPress={() => patch({ fuel: null })}
              />
              <Chip
                testID="vehicles-filter-fuel"
                label={filters.fuel != null ? fuelName : t('vehicles.pickFuel')}
                selected={filters.fuel != null}
                onPress={() => setFuelPicker(true)}
              />
            </View>
          </View>
        </Card>
      )}

      <Card>
        {list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <Skeleton height={220} />
        ) : rows.length === 0 ? (
          count > 0 || !!debounced.trim() ? (
            <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
          ) : (
            <EmptyState title={t('vehicles.empty')} message={canManage ? t('vehicles.emptyHint') : undefined} />
          )
        ) : (
          rows.map((v) => (
            <VehicleRow key={v.id} v={v} canManage={canManage} onEdit={() => onEdit(v)} onDelete={() => void del(v)} />
          ))
        )}
      </Card>

      {fuelPicker && (
        <PickerModal
          visible
          title={t('vehicles.colFuel')}
          options={(fuels.data ?? []).map((f) => ({ value: f.id, label: f.name || `#${f.id}` }))}
          loading={fuels.isFetching}
          selected={filters.fuel}
          onClose={() => setFuelPicker(false)}
          onSelect={(id) => {
            setFuelPicker(false);
            patch({ fuel: id });
          }}
        />
      )}
    </View>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  testID: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.filterRow}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View style={styles.chips}>
        <Chip label={t('vehicles.fuelAll')} selected={!value} onPress={() => onChange('')} />
        {options.map(([v, l]) => (
          <Chip
            key={v}
            testID={`${testID}-${v}`}
            label={l}
            selected={value === v}
            onPress={() => onChange(value === v ? '' : v)}
          />
        ))}
      </View>
    </View>
  );
}

function VehicleRow({
  v,
  canManage,
  onEdit,
  onDelete,
}: {
  v: Vehicle;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const spec = [v.color, v.seats ? `${v.seats} ${t('vehicles.seats')}` : null, v.year].filter(Boolean).join(' · ');
  const fuel = [
    v.fuel_type_name,
    v.fuel_consumption ? `${v.fuel_consumption} ${v.fuel_unit ?? ''}`.trim() : null,
    v.fuel_price != null ? `${fmtMoney(v.fuel_price)} ${t('vehicles.sum')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      testID={`vehicle-row-${v.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${v.plate_number ?? ''} ${v.model_name ?? ''}`}
      onPress={() => router.push(`/avtomobil?id=${v.id}` as Href)}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowTop}>
        <PlateChip plate={v.plate_number} />
        <GpsMark v={v} />
        <View style={styles.flex} />
        <AvailabilityBadge v={v} />
      </View>
      <Text variant="body" weight="600" numberOfLines={1}>
        {v.model_name || '—'}
      </Text>
      {!!spec && (
        <Text variant="caption" tone="subtle" numberOfLines={1}>
          {spec}
        </Text>
      )}
      <View style={styles.driver}>
        {v.driver ? (
          <>
            <Avatar
              name={v.driver.legal_name ?? '?'}
              uri={v.driver.photo_thumb_path || v.driver.photo_path}
              size={24}
            />
            <View style={styles.flex}>
              <Text variant="caption" numberOfLines={1}>
                {v.driver.legal_name}
              </Text>
              {v.driver_available === false && !!v.driver_block_reason ? (
                <Text variant="caption" tone="danger" numberOfLines={1}>
                  {v.driver_block_reason}
                </Text>
              ) : v.driver_position ? (
                <Text variant="caption" tone="subtle" numberOfLines={1}>
                  {v.driver_position}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <Text variant="caption" tone="subtle" style={styles.flex}>
            {t('vehicles.noDriver')}
          </Text>
        )}
        {canManage && (
          <View style={styles.actions}>
            <IconButton
              testID={`vehicle-edit-${v.id}`}
              icon="edit"
              accessibilityLabel={t('common.edit')}
              onPress={onEdit}
            />
            <IconButton
              testID={`vehicle-delete-${v.id}`}
              icon="trash"
              accessibilityLabel={t('common.delete')}
              onPress={onDelete}
            />
          </View>
        )}
      </View>
      {!!fuel && (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {fuel}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  count: { marginLeft: 'auto' },
  panel: { gap: 10 },
  filterRow: { gap: 6 },
  row: { paddingVertical: 10, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0 },
});
