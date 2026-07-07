import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import Svg, { Circle, G } from 'react-native-svg';
import { apiClient } from '@/api/client';
import { EMPLOYEES_BIRTHDAYS } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Employee, AttendanceEvent, WorkLeave, EmployeeBirthday } from '@/types';
import { canAccessPage } from '@/utils/roles';
import { fetchAllEmployees, employeesQueryKey } from '@/utils/employees';
import { Icon, IconName } from '@/components/Icon';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { dayAttendanceQuery, teamLeavesQuery } from '../api/queries';

// This dashboard composes four domains. Attendance + leaves come from this
// feature's own factories. Employees uses the shared roster util
// (`employeesQueryKey` + `fetchAllEmployees` from `@/utils/employees`) inline —
// same key/cache/staleTime the employees feature's `employeesListQuery` produces,
// so the roster cache stays shared without a cross-feature import (the
// `src/features/README.md` boundary rule forbids importing another feature's
// api/). Birthdays is keyed under the `['birthdays', 'list', orgBranchId]` shape
// the birthdays feature's `birthdayKeys.list` produces, so the BirthdaysScreen
// and this card share one cached feed, again without a cross-feature import.
const birthdaysListKey = (orgBranchId?: number) =>
  ['birthdays', 'list', orgBranchId ?? null] as const;

