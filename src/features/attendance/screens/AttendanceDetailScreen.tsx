import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { filterFromParam } from '../utils/filterParam';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { compareByRazryad, type AttendanceStatus, type RosterRow as RosterRowData } from '@/utils/attendanceRoster';
import { matchesQuery } from '@/utils/searchFold';
import { useDayRoster } from '@/lib/useDayRoster';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { getApiErrorMessage } from '@/api/errors';
import { monthName, weekdayName } from '@/i18n/dates';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBox } from '@/components/SearchBox';
import { LoadingView, ErrorState } from '@/components/StateViews';
import { AttendanceDonut } from '@/components/AttendanceDonut';
import { RosterRow } from '@/components/RosterRow';
import { Chip } from '@/ui';
import { useActiveBranchId } from '@/lib/useActiveBranch';

type StatusGroup = AttendanceStatus;
type Scope = 'branch' | 'department';

/** Filtrlangan qatorlar bo'yicha donut sonlari — qidiruv/bo'lim tanlansa diagramma ham mos. */
export function rosterCounts(rows: RosterRowData[]) {
  const c = { total: rows.length, present: 0, late: 0, onLeave: 0, absent: 0 };
  for (const r of rows) c[r.status] += 1;
  return c;
}

/**
 * Bugungi (yoki tanlangan kun) filial jamoasi: kim keldi / kech qoldi / so'rovda / kelmadi.
 * `embedded` — Davomat tabining «Jamoa» segmenti ichida (sarlavhasiz, safe-area'siz).
 * 2026-10-06: qidiruv + «Butun filial / Mening bo'limim»; 2000+ qatorli filialda ham silliq
 * bo'lishi uchun FlatList (ilgari ScrollView ichida hammasi birdan chizilardi).
 */
