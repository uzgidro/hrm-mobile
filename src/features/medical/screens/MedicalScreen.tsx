// v3 Tibbiy ko'rik — web v2 `MedicalPage` porti: «Energetiklar sihatgohi» orqali butun
// tashkilotning davriy ko'riklar reyestri. Holat (O'tgan / Muddati yaqin / Muddati o'tgan)
// SERVERDA hisoblanadi — mijoz qayta hisoblamaydi. Plitkalar — shu toraytirish bilan
// serverdan olingan sonlar va bir vaqtda holat filtri. Modul darvozasi `medical_enabled`
// (auth/me; v2 RequireRole). Yozish huquqlari tafsilot javobidagi bayroqlardan.
// Excel eksport, ommaviy ko'rik, doktor/mutaxassislik boshqaruvi — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useBreakpoint } from '@/utils/responsive';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { departmentOptionsQuery, jobPositionOptionsQuery } from '@/utils/employees';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PickerModal } from '@/components/PickerModal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  SelectField,
  Skeleton,
  StatTile,
  Text,
} from '@/ui';
import { MEDICAL_PAGE_SIZE, medicalBranchesQuery, medicalCountQuery, medicalEmployeesQuery } from '../api/queries';
import { MedicalDetailSheet } from '../components/MedicalDetailSheet';
import {
  EMPTY_FILTERS,
  HEALTH_INDEXES,
  activeFilterCount,
  fmtDate,
  foldedCount,
  indexTone,
  pageCount,
  previousYears,
  rowSubtitle,
  statusTone,
  type MedicalFilters,
  type MedicalRow,
} from '../utils/medical';

type Picker = null | 'branch' | 'dept' | 'pos';

const TILES = [
  { status: '', icon: 'users', tint: 'violet' },
  { status: 'passed', icon: 'check', tint: 'green' },
  { status: 'due_soon', icon: 'clock', tint: 'amber' },
  { status: 'overdue', icon: 'bell', tint: 'pink' },
] as const;