const DonutChart = React.memo(function DonutChart({ total, present, late, onLeave, c, styles }: {
  total: number; present: number; late: number; onLeave: number; c: ThemeColors; styles: any;
}) {
  const absent = Math.max(0, total - present - late - onLeave);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const R = 62;
  const stroke = 22;
  const circ = 2 * Math.PI * R;
  const rotate = `rotate(-90, ${cx}, ${cy})`;

  const segments = [
    { value: present, color: c.present },
    { value: late, color: c.warning },
    { value: onLeave, color: c.primaryLight },
    { value: absent, color: c.error },
  ].filter((s) => s.value > 0 && total > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <View style={styles.chartWrapper}>
      <Svg width={size} height={size}>
        <G>
          <Circle cx={cx} cy={cy} r={R} fill="none" stroke={c.cardBorder} strokeWidth={stroke} />
          {arcs.map((arc, i) => (
            <Circle
              key={i} cx={cx} cy={cy} r={R}
              fill="none" stroke={arc.color} strokeWidth={stroke}
              strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
              strokeDashoffset={-arc.offset}
              transform={rotate}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.chartCenter}>
        <Text style={styles.chartTotal}>{total}</Text>
      </View>
    </View>
  );
});

// Module-scope (not defined in the render body) so React keeps a stable
// component identity across renders instead of remounting the subtree. Not
// React.memo-wrapped: it always receives fresh `children`, so a memo compare
// would never skip a render — only add cost.
function SectionCard({
  icon, title, rightLabel, onRightPress, loading, children, colors, styles,
}: {
  icon: IconName; title: string; rightLabel?: string; onRightPress?: () => void;
  loading?: boolean; children: React.ReactNode; colors: ThemeColors; styles: any;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Icon name={icon} size={18} color={colors.textSecondary} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {rightLabel && (
          <TouchableOpacity onPress={onRightPress}>
            <Text style={styles.linkText}>{rightLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.sectionLoading}><ActivityIndicator color={colors.primaryLight} size="small" /></View>
      ) : children}
    </View>
  );
}

export default function TeamScreen() {
  const user = useAuthStore((s) => s.user);
  const onlySubordinates = usePrefsStore((s) => s.onlySubordinates);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const myId = user?.employee?.id;
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const today = dayjs().format('YYYY-MM-DD');

  const results = useQueries({
    queries: [
      { queryKey: employeesQueryKey(orgBranchId), queryFn: () => fetchAllEmployees(orgBranchId), staleTime: 5 * 60 * 1000 },
      dayAttendanceQuery(today, orgBranchId),
      teamLeavesQuery(today, 20),
      {
        queryKey: birthdaysListKey(orgBranchId),
        queryFn: () =>
          apiClient.get<EmployeeBirthday[]>(EMPLOYEES_BIRTHDAYS, {
            params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
          }).then((r) => {
            const d = r.data as any;
            return (Array.isArray(d) ? d : (d?.items ?? [])) as EmployeeBirthday[];
          }),
        staleTime: 60 * 60 * 1000,
      },
    ],
  });

  const [empQ, attQ, leavesQ, bDayQ] = results;
  const isRefreshing = results.some((r) => r.isFetching);
  const refetchAll = () => results.forEach((r) => r.refetch());

  const allEmployees: Employee[] = useMemo(() => empQ.data?.items ?? [], [empQ.data]);
  // "Faqat bo'ysunuvchilar" — show only employees whose supervisor is the current user
  const employees: Employee[] = useMemo(
    () => (onlySubordinates && myId ? allEmployees.filter((e) => e.supervisor_id === myId) : allEmployees),
    [allEmployees, onlySubordinates, myId]
  );
  const empTotal: number = onlySubordinates ? employees.length : (empQ.data?.total ?? 0);
  const events: AttendanceEvent[] = useMemo(() => attQ.data?.items ?? [], [attQ.data]);
  const workLeaves: WorkLeave[] = useMemo(() => (leavesQ.data as WorkLeave[]) ?? [], [leavesQ.data]);
  const birthdays: EmployeeBirthday[] = useMemo(() => bDayQ.data ?? [], [bDayQ.data]);

  const empIdSet = useMemo(() => new Set(employees.map((e) => e.id)), [employees]);

  const attendanceStats = useMemo(() => {
    const attendedIds = new Set<number>();
    const lateIds = new Set<number>();
    const firstEntry = new Map<number, string>();

    for (const ev of events) {
      const eid = ev.employee_id;
      if (!eid || !empIdSet.has(eid)) continue;
      const existing = firstEntry.get(eid);
      if (!existing || ev.happen_time < existing) firstEntry.set(eid, ev.happen_time);
      attendedIds.add(eid);
    }

    for (const emp of employees) {
      const entry = firstEntry.get(emp.id);
      if (entry && emp.working_hours_start) {
        const expected = dayjs(`${today}T${emp.working_hours_start}`);
        if (dayjs(entry).diff(expected, 'minute') > 5) lateIds.add(emp.id);
      }
    }

    const todayStart = dayjs(today).startOf('day');
    const todayEnd = dayjs(today).endOf('day');
    const onLeaveIds = new Set<number>(
      workLeaves
        .filter((l) => {
          if (!l.employee?.id || !empIdSet.has(l.employee.id)) return false;
          return dayjs(l.start_date).isBefore(todayEnd) && dayjs(l.end_date).isAfter(todayStart);
        })
        .map((l) => l.employee!.id)
    );

    return {
      present: Math.max(0, attendedIds.size - lateIds.size),
      late: lateIds.size,
      onLeave: onLeaveIds.size,
      total: empTotal,
    };
  }, [events, employees, workLeaves, today, empTotal, empIdSet]);

  const recentLeaves = useMemo(
    () =>
      [...workLeaves]
        .filter((l) => !l.employee?.id || empIdSet.has(l.employee.id))
        .sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)))
        .slice(0, 3),
    [workLeaves, empIdSet]
  );
  const topEmployees = useMemo(() => employees.slice(0, 3), [employees]);
  const upcomingBirthdays = useMemo(() => birthdays.slice(0, 3), [birthdays]);

  const STATUS_MAP: Record<string, { label: string; color: string }> = useMemo(
    () => ({
      pending: { label: 'Kutilmoqda', color: colors.warning },
      yuborildi: { label: 'Kutilmoqda', color: colors.warning },
      approved: { label: 'Tasdiqlangan', color: colors.present },
      tasdiqlangan: { label: 'Tasdiqlangan', color: colors.present },
      signed: { label: 'Tasdiqlangan', color: colors.present },
      rejected: { label: 'Rad etildi', color: colors.error },
      rad_etilgan: { label: 'Rad etildi', color: colors.error },
    }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xodimlar</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={colors.primaryLight} />}
      >
        {onlySubordinates && (
          <View style={styles.filterNotice}>
            <Icon name="users" size={16} color={colors.primaryLight} />
            <Text style={styles.filterNoticeText}>Faqat bo'ysunuvchilar ko'rsatilmoqda</Text>
          </View>
        )}

        <SectionCard icon="chart" title="Davomat" loading={empQ.isLoading || attQ.isLoading} colors={colors} styles={styles}>
          <View style={styles.chartRow}>
            <DonutChart c={colors} styles={styles}
              total={attendanceStats.total} present={attendanceStats.present}
              late={attendanceStats.late} onLeave={attendanceStats.onLeave} />
            <View style={styles.legend}>
              {attendanceStats.late > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <View><Text style={styles.legendCount}>{attendanceStats.late}</Text><Text style={styles.legendLabel}>kechikkan</Text></View>
                </View>
              )}
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <View>
                  <Text style={styles.legendCount}>
                    {Math.max(0, attendanceStats.total - attendanceStats.present - attendanceStats.late - attendanceStats.onLeave)}
                  </Text>
                  <Text style={styles.legendLabel}>kelmagan</Text>
                </View>
              </View>
              {attendanceStats.onLeave > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primaryLight }]} />
                  <View><Text style={styles.legendCount}>{attendanceStats.onLeave}</Text><Text style={styles.legendLabel}>so'rovda</Text></View>
                </View>
              )}
              {attendanceStats.present > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.present }]} />
                  <View><Text style={styles.legendCount}>{attendanceStats.present}</Text><Text style={styles.legendLabel}>keldi</Text></View>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/attendance-detail')}>
            <Text style={styles.primaryBtnText}>Tafsilotlar</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard icon="checklist" title="So'rovlar" rightLabel="Barchasi" onRightPress={() => router.push('/team-leaves')} loading={leavesQ.isLoading} colors={colors} styles={styles}>
          {recentLeaves.length === 0 ? (
            <Text style={styles.emptyText}>So'rovlar yo'q</Text>
          ) : (
            recentLeaves.map((leave) => {
              const st = STATUS_MAP[leave.status] ?? STATUS_MAP.pending;
              return (
                <TouchableOpacity key={leave.id} style={styles.leaveRow}
                  onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.7}>
                  <EmployeeAvatar emp={(leave.employee as Employee) || { id: 0, legal_name: '?' }} size={48} />
                  <View style={styles.leaveInfo}>
                    <Text style={styles.leaveCat} numberOfLines={1}>{leave.type ?? "So'rov"}</Text>
                    <Text style={styles.leaveDate}>
                      {dayjs(leave.start_date).format('D MMM YYYY, HH:mm')} – {dayjs(leave.end_date).format('HH:mm')}
                    </Text>
                    <Text style={styles.leaveEmployee} numberOfLines={1}>{leave.employee?.legal_name ?? '—'}</Text>
                  </View>
                  <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                </TouchableOpacity>
              );
            })
          )}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/create-leave')}>
            <Text style={styles.primaryBtnText}>So'rov yaratish</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard icon="users" title="Xodimlar" rightLabel={canAccessPage(user, 'employees') ? 'Barchasi' : undefined} onRightPress={() => router.push('/employees-list')} loading={empQ.isLoading} colors={colors} styles={styles}>
          {topEmployees.length === 0 ? (
            <Text style={styles.emptyText}>Xodimlar yo'q</Text>
          ) : (
            topEmployees.map((emp, idx) => (
              <TouchableOpacity key={emp.id}
                style={[styles.empRow, idx < topEmployees.length - 1 && styles.empRowBorder]}
                onPress={() => router.push({ pathname: '/profile-detail', params: { id: emp.id } })} activeOpacity={0.7}>
                <EmployeeAvatar emp={emp} size={48} />
                <View style={styles.empInfo}>
                  <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                  <Text style={styles.empPosition} numberOfLines={1}>{emp.job_position?.name ?? emp.department?.name ?? '—'}</Text>
                </View>
                <Icon name="chevronRight" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </SectionCard>

        {(bDayQ.isLoading || upcomingBirthdays.length > 0) && (
          <SectionCard icon="cake" title="Tug'ilgan kunlar" rightLabel="Barchasi" onRightPress={() => router.push('/birthdays')} loading={bDayQ.isLoading} colors={colors} styles={styles}>
            {upcomingBirthdays.map((emp, idx) => (
              <View key={emp.id} style={[styles.empRow, idx < upcomingBirthdays.length - 1 && styles.empRowBorder]}>
                <EmployeeAvatar emp={emp} size={48} />
                <View style={styles.empInfo}>
                  <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                  <Text style={styles.empPosition} numberOfLines={1}>{emp.job_position?.name ?? '—'}</Text>
                </View>
                <View style={styles.bdayRight}>
                  <Text style={styles.bdayDate}>{emp.birth_date ? dayjs(emp.birth_date).format('D MMM') : '—'}</Text>
                  {emp.days_left === 0 && (
                    <View style={styles.bdayTodayRow}>
                      <Text style={styles.bdayToday}>Bugun!</Text>
                      <Icon name="gift" size={14} color={colors.warning} />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', marginRight: 4 },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text },

    content: { paddingHorizontal: 16, paddingTop: 16 },

    filterNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
    filterNoticeText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },

    card: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 14, overflow: 'hidden' },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardIcon: { fontSize: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    linkText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },
    sectionLoading: { paddingVertical: 32, alignItems: 'center' },

    chartRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    chartWrapper: { position: 'relative', width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
    chartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    chartTotal: { fontSize: 28, fontWeight: '800', color: c.text },
    legend: { flex: 1, paddingLeft: 20, gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendDot: { width: 12, height: 12, borderRadius: 6 },
    legendCount: { fontSize: 18, fontWeight: '700', color: c.text },
    legendLabel: { fontSize: 11, color: c.textSecondary, marginTop: 1 },

    primaryBtn: { margin: 16, marginTop: 8, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },

    leaveRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    leaveInfo: { flex: 1 },
    leaveCat: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 2 },
    leaveDate: { fontSize: 12, color: c.textSecondary, marginBottom: 2 },
    leaveEmployee: { fontSize: 12, color: c.textMuted },
    leaveStatus: { fontSize: 12, fontWeight: '700' },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    empRowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '700', color: c.text },
    empPosition: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    arrowIcon: { fontSize: 22, color: c.textMuted },

    bdayRight: { alignItems: 'flex-end' },
    bdayDate: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    bdayTodayRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    bdayToday: { fontSize: 11, color: c.warning },

    emptyText: { color: c.textMuted, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12 },
  });