export default function AttendanceDetailScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useActiveBranchId();
  const onlySubordinates = usePrefsStore((s) => s.onlySubordinates);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const myId = user?.employee?.id;
  const myDeptId = user?.employee?.department?.id ?? null;
  const orgBranchId = activeBranchId;

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  // Bosh sahifa tile'idan (`?filter=late` …) kelsa — shu holat bilan ochiladi.
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [sectionFilter, setSectionFilter] = useState<StatusGroup | null>(() => filterFromParam(filter));
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, 200);
  const [scope, setScope] = useState<Scope>('branch');
  const selDay = dayjs(selectedDate);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  // Genitive month after the day number (ru «5 октября», not «5 октябрь»).
  const dateLabel = `${selDay.date()} ${monthName(selDay.month(), { genitive: true })} ${selDay.year()} (${weekdayName(selDay.day())})`;

  const prevDay = () => setSelectedDate(selDay.subtract(1, 'day').format('YYYY-MM-DD'));
  const nextDay = () => setSelectedDate(selDay.add(1, 'day').format('YYYY-MM-DD'));

  // Today → branch categories (web employee-dashboard source); past days →
  // /normalized. See `useDayRoster`.
  const { roster: { rows, dayOff = [] }, isLoading, isError, error, refetch, isFetching } = useDayRoster({
    date: selectedDate, orgBranchId, onlySubordinates, myId,
  });

  const inScope = useCallback(
    (r: RosterRowData) =>
      (scope === 'branch' || (myDeptId != null && r.employee.department?.id === myDeptId)) &&
      matchesQuery(query, r.employee.legal_name, r.employee.job_position?.name, r.employee.department?.name),
    [scope, myDeptId, query],
  );
  // «Mening bo'limim» — razryad bo'yicha (rahbar tepada); filial ro'yxati alifbo tartibida qoladi.
  const order = useCallback(
    (list: RosterRowData[]) => (scope === 'department' ? [...list].sort(compareByRazryad) : list),
    [scope],
  );
  const scopedRows = useMemo(() => order(rows.filter(inScope)), [rows, inScope, order]);
  const scopedDayOff = useMemo(() => order(dayOff.filter(inScope)), [dayOff, inScope, order]);
  const counts = useMemo(() => rosterCounts(scopedRows), [scopedRows]);
  // One alphabetical list; the donut zone (sectionFilter) narrows it.
  const visibleRows = useMemo(
    () => (sectionFilter ? scopedRows.filter((r) => r.status === sectionFilter) : scopedRows),
    [scopedRows, sectionFilter],
  );
  const filtersActive = !!query.trim() || scope !== 'branch';

  const dateNav = (
    <View style={styles.navBtns}>
      <TouchableOpacity onPress={prevDay} style={styles.navBtn} accessibilityLabel={t('common.back')}>
        <Icon name="chevronLeft" size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity onPress={nextDay} style={[styles.navBtn, isToday && styles.navBtnDisabled]} disabled={isToday}>
        <Icon name="chevronRight" size={20} color={isToday ? colors.textMuted : colors.text} />
      </TouchableOpacity>
    </View>
  );

  const header = (
    <View>
      {embedded && (
        <View style={styles.embeddedDate}>
          <Text style={styles.embeddedDateText}>{dateLabel}</Text>
          {dateNav}
        </View>
      )}
      {onlySubordinates && (
        <View style={styles.filterNotice}>
          <Icon name="users" size={16} color={colors.primaryLight} />
          <Text style={styles.filterNoticeText}>{t('attendance.onlySubordinates')}</Text>
        </View>
      )}
      <View style={styles.chartCard}>
        <AttendanceDonut total={counts.total} present={counts.present} late={counts.late} onLeave={counts.onLeave}
          activeFilter={sectionFilter} onFilter={setSectionFilter} colors={colors} />
      </View>
      <View style={styles.filters}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('attendance.searchPlaceholder')} testID="roster-search" />
        {myDeptId != null && (
          <View style={styles.chips}>
            <Chip testID="roster-scope-branch" label={t('attendance.scopeBranch')} selected={scope === 'branch'} onPress={() => setScope('branch')} />
            <Chip testID="roster-scope-department" label={t('attendance.scopeDepartment')} selected={scope === 'department'} onPress={() => setScope('department')} />
          </View>
        )}
      </View>
      <View style={[styles.rosterCardTop, visibleRows.length === 0 && styles.rosterCardSingle]}>
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>
            {sectionFilter ? t(`attendance.section.${sectionFilter}`) : t('attendance.allEmployees')} ({visibleRows.length})
          </Text>
          {(sectionFilter || filtersActive) && (
            <TouchableOpacity
              onPress={() => { setSectionFilter(null); setSearch(''); setScope('branch'); }}
              testID="roster-clear"
            >
              <Text style={styles.linkText}>{t('attendance.showAll')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {visibleRows.length === 0 && (
          <Text style={styles.emptySection}>
            {filtersActive ? t('common.noMatch') : t('attendance.sectionEmpty.present')}
          </Text>
        )}
      </View>
    </View>
  );

  const footer = (
    <View>
      {visibleRows.length > 0 && <View style={styles.rosterCardBottom} />}
      {/* Not expected today (day off / holiday): listed apart and OUT of the
          donut — the same total as Home «Bugungi tabelda» (web v2 DashboardPage). */}
      {!sectionFilter && scopedDayOff.length > 0 && (
        <View style={styles.rosterCard} testID="attendance-day-off">
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>{t('attendance.dayOffTitle')} ({scopedDayOff.length})</Text>
          </View>
          {scopedDayOff.map((row, idx) => (
            <RosterRow key={row.employee.id} row={row} colors={colors} showBorder={idx < scopedDayOff.length - 1} />
          ))}
        </View>
      )}
      <View style={{ height: 32 }} />
    </View>
  );

  const renderItem = useCallback(
    ({ item, index }: { item: RosterRowData; index: number }) => (
      <View style={styles.rosterCardMiddle}>
        <RosterRow row={item} colors={colors} showBorder={index < visibleRows.length - 1} />
      </View>
    ),
    [colors, styles.rosterCardMiddle, visibleRows.length],
  );

  const body = isLoading ? (
    <LoadingView />
  ) : isError ? (
    <ErrorState message={getApiErrorMessage(error, t('errors.refreshFailed'))} onRetry={refetch} />
  ) : (
    <FlatList
      testID="roster-list"
      data={visibleRows}
      keyExtractor={(r) => String(r.employee.id)}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={20}
      maxToRenderPerBatch={30}
      windowSize={11}
      removeClippedSubviews
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
    />
  );

  if (embedded) return <View style={styles.flex}>{body}</View>;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('attendance.title')} subtitle={dateLabel} right={dateNav} />
      {body}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => {
  const card = { backgroundColor: c.card, borderColor: c.cardBorder, borderLeftWidth: 2, borderRightWidth: 2 };
  return StyleSheet.create({
    flex: { flex: 1 },
    navBtns: { flexDirection: 'row', gap: 6 },
    navBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: c.card, borderWidth: 2, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    navBtnDisabled: { opacity: 0.35 },
    embeddedDate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    embeddedDateText: { fontSize: 14, color: c.textMuted, ...ff('700') },

    content: { paddingHorizontal: 16, paddingTop: 16 },
    filterNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
    filterNoticeText: { fontSize: 13, color: c.primaryLight, ...ff('700') },

    chartCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, marginBottom: 14, paddingVertical: 16 },
    filters: { gap: 10, marginBottom: 14 },
    chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

    // Bitta karta FlatList qatorlaridan yig'iladi: tepasi (sarlavha) + o'rtasi (qatorlar) + pasti.
    rosterCardTop: { ...card, borderTopWidth: 2, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
    rosterCardSingle: { borderBottomWidth: 4, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginBottom: 14 },
    rosterCardMiddle: { ...card },
    rosterCardBottom: { ...card, height: 8, borderBottomWidth: 4, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginBottom: 14 },
    rosterCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, marginBottom: 14, overflow: 'hidden' },
    rosterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: c.cardBorder },
    rosterTitle: { fontSize: 15, ...ff('800'), color: c.text, flexShrink: 1 },
    linkText: { fontSize: 13, color: c.primaryLight, ...ff('700') },
    emptySection: { color: c.textMuted, fontSize: 13, paddingHorizontal: 16, paddingVertical: 12, ...ff('700') },
  });
};
