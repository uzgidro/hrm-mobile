import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Employee, AttendanceEvent, WorkLeave } from '@/types';
import { employeesListQuery } from '@/utils/employees';
import { buildAttendanceRoster, type AttendanceStatus } from '@/utils/attendanceRoster';
import { monthName, weekdayName } from '@/i18n/dates';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView } from '@/components/StateViews';
import { AttendanceDonut } from '@/components/AttendanceDonut';
import { RosterRow } from '@/components/RosterRow';
import { dayAttendanceQuery, teamLeavesQuery } from '../api/queries';

type StatusGroup = AttendanceStatus;

export default function AttendanceDetailScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const onlySubordinates = usePrefsStore((s) => s.onlySubordinates);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const myId = user?.employee?.id;
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sectionFilter, setSectionFilter] = useState<StatusGroup | null>(null);
  const selDay = dayjs(selectedDate);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const dateLabel = `${selDay.date()} ${monthName(selDay.month())} ${selDay.year()} (${weekdayName(selDay.day())})`;

  const prevDay = () => setSelectedDate(selDay.subtract(1, 'day').format('YYYY-MM-DD'));
  const nextDay = () => setSelectedDate(selDay.add(1, 'day').format('YYYY-MM-DD'));

  const results = useQueries({
    queries: [
      employeesListQuery(orgBranchId),
      dayAttendanceQuery(selectedDate, orgBranchId),
      teamLeavesQuery(selectedDate, 100, orgBranchId),
    ],
  });

  const [empQ, attQ, leavesQ] = results;
  const isLoading = results.some((r) => r.isLoading);

  const { rows, counts } = useMemo(() => {
    let employees: Employee[] = empQ.data?.items ?? [];
    if (onlySubordinates && myId) employees = employees.filter((e) => e.supervisor_id === myId);
    const events: AttendanceEvent[] = attQ.data?.items ?? [];
    const workLeaves: WorkLeave[] = leavesQ.data ?? [];
    return buildAttendanceRoster(employees, events, workLeaves, selectedDate, t('attendance.leaveFallback'));
  }, [empQ.data, attQ.data, leavesQ.data, selectedDate, onlySubordinates, myId, t]);

  // One alphabetical list; the donut zone (sectionFilter) narrows it.
  const visibleRows = useMemo(
    () => (sectionFilter ? rows.filter((r) => r.status === sectionFilter) : rows),
    [rows, sectionFilter],
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('attendance.title')}
        subtitle={dateLabel}
        right={
          <View style={styles.navBtns}>
            <TouchableOpacity onPress={prevDay} style={styles.navBtn}><Icon name="chevronLeft" size={20} color={colors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={nextDay} style={[styles.navBtn, isToday && styles.navBtnDisabled]} disabled={isToday}>
              <Icon name="chevronRight" size={20} color={isToday ? colors.textMuted : colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {isLoading ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

          {/* One roster under the donut: all employees A→Z, each with a left
              status stripe; tapping a donut zone filters this single list. */}
          <View style={styles.rosterCard}>
            <View style={styles.rosterHeader}>
              <Text style={styles.rosterTitle}>
                {sectionFilter ? t(`attendance.section.${sectionFilter}`) : t('attendance.allEmployees')} ({visibleRows.length})
              </Text>
              {sectionFilter && (
                <TouchableOpacity onPress={() => setSectionFilter(null)}>
                  <Text style={styles.linkText}>{t('attendance.showAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {visibleRows.length === 0 ? (
              <Text style={styles.emptySection}>{t('attendance.sectionEmpty.present')}</Text>
            ) : (
              visibleRows.map((row, idx) => (
                <RosterRow key={row.employee.id} row={row} colors={colors} showBorder={idx < visibleRows.length - 1} />
              ))
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    navBtns: { flexDirection: 'row', gap: 6 },
    navBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    navBtnDisabled: { opacity: 0.35 },
    navArrow: { fontSize: 20, color: c.text, fontWeight: '600', lineHeight: 24 },
    navArrowDisabled: { color: c.textMuted },

    content: { paddingHorizontal: 16, paddingTop: 16 },
    filterNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
    filterNoticeText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },

    chartCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 14, paddingVertical: 16 },

    // Single roster card (replaces the three status sections). Row rendering
    // itself is the shared <RosterRow/> (src/components/RosterRow.tsx).
    rosterCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 14, overflow: 'hidden' },
    rosterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    rosterTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    linkText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },
    emptySection: { color: c.textMuted, fontSize: 13, paddingHorizontal: 16, paddingVertical: 12 },
  });
