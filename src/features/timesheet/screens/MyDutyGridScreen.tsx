import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, ErrorState, EmptyState } from '@/components/StateViews';
import { monthName } from '@/i18n/dates';
import type { Employee } from '@/types';
import { myNavbatchilikGroupsQuery, groupMembersQuery, groupScheduleDaysQuery } from '../api/queries';
import { dutyDayMeta, shiftColor, shiftIndexIn, scheduleDayMap } from '../duty';

// Variant 1 of "дежурства других": a member × day-of-month grid, mirroring the
// web NavbatchilikGrid. Read-only. Rows = group roster, columns = month days,
// cell = shift chip / day-off / empty. Horizontally scrollable.
const NAME_COL_WIDTH = 128;
const CELL_WIDTH = 40;

export default function MyDutyGridScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const monthKey = currentMonth.format('YYYY-MM');
  const groupsQ = useQuery(myNavbatchilikGroupsQuery());
  const groups = useMemo(() => groupsQ.data ?? [], [groupsQ.data]);
  const selectedGroup = groups[Math.min(selectedGroupIdx, Math.max(0, groups.length - 1))];

  const membersQ = useQuery({ ...groupMembersQuery(selectedGroup?.id ?? 0), enabled: !!selectedGroup });
  const groupDaysQ = useQuery({ ...groupScheduleDaysQuery(monthKey, selectedGroup?.id), enabled: !!selectedGroup });

  const members: Employee[] = membersQ.data ?? [];
  const dayMap = useMemo(() => scheduleDayMap(groupDaysQ.data ?? []), [groupDaysQ.data]);

  const monthDays = useMemo(() => {
    const n = currentMonth.daysInMonth();
    return Array.from({ length: n }, (_, i) => currentMonth.date(i + 1).format('YYYY-MM-DD'));
  }, [currentMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([groupsQ.refetch(), selectedGroup ? membersQ.refetch() : Promise.resolve(), selectedGroup ? groupDaysQ.refetch() : Promise.resolve()]);
    setRefreshing(false);
  }, [groupsQ, membersQ, groupDaysQ, selectedGroup]);

  const isLoading = groupsQ.isLoading;
  const isError = groupsQ.isError;
  const showEmpty = !isLoading && groups.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('timesheet.dutyGridTitle')}</Text>
          <Text style={styles.headerSub}>{t('timesheet.dutyGridSubtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('timesheet.dutyLoadError')} onRetry={() => { void groupsQ.refetch(); }} />
      ) : showEmpty ? (
        <EmptyState icon="calendar" title={t('timesheet.dutyEmpty')} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        >
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}>
              <Icon name="chevronLeft" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthName(currentMonth.month())} {currentMonth.year()}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.add(1, 'month'))}>
              <Icon name="chevronRight" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {groups.length > 1 && (
            <View style={styles.tabsRow}>
              {groups.map((g, i) => (
                <TouchableOpacity key={g.id} style={[styles.tab, i === selectedGroupIdx && styles.tabActive]} onPress={() => setSelectedGroupIdx(i)}>
                  <Text style={[styles.tabText, i === selectedGroupIdx && styles.tabTextActive]} numberOfLines={1}>{g.name ?? `#${g.id}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {membersQ.isLoading ? (
            <Text style={styles.hint}>…</Text>
          ) : members.length === 0 ? (
            <Text style={styles.hint}>{t('timesheet.dutyMonthEmpty')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.gridScroll}>
              <View>
                {/* Header row: day numbers */}
                <View style={styles.gridRow}>
                  <View style={[styles.nameCell, styles.headerCell]}>
                    <Text style={styles.gridHeaderText} numberOfLines={1}>{t('timesheet.membersTitle')}</Text>
                  </View>
                  {monthDays.map((d) => {
                    const dj = dayjs(d);
                    const isWeekend = ((dj.day() + 6) % 7) >= 5;
                    return (
                      <View key={d} style={[styles.dayCell, styles.headerCell]}>
                        <Text style={[styles.gridHeaderText, isWeekend && styles.weekendText]}>{dj.date()}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Member rows */}
                {members.map((emp) => (
                  <View key={emp.id} style={styles.gridRow}>
                    <View style={styles.nameCell}>
                      <Text style={styles.nameText} numberOfLines={2}>{emp.legal_name}</Text>
                    </View>
                    {monthDays.map((d) => {
                      const entry = dayMap[`${emp.id}_${d}`];
                      if (!entry) return <View key={d} style={styles.dayCell} />;
                      const meta = dutyDayMeta(entry);
                      const sIdx = shiftIndexIn(selectedGroup?.shifts, meta.label);
                      const bg = meta.isDayOff
                        ? colors.textMuted
                        : sIdx >= 0 ? shiftColor(sIdx, colors) : colors.primaryLight;
                      return (
                        <View key={d} style={styles.dayCell}>
                          <View style={[styles.cellChip, { backgroundColor: bg }]}>
                            <Text style={styles.cellChipText} numberOfLines={1}>
                              {meta.isDayOff ? t('timesheet.dutyDayOff') : (meta.label ?? '•')}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    navBtn: { width: 40, height: 40, backgroundColor: c.card, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
    monthTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.primaryLight },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary, paddingHorizontal: 8 },
    tabTextActive: { color: c.primaryLight },

    hint: { color: c.textMuted, fontSize: 14, paddingVertical: 12, textAlign: 'center' },

    gridScroll: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder },
    gridRow: { flexDirection: 'row', alignItems: 'stretch' },
    headerCell: { backgroundColor: c.bg },
    nameCell: { width: NAME_COL_WIDTH, paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', borderRightWidth: 1, borderRightColor: c.cardBorder, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    nameText: { fontSize: 12, fontWeight: '600', color: c.text },
    gridHeaderText: { fontSize: 12, fontWeight: '700', color: c.textSecondary, textAlign: 'center' },
    weekendText: { color: c.primaryLight },
    dayCell: { width: CELL_WIDTH, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRightWidth: 1, borderRightColor: c.cardBorder, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    cellChip: { minWidth: 28, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 3, alignItems: 'center' },
    cellChipText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  });
