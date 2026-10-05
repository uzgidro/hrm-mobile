// «Murojaatlar statistikasi» (web v2 `RequestsReport`, TZ 4.2.11): davr / tur / holat
// filtrlari BIR manbaga — `service-requests/statistics` — qo'llanadi, yig'ma plitkalar,
// diagramma va jadval shu bitta to'plamdan chiziladi. Tur va holat nomlari lug'atdan
// (`services.type_*` / `services.status_*`), noma'lum kodda server matni. 403 — ko'rib
// chiquvchi roli emas. Excel/PDF va ustunlarni yashirish — web.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { DatePickerModal } from '@/components/DatePicker';
import { useBreakpoint } from '@/utils/responsive';
import { Card, Chip, EmptyState, ErrorState, ListRow, Segmented, SelectField, Skeleton, StatTile, Text } from '@/ui';
import { requestStatsQuery } from '../api/queries';
import { isRangeInvalid } from '../utils/params';
import { fmtCell } from '../utils/table';
import {
  DEFAULT_SORT,
  EMPTY_REQUEST_FILTERS,
  activeRequestFilters,
  chartData,
  nextSort,
  requestSummary,
  sortRows,
  type GroupBy,
  type RequestFilters,
  type RowLabels,
  type SortKey,
} from '../utils/stats';
import { BarList } from './BarList';
import { OptionsSheet } from './OptionsSheet';

const fmtDate = (iso: string) => fmtCell({ v: iso, f: 'date' });
const SORTS: { key: SortKey; labelKey: string }[] = [
  { key: 'date', labelKey: 'reports.colDate' },
  { key: 'service', labelKey: 'reports.colType' },
  { key: 'status', labelKey: 'reports.colState' },
  { key: 'count', labelKey: 'reports.colCount' },
];

