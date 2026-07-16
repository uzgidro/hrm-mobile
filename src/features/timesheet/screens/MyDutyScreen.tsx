import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { LoadingView, ErrorState, EmptyState } from '@/components/StateViews';
import { monthName, weekdayNameShort } from '@/i18n/dates';
import { employeeSubLabel } from '@/utils/roles';
import type { Employee } from '@/types';
import { myNavbatchilikGroupsQuery, groupMembersQuery, myScheduleDaysQuery } from '../api/queries';
import { dutyDayMeta, sortScheduleDays, shiftColor, shiftIndexIn, timeRange, backendWeekdayToDayjs } from '../duty';

// "Мои дежурства" — READ-ONLY navbatchilik view (my duty days + my groups +
// the group roster). The web employee page renders editable cells and relies
// on the backend to reject writes; mobile deliberately ships no mutations —
// editing/approve stays on the desktop WorkSchedulePage (see the plan note).
export default function MyDutyScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const monthKey = currentMonth.format('YYYY-MM');
  const groupsQ = useQuery(myNavbatchilikGroupsQuery());
  const daysQ = useQuery(myScheduleDaysQuery(monthKey, employeeId));

  const groups = useMemo(() => groupsQ.data ?? [], [groupsQ.data]);
  const selectedGroup = groups[Math.min(selectedGroupIdx, Math.max(0, groups.length - 1))];
  const membersQ = useQuery({ ...groupMembersQuery(selectedGroup?.id ?? 0), enabled: !!selectedGroup });

  const days = useMemo(() => sortScheduleDays(daysQ.data ?? []), [daysQ.data]);
  const members: Employee[] = membersQ.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([groupsQ.refetch(), daysQ.refetch(), selectedGroup ? membersQ.refetch() : Promise.resolve()]);
    setRefreshing(false);
  }, [groupsQ, daysQ, membersQ, selectedGroup]);

  const isLoading = groupsQ.isLoading || daysQ.isLoading;
  // Either query failing is an error — masking a failed schedule fetch as an
  // "empty month" would be indistinguishable from having no duty.
  const isError = groupsQ.isError || daysQ.isError;
  // Web parity (NavbatchilikPage empty state): no dept duty, no groups → empty.
  // The month's day rows only count on the CURRENT month — otherwise paging to
  // an unassigned month would swallow the month nav into the global empty state.
  const hasStructuralDuty = groups.length > 0 || !!user?.employee?.department?.has_navbatchilik;
  const showGlobalEmpty =
    !hasStructuralDuty && days.length === 0 && monthKey === dayjs().format('YYYY-MM');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('timesheet.dutyTitle')}</Text>
          <Text style={styles.headerSub}>{t('timesheet.dutySubtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('timesheet.dutyLoadError')} onRetry={() => { void groupsQ.refetch(); void daysQ.refetch(); }} />
      ) : showGlobalEmpty ? (
        <EmptyState icon="calendar" title={t('timesheet.dutyEmpty')} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        >
          <View style={styles.card}>
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}>
                <Icon name="chevronLeft" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthName(currentMonth.month())} {currentMonth.year()}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.add(1, 'month'))}>
                <Icon name="chevronRight" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.cardTitle}>{t('timesheet.myDaysTitle')}</Text>
            {days.length === 0 ? (
              <Text style={styles.emptyText}>{t('timesheet.dutyMonthEmpty')}</Text>
            ) : (
              days.map((d) => {
                const meta = dutyDayMeta(d);
                const idx = shiftIndexIn(selectedGroup?.shifts, meta.label);
                const chipColor = meta.isDayOff
                  ? colors.textMuted
                  : idx >= 0 ? shiftColor(idx, colors) : colors.primaryLight;
                return (
                  <View key={d.id} style={styles.dayRow}>
                    <View style={styles.dayDateCol}>
                      <Text style={styles.dayDate}>{dayjs(d.schedule_date).format('D MMM')}</Text>
                      <Text style={styles.dayWeekday}>{weekdayNameShort(dayjs(d.schedule_date).day())}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: chipColor }]}>
                      <Text style={styles.chipText}>{meta.isDayOff ? t('timesheet.dutyDayOff') : (meta.label ?? '—')}</Text>
                    </View>
                    <Text style={styles.dayTime}>{meta.time}</Text>
                  </View>
                );
              })
            )}
          </View>

          {groups.length > 1 && (
            <View style={styles.tabsRow}>
              {groups.map((g, i) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.tab, i === selectedGroupIdx && styles.tabActive]}
                  onPress={() => setSelectedGroupIdx(i)}
                >
                  <Text style={[styles.tabText, i === selectedGroupIdx && styles.tabTextActive]} numberOfLines={1}>
                    {g.name ?? `#${g.id}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedGroup && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{selectedGroup.name ?? t('timesheet.dutyTitle')}</Text>

              {(selectedGroup.shifts?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t('timesheet.shiftsLabel')}</Text>
                  <View style={styles.shiftsRow}>
                    {selectedGroup.shifts!.map((s, i) => (
                      <View key={`${s.name}-${i}`} style={[styles.shiftChip, { borderColor: shiftColor(i, colors) }]}>
                        <View style={[styles.shiftDot, { backgroundColor: shiftColor(i, colors) }]} />
                        <Text style={styles.shiftName}>{s.name ?? '—'}</Text>
                        {!!timeRange(s.start, s.end) && <Text style={styles.shiftTime}>{timeRange(s.start, s.end)}</Text>}
                      </View>
                    ))}
                  </View>
                </>
              )}

              {(selectedGroup.weekdays?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t('timesheet.weekdaysLabel')}</Text>
                  <View style={styles.weekdaysRow}>
                    {selectedGroup.weekdays!.map((w) => (
                      <View key={w} style={styles.weekdayPill}>
                        <Text style={styles.weekdayPillText}>{weekdayNameShort(backendWeekdayToDayjs(w))}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.sectionLabel}>
                {t('timesheet.membersTitle')}
                {members.length > 0 ? ` · ${t('timesheet.membersCount', { count: members.length })}` : ''}
              </Text>
              {membersQ.isLoading ? (
                <Text style={styles.emptyText}>…</Text>
              ) : (
                members.map((emp, idx) => (
                  <View key={emp.id} style={[styles.memberRow, idx < members.length - 1 && styles.memberRowBorder]}>
                    <EmployeeAvatar emp={emp} size={40} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>{emp.legal_name}</Text>
                      <Text style={styles.memberSub} numberOfLines={1}>{employeeSubLabel(emp)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
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
    content: { paddingHorizontal: 16, paddingBottom: 32 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 10 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
    emptyText: { color: c.textMuted, fontSize: 14, paddingVertical: 8 },

    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    navBtn: { width: 40, height: 40, backgroundColor: c.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
    monthTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
    dayDateCol: { width: 64 },
    dayDate: { fontSize: 14, fontWeight: '700', color: c.text },
    dayWeekday: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    chipText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    dayTime: { flex: 1, textAlign: 'right', fontSize: 13, color: c.textSecondary },

    tabsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.primaryLight },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary, paddingHorizontal: 8 },
    tabTextActive: { color: c.primaryLight },

    shiftsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    shiftChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    shiftDot: { width: 8, height: 8, borderRadius: 4 },
    shiftName: { fontSize: 13, fontWeight: '700', color: c.text },
    shiftTime: { fontSize: 12, color: c.textSecondary },

    weekdaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    weekdayPill: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    weekdayPillText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },

    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    memberRowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '600', color: c.text },
    memberSub: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  });
