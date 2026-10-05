// «Tashriflar» tabi (v2 VisitsTab) — xaritasiz RO'YXAT: mashina qaysi kafe/restoran/mehmonxona
// YONIDA qancha turgan. Faqat saqlangan GPS kunlari (server hech qachon provayderni chaqirmaydi).
// «Yonida turgan» ≠ «ichiga kirgan»; doimiy to'xtash joyi standart bo'yicha yashirin.
// Qator — mashina profiliga. Operator va tasdiqlovchi uchun (server `can_view_fleet`).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal } from '@/components/PickerModal';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Chip, EmptyState, ErrorState, Pager, SelectField, Skeleton, Text } from '@/ui';
import { vehiclesQuery, visitsQuery } from '../api/queries';
import {
  categoryLabelKey,
  defaultVisitFilters,
  durationMinutes,
  fmtDate,
  isInvalidRange,
  MIN_OPTIONS,
  PLACE_CATEGORIES,
  placeLabelKey,
  type VehicleVisit,
  type VisitFilters,
} from '../utils/vehicles';
import { PlateChip } from './FleetBits';

type Picker = null | 'from' | 'to' | 'vehicle';

export function VisitsTab() {
  const { t } = useTranslation();
  const [f, setF] = useState<VisitFilters>(defaultVisitFilters);
  const [page, setPage] = useState(1);
  const [picker, setPicker] = useState<Picker>(null);
  const invalid = isInvalidRange(f.from, f.to);
  const list = useQuery(visitsQuery(f, page, !invalid && !!f.from));
  const cars = useQuery(vehiclesQuery('', false, undefined, picker === 'vehicle' || f.vehicleId != null));
  const rows = list.data?.items ?? [];
  const patch = (p: Partial<VisitFilters>) => {
    setF((x) => ({ ...x, ...p }));
    setPage(1);
  };
  const carName = (id: number | null) => {
    if (id == null) return '';
    const c = cars.data?.find((x) => x.id === id);
    return c ? `${c.plate_number ?? ''} — ${c.model_name ?? ''}` : `#${id}`;
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="subtle">
        {t('vehicles.visitsHint')}
      </Text>
      <Card>
        <View style={styles.panel}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <SelectField
                testID="vehicles-visit-from"
                label={t('vehicles.gpsFrom')}
                value={fmtDate(f.from)}
                icon="calendar"
                onPress={() => setPicker('from')}
              />
            </View>
            <View style={styles.flex}>
              <SelectField
                testID="vehicles-visit-to"
                label={t('vehicles.gpsTo')}
                value={f.to ? fmtDate(f.to) : ''}
                placeholder="—"
                icon="calendar"
                onPress={() => setPicker('to')}
              />
            </View>
          </View>
          {invalid && (
            <Text variant="caption" tone="danger">
              {t('vehicles.invalidRange')}
            </Text>
          )}
          <SelectField
            testID="vehicles-visit-vehicle"
            label={t('vehicles.visitVehicle')}
            value={carName(f.vehicleId)}
            placeholder={t('vehicles.visitAllVehicles')}
            onPress={() => setPicker('vehicle')}
          />
          {f.vehicleId != null && (
            <Chip label={t('vehicles.visitAllVehicles')} onPress={() => patch({ vehicleId: null })} />
          )}
          <Text variant="label" tone="muted">
            {t('vehicles.visitPlaceType')}
          </Text>
          <View style={styles.chips}>
            <Chip label={t('vehicles.visitAllTypes')} selected={!f.category} onPress={() => patch({ category: '' })} />
            {PLACE_CATEGORIES.map((c) => (
              <Chip
                key={c}
                testID={`vehicles-visit-cat-${c}`}
                label={t(categoryLabelKey(c)!)}
                selected={f.category === c}
                onPress={() => patch({ category: f.category === c ? '' : c })}
              />
            ))}
          </View>
          <Text variant="label" tone="muted">
            {t('vehicles.visitMinDuration')}
          </Text>
          <View style={styles.chips}>
            {MIN_OPTIONS.map((m) => (
              <Chip
                key={m}
                testID={`vehicles-visit-min-${m}`}
                label={t('vehicles.visitMinLabel', { min: m })}
                selected={f.minMinutes === m}
                onPress={() => patch({ minMinutes: m })}
              />
            ))}
          </View>
          <Chip
            testID="vehicles-visit-habitual"
            label={t('vehicles.visitShowHabitual')}
            selected={f.includeHabitual}
            onPress={() => patch({ includeHabitual: !f.includeHabitual })}
          />
        </View>
      </Card>

      <Card>
        {list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <Skeleton height={200} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('vehicles.noVisits')} message={t('vehicles.noVisitsHint')} />
        ) : (
          rows.map((r) => <VisitRow key={`${r.id}-${r.day}`} r={r} />)
        )}
        <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
      </Card>

      {(picker === 'from' || picker === 'to') && (
        <DatePickerModal
          visible
          value={(picker === 'from' ? f.from : f.to) || null}
          title={picker === 'from' ? t('vehicles.gpsFrom') : t('vehicles.gpsTo')}
          onConfirm={(iso) => patch(picker === 'from' ? { from: iso } : { to: iso })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'vehicle' && (
        <PickerModal
          visible
          title={t('vehicles.visitVehicle')}
          avatars={false}
          options={(cars.data ?? []).map((c) => ({
            value: c.id,
            label: `${c.plate_number ?? ''} — ${c.model_name ?? ''}`,
          }))}
          loading={cars.isFetching}
          selected={f.vehicleId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setPicker(null);
            patch({ vehicleId: id });
          }}
        />
      )}
    </View>
  );
}

function VisitRow({ r }: { r: VehicleVisit }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const d = durationMinutes(r.duration_s);
  const dur = d.h ? t('vehicles.durationHm', { h: d.h, m: d.m }) : t('vehicles.durationM', { m: d.m });
  const kindKey = placeLabelKey(r.place_kind, r.place_category);
  const kind = kindKey ? t(kindKey) : (r.place_category ?? '');
  return (
    <Pressable
      testID={`vehicle-visit-${r.id}`}
      accessibilityRole="button"
      onPress={() => router.push(`/avtomobil?id=${r.vehicle_id}` as Href)}
      style={({ pressed }) => [styles.visit, { borderBottomColor: c.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.visitHead}>
        <Text variant="body" weight="600" numberOfLines={1} style={styles.flex}>
          {r.place_name || t('vehicles.stopUnknownPlace')}
        </Text>
        {r.on_trip && <Badge label={t('vehicles.visitOnTrip')} tone="info" />}
      </View>
      <Text variant="caption" tone="muted">
        {[
          kind,
          r.place_distance_m != null ? `${r.place_distance_m} ${t('vehicles.unitM')}` : null,
          r.is_habitual ? t('vehicles.stopHabitualShort') : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text variant="caption" tone="muted">
        {`${fmtDate(r.day)} ${r.start_at.slice(11, 16)}–${r.end_at.slice(11, 16)} · ${dur}`}
      </Text>
      <View style={styles.visitHead}>
        <PlateChip plate={r.plate_number} small />
        <Text variant="caption" tone="subtle" numberOfLines={1} style={styles.flex}>
          {[(r.vehicle_name || '').replace(/ — .*$/, ''), r.driver_name].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  panel: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flex: { flex: 1, minWidth: 0 },
  visit: { paddingVertical: 10, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth },
  visitHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
