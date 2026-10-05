// «So'rovlar» tabi (v2 RequestsTab): xizmat safari bildirgisidan tug'ilgan mashina so'rovlari
// navbati. Holat, qidiruv, sana oralig'i va mashina — SERVERDA; 30 talik sahifalar. Qator
// bosilsa tafsilot varag'i (bosqichlar + amallar). Amallar qator `can_*` bayroqlaridan.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { PickerModal } from '@/components/PickerModal';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Pager,
  SearchField,
  Segmented,
  SelectField,
  Skeleton,
  Text,
} from '@/ui';
import { vehicleRequestsQuery, vehiclesQuery } from '../api/queries';
import {
  dateRangeText,
  fmtDate,
  fmtMoney,
  isInvalidRange,
  REQUEST_STATUS_LABEL,
  requestFigures,
  requestStatuses,
  reqTone,
  type VehicleRequest,
} from '../utils/vehicles';
import { PlateChip } from './FleetBits';
import { RequestSheet } from './RequestSheet';

export interface RequestTabState {
  status: string;
  search: string;
  from: string;
  to: string;
  vehicleId: number | null;
}

type Picker = null | 'from' | 'to' | 'vehicle';

export function RequestsTab({
  canApprove,
  state,
  setState,
  debounced,
}: {
  canApprove: boolean;
  state: RequestTabState;
  setState: (p: Partial<RequestTabState>) => void;
  debounced: string;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [viewing, setViewing] = useState<{ req: VehicleRequest; n: number } | null>(null);
  const invalid = isInvalidRange(state.from, state.to);
  const list = useQuery(
    vehicleRequestsQuery(
      invalid
        ? { status: state.status, search: debounced, from: '', to: '', vehicleId: null }
        : { status: state.status, search: debounced, from: state.from, to: state.to, vehicleId: state.vehicleId },
      page,
    ),
  );
  const cars = useQuery(vehiclesQuery('', false, undefined, picker === 'vehicle' || state.vehicleId != null));
  const rows = list.data?.items ?? [];
  const filterCount = [state.from, state.to, state.vehicleId != null ? 'x' : ''].filter(Boolean).length;
  const patch = (p: Partial<RequestTabState>) => {
    setState(p);
    setPage(1);
  };
  const carName = (id: number | null) => {
    if (id == null) return '';
    const c = cars.data?.find((x) => x.id === id);
    return c ? `${c.plate_number ?? ''} — ${c.model_name ?? ''}` : `#${id}`;
  };
  // Ochiq varaq ro'yxatdagi YANGI nusxani ko'rsatadi (amaldan keyin holat yangilanadi).
  const shown = viewing ? (rows.find((r) => r.id === viewing.req.id) ?? viewing.req) : null;

  return (
    <View style={styles.wrap}>
      <Segmented
        testID="vehicles-req-status"
        options={requestStatuses(canApprove).map((s) => ({ value: s, label: t(REQUEST_STATUS_LABEL[s]!) }))}
        value={state.status}
        onChange={(v) => patch({ status: v })}
      />
      <SearchField
        value={state.search}
        onChangeText={(v) => patch({ search: v })}
        placeholder={t('vehicles.reqSearchPlaceholder')}
      />
      <View style={styles.chips}>
        <Chip
          testID="vehicles-req-filters-toggle"
          label={t('vehicles.filters')}
          count={filterCount || undefined}
          selected={open}
          onPress={() => setOpen((o) => !o)}
        />
        {filterCount > 0 && (
          <Chip
            testID="vehicles-req-filters-reset"
            label={t('common.clearFilters')}
            onPress={() => patch({ from: '', to: '', vehicleId: null })}
          />
        )}
      </View>
      {open && (
        <Card>
          <View style={styles.panel}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <SelectField
                  testID="vehicles-req-from"
                  label={t('vehicles.gpsFrom')}
                  value={state.from ? fmtDate(state.from) : ''}
                  placeholder="—"
                  icon="calendar"
                  onPress={() => setPicker('from')}
                />
              </View>
              <View style={styles.flex}>
                <SelectField
                  testID="vehicles-req-to"
                  label={t('vehicles.gpsTo')}
                  value={state.to ? fmtDate(state.to) : ''}
                  placeholder="—"
                  icon="calendar"
                  onPress={() => setPicker('to')}
                />
              </View>
            </View>
            {invalid && (
              <Text variant="caption" tone="danger" testID="vehicles-req-invalid">
                {t('vehicles.invalidRange')}
              </Text>
            )}
            <SelectField
              testID="vehicles-req-vehicle"
              label={t('vehicles.visitVehicle')}
              value={carName(state.vehicleId)}
              placeholder={t('vehicles.visitAllVehicles')}
              onPress={() => setPicker('vehicle')}
            />
          </View>
        </Card>
      )}

      <Card>
        {list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <Skeleton height={220} />
        ) : rows.length === 0 ? (
          filterCount > 0 || !!debounced.trim() ? (
            <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
          ) : (
            <EmptyState title={t('vehicles.noRequests')} message={t('vehicles.noRequestsHint')} />
          )
        ) : (
          rows.map((r) => <RequestRow key={r.id} r={r} onPress={() => setViewing({ req: r, n: Date.now() })} />)
        )}
        <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
      </Card>

      {(picker === 'from' || picker === 'to') && (
        <DatePickerModal
          visible
          value={(picker === 'from' ? state.from : state.to) || null}
          title={picker === 'from' ? t('vehicles.gpsFrom') : t('vehicles.gpsTo')}
          onConfirm={(iso) => patch(picker === 'from' ? { from: iso } : { to: iso })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'vehicle' && (
        <PickerModal
          visible
          title={t('vehicles.visitVehicle')}
          options={(cars.data ?? []).map((c) => ({
            value: c.id,
            label: `${c.plate_number ?? ''} — ${c.model_name ?? ''}`,
          }))}
          loading={cars.isFetching}
          selected={state.vehicleId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setPicker(null);
            patch({ vehicleId: id });
          }}
        />
      )}
      {shown && viewing && <RequestSheet key={viewing.n} req={shown} onClose={() => setViewing(null)} />}
    </View>
  );
}

function RequestRow({ r, onPress }: { r: VehicleRequest; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { km, cost } = requestFigures(r);
  const who = [r.employee_position, r.department_name].filter(Boolean).join(' · ');
  return (
    <Pressable
      testID={`vehicle-req-${r.id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.req, { borderBottomColor: c.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.reqHead}>
        <Avatar name={r.employee_name || '?'} uri={r.employee_photo_thumb_path || r.employee_photo_path} size={28} />
        <Text variant="body" weight="600" numberOfLines={1} style={styles.flex}>
          {r.employee_name || '—'}
        </Text>
        {!!r.status && (
          <Badge label={t(`vehicles.status_${r.status}`, { defaultValue: r.status })} tone={reqTone(r.status)} />
        )}
      </View>
      {!!who && (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {who}
        </Text>
      )}
      <Text variant="caption" tone="muted">
        {[
          dateRangeText(r.start_date, r.end_date),
          r.regions?.length ? r.regions.join(', ') : null,
          km != null ? `${km} km${cost != null ? ` · ${fmtMoney(cost)} ${t('vehicles.sum')}` : ''}` : null,
          r.letter_number ? `#${r.letter_number}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {!!r.vehicle && (
        <View style={styles.reqCar}>
          <PlateChip plate={r.vehicle.plate_number} small />
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
            {[
              r.vehicle.model_name,
              r.assigned_driver?.legal_name ? `${t('vehicles.driver')}: ${r.assigned_driver.legal_name}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      )}
      {!!(r.approval_note || r.response_text) && (
        <Text variant="caption" tone="danger" numberOfLines={2}>
          {r.approval_note || r.response_text}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  panel: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  req: { paddingVertical: 10, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  reqHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqCar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