export default function MedicalScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = user?.medical_enabled === true;
  const { sizeClass } = useBreakpoint();
  const [filters, setFilters] = useState<MedicalFilters>(EMPTY_FILTERS);
  const debounced = useDebouncedValue(filters.search);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [viewing, setViewing] = useState<{ row: MedicalRow; n: number } | null>(null);

  // Ro'yxat va plitkalar BIR XIL toraytirish bilan (v2 `medicalFilters`); qidiruv — debounce'dan.
  const f = { ...filters, search: debounced };
  const list = useQuery(medicalEmployeesQuery(f, page, allowed));
  // Hooklar tartibi o'zgarmas: to'rtta plitka — to'rtta so'rov (v2 `countAll/Passed/Soon/Overdue`).
  const c0 = useQuery(medicalCountQuery(f, TILES[0].status, allowed));
  const c1 = useQuery(medicalCountQuery(f, TILES[1].status, allowed));
  const c2 = useQuery(medicalCountQuery(f, TILES[2].status, allowed));
  const c3 = useQuery(medicalCountQuery(f, TILES[3].status, allowed));
  const counts = [c0, c1, c2, c3];

  // Bo'lim/lavozim ro'yxati tanlangan filial filtri bo'yicha, bo'lmasa o'z filiali
  // (v2: sarlavhadagi filial — mobil'da sarlavha tanlagichi yo'q).
  const optionsBranch = filters.branchId ?? resolveEmployeeBranchId(user?.employee);
  const branches = useQuery(medicalBranchesQuery(allowed && (picker === 'branch' || filters.branchId != null)));
  const departments = useQuery({
    ...departmentOptionsQuery(optionsBranch),
    enabled: allowed && (picker === 'dept' || filters.departmentId != null),
  });
  const positions = useQuery({
    ...jobPositionOptionsQuery(optionsBranch),
    enabled: allowed && (picker === 'pos' || filters.jobPositionId != null),
  });

  const patch = (p: Partial<MedicalFilters>) => {
    setFilters((x) => ({ ...x, ...p }));
    setPage(1);
  };
  const nameOf = (rows: { id: number; name?: string | null }[] | undefined, id: number | null) =>
    id == null ? '' : rows?.find((r) => r.id === id)?.name || `#${id}`;

  const header = <PageHeader title={t('medical.title')} subtitle={t('medical.subtitle')} />;

  if (!allowed) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('medical.noAccess')} message={t('medical.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const rows = list.data?.items ?? [];
  const pages = pageCount(list.data?.total ?? 0, MEDICAL_PAGE_SIZE);
  const folded = foldedCount(filters);
  const active = activeFilterCount(filters);
  const compact = sizeClass === 'compact';
  const basis = compact ? '47%' : '23%';
  const now = dayjs().year();

  const pickerOptions = (
    (picker === 'branch' ? branches.data : picker === 'dept' ? departments.data : positions.data) ?? []
  ).map((o) => ({ value: o.id, label: o.name || `#${o.id}` }));
  const pickerLoading =
    picker === 'branch' ? branches.isFetching : picker === 'dept' ? departments.isFetching : positions.isFetching;
  const pickerTitle =
    picker === 'branch' ? t('medical.colBranch') : picker === 'dept' ? t('medical.department') : t('medical.position');
  const pickerSelected =
    picker === 'branch' ? filters.branchId : picker === 'dept' ? filters.departmentId : filters.jobPositionId;
  const onPick = (id: number) => {
    setPicker(null);
    // Filial o'zgarsa — bo'lim/lavozim ro'yxati boshqa filialniki: eski tanlov tashlanadi.
    if (picker === 'branch') patch({ branchId: id, departmentId: null, jobPositionId: null });
    else if (picker === 'dept') patch({ departmentId: id });
    else patch({ jobPositionId: id });
  };

  const tileLabel = (s: string) => (s ? t(`medical.status_${s}`) : t('medical.filterAll'));

  return (
    <View style={styles.root}>
      <Screen
        refreshing={list.isRefetching}
        onRefresh={() => void Promise.all([list.refetch(), ...counts.map((c) => c.refetch())])}
      >
        {header}
        <View style={styles.tiles}>
          {TILES.map((x, i) => (
            <View key={x.status || 'all'} style={{ flexBasis: basis, flexGrow: 1 }}>
              <StatTile
                testID={`medical-tile-${x.status || 'all'}`}
                label={tileLabel(x.status)}
                // Son kelguncha «…» (v2), xato bo'lsa «—» — «0» yolg'on bo'lardi.
                value={counts[i]!.data ?? (counts[i]!.isError ? '—' : '…')}
                icon={x.icon}
                tint={x.tint}
                selected={filters.status === x.status}
                onPress={() => patch({ status: x.status })}
              />
            </View>
          ))}
        </View>

        <View style={styles.filters}>
          <SearchField
            value={filters.search}
            onChangeText={(v) => patch({ search: v })}
            placeholder={t('medical.searchPlaceholder')}
          />
          <View style={styles.chips}>
            <Chip
              testID="medical-filters-toggle"
              label={t('medical.filters')}
              count={folded || undefined}
              selected={filtersOpen}
              onPress={() => setFiltersOpen((o) => !o)}
            />
            {active > 0 && (
              <Chip
                testID="medical-filters-reset"
                label={t('common.clearFilters')}
                onPress={() => patch({ ...EMPTY_FILTERS, search: filters.search })}
              />
            )}
          </View>
          {filtersOpen && (
            <Card>
              <View style={styles.panel}>
                <SelectField
                  testID="medical-filter-branch"
                  label={t('medical.colBranch')}
                  value={nameOf(branches.data, filters.branchId)}
                  placeholder={t('medical.allBranches')}
                  onPress={() => setPicker('branch')}
                />
                <SelectField
                  testID="medical-filter-dept"
                  label={t('medical.department')}
                  value={nameOf(departments.data, filters.departmentId)}
                  placeholder={t('medical.allDepartments')}
                  onPress={() => setPicker('dept')}
                />
                <SelectField
                  testID="medical-filter-pos"
                  label={t('medical.position')}
                  value={nameOf(positions.data, filters.jobPositionId)}
                  placeholder={t('medical.allPositions')}
                  onPress={() => setPicker('pos')}
                />
                {(filters.branchId != null || filters.departmentId != null || filters.jobPositionId != null) && (
                  <Button
                    testID="medical-filter-clear-org"
                    label={t('common.clear')}
                    variant="ghost"
                    size="sm"
                    onPress={() => patch({ branchId: null, departmentId: null, jobPositionId: null })}
                  />
                )}
                <Text variant="label" tone="muted">
                  {t('medical.colIndex')}
                </Text>
                <View style={styles.chips}>
                  <Chip
                    label={t('medical.allIndexes')}
                    selected={!filters.healthIndex}
                    onPress={() => patch({ healthIndex: '' })}
                  />
                  {HEALTH_INDEXES.map((k) => (
                    <Chip
                      key={k}
                      testID={`medical-filter-index-${k}`}
                      label={t(`medical.index_${k}`)}
                      tone={indexTone(k)}
                      selected={filters.healthIndex === k}
                      onPress={() => patch({ healthIndex: filters.healthIndex === k ? '' : k })}
                    />
                  ))}
                </View>
                <Text variant="label" tone="muted">
                  {t('medical.year')}
                </Text>
                <View style={styles.chips}>
                  <Chip
                    label={`${t('medical.currentYear')} · ${now}`}
                    selected={!filters.year}
                    onPress={() => patch({ year: '' })}
                  />
                  {previousYears(now).map((y) => (
                    <Chip
                      key={y}
                      testID={`medical-filter-year-${y}`}
                      label={y}
                      selected={filters.year === y}
                      onPress={() => patch({ year: filters.year === y ? '' : y })}
                    />
                  ))}
                </View>
              </View>
            </Card>
          )}
        </View>

        <Card>
          {list.isError && !list.data ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={220} />
          ) : rows.length === 0 ? (
            active > 0 || !!debounced.trim() ? (
              <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
            ) : (
              <EmptyState title={t('medical.empty')} />
            )
          ) : (
            rows.map((r) => {
              const marks = (
                <>
                  {/* Badge o'zi `alignSelf: flex-start` — o'ram qatorda sana bilan markazda turishi uchun. */}
                  {!!r.status && (
                    <View>
                      <Badge
                        label={t(`medical.status_${r.status}`, { defaultValue: r.status })}
                        tone={statusTone(r.status)}
                      />
                    </View>
                  )}
                  {!!r.annual_index && (
                    <View>
                      <Badge
                        label={`${t(`medical.index_${r.annual_index}`, { defaultValue: r.annual_index })}${
                          r.annual_index_year ? ` · ${r.annual_index_year}` : ''
                        }`}
                        tone={indexTone(r.annual_index)}
                      />
                    </View>
                  )}
                  <Text variant="caption" tone="subtle">
                    {fmtDate(r.last_checkup_date)}
                  </Text>
                </>
              );
              return (
                <ListRow
                  key={r.id}
                  testID={`medical-row-${r.id}`}
                  title={r.legal_name || '—'}
                  subtitle={rowSubtitle(r) || undefined}
                  left={<Avatar name={r.legal_name || '?'} uri={r.photo_thumb_path || r.photo_path} size={36} />}
                  // Telefonda nishonlar va sana ism ostida — o'ng ustun ismni «Aliyeva Umida …» gacha qisardi.
                  below={compact ? <View style={styles.below}>{marks}</View> : undefined}
                  right={compact ? undefined : <View style={styles.right}>{marks}</View>}
                  onPress={() => setViewing({ row: r, n: Date.now() })}
                />
              );
            })
          )}
          <Pager page={page} pages={pages} onPage={setPage} />
        </Card>
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('medical.webOnly')}
        </Text>
      </Screen>

      {picker && (
        <PickerModal
          visible
          title={pickerTitle}
          options={pickerOptions}
          loading={pickerLoading}
          selected={pickerSelected}
          onClose={() => setPicker(null)}
          onSelect={onPick}
        />
      )}
      {viewing && <MedicalDetailSheet key={viewing.n} row={viewing.row} onClose={() => setViewing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  panel: { gap: 10 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: '45%' },
  below: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  note: { marginTop: 12 },
});