export function RequestsStats() {
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  const [f, setF] = useState<RequestFilters>(EMPTY_REQUEST_FILTERS);
  const [date, setDate] = useState<null | 'from' | 'to'>(null);
  const [picker, setPicker] = useState<null | { kind: 'type' | 'status'; n: number }>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const rangeInvalid = isRangeInvalid(f);
  const stats = useQuery(requestStatsQuery(f, !rangeInvalid));

  // Lug'atda bo'lsa — joriy tilda; aks holda server matni (ekran hech qachon bo'sh emas).
  const labels = useMemo<RowLabels>(
    () => ({
      service: (code, fb) => (i18n.exists(`services.type_${code}`) ? t(`services.type_${code}`) : fb || code),
      status: (code, fb) => (i18n.exists(`services.status_${code}`) ? t(`services.status_${code}`) : fb || code),
    }),
    [t],
  );
  const rows = useMemo(() => stats.data?.rows ?? [], [stats.data]);
  const sum = requestSummary(rows);
  const chart = useMemo(
    () => chartData(rows, groupBy, labels).map((d) => (groupBy === 'date' ? { ...d, name: fmtDate(d.name) } : d)),
    [rows, groupBy, labels],
  );
  const sorted = useMemo(() => sortRows(rows, sort, labels), [rows, sort, labels]);
  const denied = (stats.error as { response?: { status?: number } } | null)?.response?.status === 403;

  if (denied) {
    return (
      <Card>
        <EmptyState title={t('reports.noAccess')} message={t('reports.noAccessHint')} pose="sad" />
      </Card>
    );
  }

  const basis = sizeClass === 'compact' ? '47%' : '23%';
  const pickerOptions =
    picker?.kind === 'type'
      ? (stats.data?.service_types ?? []).map((s) => ({ value: s.value, label: labels.service(s.value, s.label) }))
      : (stats.data?.statuses ?? []).map((s) => ({ value: s.value, label: labels.status(s.value, s.label) }));
  const typeLabel = f.type
    ? labels.service(f.type, stats.data?.service_types.find((s) => s.value === f.type)?.label ?? f.type)
    : '';
  const statusLabel = f.status
    ? labels.status(f.status, stats.data?.statuses.find((s) => s.value === f.status)?.label ?? f.status)
    : '';
  const tiles = [
    { key: 'total', label: t('reports.sumTotal'), value: sum.total, icon: 'inbox', tint: 'violet' },
    { key: 'open', label: t('reports.sumOpen'), value: sum.open, icon: 'clock', tint: 'amber' },
    { key: 'done', label: t('reports.sumDone'), value: sum.done, icon: 'check', tint: 'green' },
    { key: 'rejected', label: t('reports.sumRejected'), value: sum.rejected, icon: 'close', tint: 'pink' },
  ] as const;

  return (
    <View style={styles.root}>
      <Card>
        <View style={styles.panel}>
          <View style={styles.pair}>
            <View style={styles.half}>
              <SelectField
                testID="requests-from"
                label={t('reports.dateFrom')}
                value={f.from ? fmtDate(f.from) : ''}
                placeholder={t('reports.allPeriod')}
                icon="calendar"
                onPress={() => setDate('from')}
              />
            </View>
            <View style={styles.half}>
              <SelectField
                testID="requests-to"
                label={t('reports.dateTo')}
                value={f.to ? fmtDate(f.to) : ''}
                placeholder={t('reports.allPeriod')}
                icon="calendar"
                onPress={() => setDate('to')}
              />
            </View>
          </View>
          {rangeInvalid && (
            <Text variant="caption" tone="danger">
              {t('reports.invalidRange')}
            </Text>
          )}
          <SelectField
            testID="requests-type"
            label={t('reports.type')}
            value={typeLabel}
            placeholder={t('reports.allTypes')}
            onPress={() => setPicker({ kind: 'type', n: Date.now() })}
          />
          <SelectField
            testID="requests-status"
            label={t('reports.state')}
            value={statusLabel}
            placeholder={t('reports.allStates')}
            onPress={() => setPicker({ kind: 'status', n: Date.now() })}
          />
          {activeRequestFilters(f) > 0 && (
            <View style={styles.chips}>
              <Chip
                testID="requests-reset"
                label={t('common.clearFilters')}
                onPress={() => setF(EMPTY_REQUEST_FILTERS)}
              />
            </View>
          )}
        </View>
      </Card>

      <View style={styles.tiles}>
        {tiles.map((x) => (
          <View key={x.key} style={{ flexBasis: basis, flexGrow: 1 }}>
            <StatTile
              testID={`requests-tile-${x.key}`}
              label={x.label}
              value={stats.isPending ? '—' : x.value}
              icon={x.icon}
              tint={x.tint}
            />
          </View>
        ))}
      </View>

      {stats.isError ? (
        <Card>
          <ErrorState onRetry={() => stats.refetch()} />
        </Card>
      ) : (
        <>
          <Card title={t('reports.chartTitle')} icon="chart" tint="violet">
            <View style={styles.panel}>
              <Segmented<GroupBy>
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'date', label: t('reports.byPeriod') },
                  { value: 'service', label: t('reports.byType') },
                  { value: 'status', label: t('reports.byState') },
                ]}
              />
              {stats.isPending ? (
                <Skeleton height={180} />
              ) : chart.length === 0 ? (
                <EmptyState title={t('reports.noData')} message={t('reports.noDataHint')} />
              ) : (
                <BarList data={chart} testID="requests-chart" />
              )}
            </View>
          </Card>

          <Card title={t('reports.tableTitle')} icon="checklist" tint="violet">
            <View style={styles.chips}>
              {SORTS.map((s) => (
                <Chip
                  key={s.key}
                  testID={`requests-sort-${s.key}`}
                  label={`${t(s.labelKey)}${sort.key === s.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}`}
                  selected={sort.key === s.key}
                  onPress={() => setSort((x) => nextSort(x, s.key))}
                />
              ))}
            </View>
            {stats.isPending ? (
              <Skeleton height={160} />
            ) : sorted.length === 0 ? (
              <EmptyState title={t('reports.noData')} message={t('reports.noDataHint')} />
            ) : (
              <>
                {sorted.map((r, i) => (
                  <ListRow
                    key={`${r.date}-${r.service_type}-${r.status}-${i}`}
                    testID={`requests-row-${i}`}
                    title={labels.service(r.service_type, r.service_label)}
                    subtitle={`${fmtDate(r.date)} · ${labels.status(r.status, r.status_label)}`}
                    right={
                      <Text variant="label" weight="700">
                        {r.count}
                      </Text>
                    }
                  />
                ))}
                <ListRow
                  testID="requests-total"
                  title={t('reports.totalRow')}
                  right={
                    <Text variant="label" weight="800">
                      {sum.total}
                    </Text>
                  }
                />
              </>
            )}
          </Card>
        </>
      )}
      <Text variant="caption" tone="subtle">
        {t('reports.requestsWebOnly')}
      </Text>

      {date && (
        <DatePickerModal
          visible
          title={date === 'from' ? t('reports.dateFrom') : t('reports.dateTo')}
          value={(date === 'from' ? f.from : f.to) || null}
          onConfirm={(iso) => setF((x) => ({ ...x, [date]: iso }))}
          onClose={() => setDate(null)}
        />
      )}
      {picker && (
        <OptionsSheet
          key={picker.n}
          title={picker.kind === 'type' ? t('reports.type') : t('reports.state')}
          options={pickerOptions}
          multiple={false}
          selected={picker.kind === 'type' ? (f.type ? [f.type] : []) : f.status ? [f.status] : []}
          onChange={(next) => setF((x) => ({ ...x, [picker.kind]: next[0] == null ? '' : String(next[0]) }))}
          onClose={() => setPicker(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  panel: { gap: 10 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
