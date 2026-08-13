import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import Svg, { Circle, G } from 'react-native-svg';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Employee, AttendanceEvent, WorkLeave } from '@/types';
import { employeesListQuery } from '@/utils/employees';
import { monthName, weekdayName } from '@/i18n/dates';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView } from '@/components/StateViews';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { dayAttendanceQuery, teamLeavesQuery } from '../api/queries';
import { buildAttendanceRoster, type AttendanceStatus } from '../roster';

type StatusGroup = AttendanceStatus;

function sectionColor(key: StatusGroup, c: ThemeColors) {
  if (key === 'present') return c.present;
  if (key === 'late') return c.warning;
  if (key === 'onLeave') return c.primaryLight;
  return c.error;
}

const DonutChart = React.memo(function DonutChart({ total, present, late, onLeave, activeFilter, onFilter, styles, c }: {
  total: number; present: number; late: number; onLeave: number;
  activeFilter: StatusGroup | null; onFilter: (k: StatusGroup | null) => void; styles: any; c: ThemeColors;
}) {
  const { t } = useTranslation();
  const absent = Math.max(0, total - present - late - onLeave);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const R = 68;
  const stroke = 24;
  const circ = 2 * Math.PI * R;
  const rotate = `rotate(-90, ${cx}, ${cy})`;

  const allSegs: { value: number; color: string; key: StatusGroup }[] = [
    { value: present, color: c.present, key: 'present' },
    { value: late, color: c.warning, key: 'late' },
    { value: onLeave, color: c.primaryLight, key: 'onLeave' },
    { value: absent, color: c.error, key: 'absent' },
  ];
  const segments = allSegs.filter((s) => s.value > 0 && total > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, offset };
    offset += dash;
    return arc;
  });

  const legendItems = [
    { key: 'present' as StatusGroup, count: present, color: c.present, label: t('attendance.legend.present') },
    { key: 'late' as StatusGroup, count: late, color: c.warning, label: t('attendance.legend.late') },
    { key: 'absent' as StatusGroup, count: absent, color: c.error, label: t('attendance.legend.absent') },
    { key: 'onLeave' as StatusGroup, count: onLeave, color: c.primaryLight, label: t('attendance.legend.onLeave') },
  ].filter((it) => it.count > 0 || it.key === 'absent');

  const handleFilter = (key: StatusGroup) => onFilter(activeFilter === key ? null : key);

  return (
    <View style={styles.chartOuter}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <G>
            <Circle cx={cx} cy={cy} r={R} fill="none" stroke={c.cardBorder} strokeWidth={stroke} />
            {arcs.map((arc, i) => (
              <Circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={arc.color}
                strokeWidth={activeFilter === null || activeFilter === arc.key ? stroke : stroke * 0.6}
                strokeDasharray={`${arc.dash} ${circ - arc.dash}`} strokeDashoffset={-arc.offset} transform={rotate}
                opacity={activeFilter === null || activeFilter === arc.key ? 1 : 0.3} onPress={() => handleFilter(arc.key)} />
            ))}
          </G>
        </Svg>
        <View style={styles.chartCenter}>
          <Text style={styles.chartTotal}>{activeFilter ? (allSegs.find((s) => s.key === activeFilter)?.value ?? total) : total}</Text>
          {activeFilter && <Text style={styles.chartFilterLabel}>{t('attendance.clearFilter')}</Text>}
        </View>
      </View>
      <View style={styles.legend}>
        {legendItems.map((it) => {
          const isActive = activeFilter === it.key;
          return (
            <TouchableOpacity key={it.key}
              style={[styles.legendItem, isActive && { backgroundColor: it.color + '18', borderRadius: 8, paddingHorizontal: 4 }]}
              onPress={() => handleFilter(it.key)} activeOpacity={0.7}>
              <View style={[styles.legendDot, { backgroundColor: it.color, opacity: !activeFilter || isActive ? 1 : 0.35 }]} />
              <View style={{ opacity: !activeFilter || isActive ? 1 : 0.4 }}>
                <Text style={styles.legendCount}>{it.count}</Text>
                <Text style={styles.legendLabel}>{it.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

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
            <DonutChart total={counts.total} present={counts.present} late={counts.late} onLeave={counts.onLeave}
              activeFilter={sectionFilter} onFilter={setSectionFilter} styles={styles} c={colors} />
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
                <TouchableOpacity key={row.employee.id}
                  style={[styles.empRow, idx < visibleRows.length - 1 && styles.empRowBorder]}
                  onPress={() => router.push({ pathname: '/profile-detail', params: { id: row.employee.id } })} activeOpacity={0.7}>
                  <View style={[styles.statusStripe, { backgroundColor: sectionColor(row.status, colors) }]} />
                  <EmployeeAvatar emp={row.employee} size={48} />
                  <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={1}>{row.employee.legal_name}</Text>
                    <Text style={styles.empPosition} numberOfLines={1}>{row.employee.job_position?.name ?? row.employee.department?.name ?? '—'}</Text>
                  </View>
                  {row.entryTime && (
                    <View style={styles.timeTag}>
                      <Icon name="clock" size={14} color={colors.textMuted} />
                      <Text style={styles.timeTagText}>{dayjs(row.entryTime).format('HH:mm')}</Text>
                    </View>
                  )}
                  {row.leaveName && <Text style={styles.leaveTag} numberOfLines={1}>{row.leaveName}</Text>}
                </TouchableOpacity>
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
    chartOuter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    chartWrapper: { position: 'relative', width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
    chartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    chartTotal: { fontSize: 30, fontWeight: '800', color: c.text },
    chartFilterLabel: { fontSize: 9, color: c.textMuted, marginTop: 2 },
    legend: { flex: 1, paddingLeft: 20, gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendDot: { width: 13, height: 13, borderRadius: 7 },
    legendCount: { fontSize: 20, fontWeight: '700', color: c.text },
    legendLabel: { fontSize: 12, color: c.textSecondary, marginTop: 1 },

    // Single roster card (replaces the three status sections).
    rosterCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 14, overflow: 'hidden' },
    rosterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    rosterTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    linkText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },
    emptySection: { color: c.textMuted, fontSize: 13, paddingHorizontal: 16, paddingVertical: 12 },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    empRowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    // Left status accent for each roster row (green/amber/blue/red).
    statusStripe: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: -2 },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '600', color: c.text },
    empPosition: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    timeTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    timeTagArrow: { fontSize: 11, color: c.textMuted },
    timeTagText: { fontSize: 13, fontWeight: '700', color: c.text },
    leaveTag: { fontSize: 11, color: c.primaryLight, fontWeight: '600', maxWidth: 90, textAlign: 'right' },
  });
