import { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import Svg, { Circle, G } from 'react-native-svg';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import {
  EMPLOYEES_LIST, EMPLOYEES_BIRTHDAYS,
  TURNSTILE_ATTENDANCE_EVENTS, WORK_LEAVES,
} from '../src/api/urls';
import { COLORS } from '../src/constants';
import { Employee, AttendanceEvent, WorkLeave, EmployeeBirthday } from '../src/types';

interface EmployeePage { items: Employee[]; total: number }
interface AttendancePage { items: AttendanceEvent[]; total: number }
interface WorkLeavePage { items: WorkLeave[]; total: number }

async function fetchAllAttendanceEvents(today: string): Promise<AttendancePage> {
  const firstRes = await apiClient.get<AttendancePage>(TURNSTILE_ATTENDANCE_EVENTS, {
    params: { date_from: today, date_to: today, size: 100, page: 1 },
  });
  const first = firstRes.data;
  if (first.total <= 100) return first;

  const totalPages = Math.ceil(first.total / 100);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      apiClient.get<AttendancePage>(TURNSTILE_ATTENDANCE_EVENTS, {
        params: { date_from: today, date_to: today, size: 100, page: i + 2 },
      }).then((r) => r.data.items)
    )
  );
  const all = [...first.items, ...rest.flat()];
  return { items: all, total: all.length };
}

function EmployeeAvatar({ emp, size = 44 }: { emp: Employee | EmployeeBirthday; size?: number }) {
  const r = size / 2;
  if (emp.photo_path) {
    return <Image source={{ uri: emp.photo_path }} style={{ width: size, height: size, borderRadius: r }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: COLORS.primary + '33', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: COLORS.primaryLight }}>
        {(emp.legal_name || 'X').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function SectionCard({
  icon, title, rightLabel, onRightPress, loading, children,
}: {
  icon: string; title: string; rightLabel?: string; onRightPress?: () => void;
  loading?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {rightLabel && (
          <TouchableOpacity onPress={onRightPress}>
            <Text style={styles.linkText}>{rightLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.sectionLoading}>
          <ActivityIndicator color={COLORS.primaryLight} size="small" />
        </View>
      ) : children}
    </View>
  );
}

function DonutChart({ total, present, late, onLeave }: { total: number; present: number; late: number; onLeave: number }) {
  const absent = Math.max(0, total - present - late - onLeave);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const R = 62;
  const stroke = 22;
  const circ = 2 * Math.PI * R;
  const rotate = `rotate(-90, ${cx}, ${cy})`;

  const segments = [
    { value: present, color: COLORS.present },
    { value: late, color: COLORS.warning },
    { value: onLeave, color: COLORS.primaryLight },
    { value: absent, color: '#E5536A' },
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
          <Circle cx={cx} cy={cy} r={R} fill="none" stroke={COLORS.cardBorder} strokeWidth={stroke} />
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
}

export default function TeamScreen() {
  const { user } = useAuthStore();
  const orgBranchId = user?.employee?.organization_branches?.[0]?.id;
  const today = dayjs().format('YYYY-MM-DD');

  const results = useQueries({
    queries: [
      {
        queryKey: ['team-employees', orgBranchId],
        queryFn: () =>
          apiClient.get<EmployeePage>(EMPLOYEES_LIST, {
            params: { organization_branch_id: orgBranchId, size: 50, page: 1 },
          }).then((r) => r.data),
        enabled: !!orgBranchId,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['team-attendance', today],
        queryFn: () => fetchAllAttendanceEvents(today),
        enabled: !!orgBranchId,
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['team-leaves', today],
        queryFn: () =>
          apiClient.get<WorkLeavePage | WorkLeave[]>(WORK_LEAVES, {
            params: { size: 20 },
          }).then((r) => {
            const d = r.data as any;
            return Array.isArray(d) ? d : (d.items ?? []) as WorkLeave[];
          }),
        enabled: !!orgBranchId,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['team-birthdays', orgBranchId],
        queryFn: () =>
          apiClient.get<EmployeeBirthday[]>(EMPLOYEES_BIRTHDAYS, {
            params: { organization_branch_id: orgBranchId },
          }).then((r) => r.data),
        enabled: !!orgBranchId,
        staleTime: 60 * 60 * 1000,
      },
    ],
  });

  const [empQ, attQ, leavesQ, bDayQ] = results;
  const isRefreshing = results.some((r) => r.isFetching);
  const refetchAll = () => results.forEach((r) => r.refetch());

  const employees: Employee[] = empQ.data?.items ?? [];
  const empTotal: number = empQ.data?.total ?? 0;
  const events: AttendanceEvent[] = attQ.data?.items ?? [];
  const workLeaves: WorkLeave[] = (leavesQ.data as WorkLeave[]) ?? [];
  const birthdays: EmployeeBirthday[] = bDayQ.data ?? [];

  const attendanceStats = useMemo(() => {
    const empIdSet = new Set(employees.map((e) => e.id));
    const attendedIds = new Set<number>();
    const lateIds = new Set<number>();
    const firstEntry = new Map<number, string>();

    for (const ev of events) {
      const eid = ev.employee?.id ?? ev.employee_id;
      if (!eid || !empIdSet.has(eid)) continue;
      if (ev.direction_type === 'entrance') {
        const existing = firstEntry.get(eid);
        if (!existing || ev.happen_time < existing) firstEntry.set(eid, ev.happen_time);
        attendedIds.add(eid);
      }
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
          if (!l.employee?.id) return false;
          return dayjs(l.start_time).isBefore(todayEnd) && dayjs(l.end_time).isAfter(todayStart);
        })
        .map((l) => l.employee!.id)
    );

    return {
      present: Math.max(0, attendedIds.size - lateIds.size),
      late: lateIds.size,
      onLeave: onLeaveIds.size,
      total: empTotal,
    };
  }, [events, employees, workLeaves, today, empTotal]);

  const recentLeaves = workLeaves.slice(0, 3);
  const topEmployees = employees.slice(0, 3);
  const upcomingBirthdays = birthdays.slice(0, 3);

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Kutilmoqda', color: COLORS.warning },
    approved: { label: 'Tasdiqlangan', color: COLORS.present },
    rejected: { label: 'Rad etildi', color: COLORS.error },
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xodimlar</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={COLORS.primaryLight} />
        }
      >
        {/* Davomat card */}
        <SectionCard icon="📊" title="Davomat" loading={empQ.isPending || attQ.isPending}>
          <View style={styles.chartRow}>
            <DonutChart
              total={attendanceStats.total}
              present={attendanceStats.present}
              late={attendanceStats.late}
              onLeave={attendanceStats.onLeave}
            />
            <View style={styles.legend}>
              {attendanceStats.late > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                  <View>
                    <Text style={styles.legendCount}>{attendanceStats.late}</Text>
                    <Text style={styles.legendLabel}>kechikkan</Text>
                  </View>
                </View>
              )}
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E5536A' }]} />
                <View>
                  <Text style={styles.legendCount}>
                    {Math.max(0, attendanceStats.total - attendanceStats.present - attendanceStats.late - attendanceStats.onLeave)}
                  </Text>
                  <Text style={styles.legendLabel}>kelmagan</Text>
                </View>
              </View>
              {attendanceStats.onLeave > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primaryLight }]} />
                  <View>
                    <Text style={styles.legendCount}>{attendanceStats.onLeave}</Text>
                    <Text style={styles.legendLabel}>so'rov yuborilgan</Text>
                  </View>
                </View>
              )}
              {attendanceStats.present > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.present }]} />
                  <View>
                    <Text style={styles.legendCount}>{attendanceStats.present}</Text>
                    <Text style={styles.legendLabel}>keldi</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/attendance-detail')}>
            <Text style={styles.primaryBtnText}>Tafsilotlar</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* So'rovlar card */}
        <SectionCard icon="📋" title="So'rovlar" rightLabel="Barchasi" loading={leavesQ.isPending}>
          {recentLeaves.length === 0 ? (
            <Text style={styles.emptyText}>So'rovlar yo'q</Text>
          ) : (
            recentLeaves.map((leave) => {
              const st = STATUS_MAP[leave.status] ?? STATUS_MAP.pending;
              return (
                <View key={leave.id} style={styles.leaveRow}>
                  <EmployeeAvatar emp={(leave.employee as Employee) || { id: 0, legal_name: '?' }} size={48} />
                  <View style={styles.leaveInfo}>
                    <Text style={styles.leaveCat} numberOfLines={1}>
                      {leave.category?.name ?? "So'rov"}
                    </Text>
                    <Text style={styles.leaveDate}>
                      {dayjs(leave.start_time).format('D MMM YYYY, HH:mm')} –{' '}
                      {dayjs(leave.end_time).format('HH:mm')}
                    </Text>
                    <Text style={styles.leaveEmployee} numberOfLines={1}>
                      {leave.employee?.legal_name ?? '—'}
                    </Text>
                  </View>
                  <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                </View>
              );
            })
          )}
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/create-leave')}>
            <Text style={styles.primaryBtnText}>So'rov yaratish</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Xodimlar card */}
        <SectionCard icon="👥" title="Xodimlar" rightLabel="Barchasi" loading={empQ.isPending}>
          {topEmployees.length === 0 ? (
            <Text style={styles.emptyText}>Xodimlar yo'q</Text>
          ) : (
            topEmployees.map((emp, idx) => (
              <TouchableOpacity
                key={emp.id}
                style={[styles.empRow, idx < topEmployees.length - 1 && styles.empRowBorder]}
                onPress={() => router.push({ pathname: '/profile-detail', params: { id: emp.id } })}
                activeOpacity={0.7}
              >
                <EmployeeAvatar emp={emp} size={48} />
                <View style={styles.empInfo}>
                  <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                  <Text style={styles.empPosition} numberOfLines={1}>
                    {emp.job_position?.name ?? emp.department?.name ?? '—'}
                  </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </SectionCard>

        {/* Tug'ilgan kunlar card */}
        {(bDayQ.isPending || upcomingBirthdays.length > 0) && (
          <SectionCard icon="🎂" title="Tug'ilgan kunlar" rightLabel="Barchasi" loading={bDayQ.isPending}>
            {upcomingBirthdays.map((emp, idx) => (
              <View
                key={emp.id}
                style={[styles.empRow, idx < upcomingBirthdays.length - 1 && styles.empRowBorder]}
              >
                <EmployeeAvatar emp={emp} size={48} />
                <View style={styles.empInfo}>
                  <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                  <Text style={styles.empPosition} numberOfLines={1}>
                    {emp.job_position?.name ?? '—'}
                  </Text>
                </View>
                <View style={styles.bdayRight}>
                  <Text style={styles.bdayDate}>
                    {emp.birth_date ? dayjs(emp.birth_date).format('D MMM') : '—'}
                  </Text>
                  {emp.days_left === 0 && (
                    <Text style={styles.bdayToday}>Bugun! 🎉</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', marginRight: 4 },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text },

  content: { paddingHorizontal: 16, paddingTop: 16 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 14, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  linkText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },
  sectionLoading: { paddingVertical: 32, alignItems: 'center' },

  chartRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  chartWrapper: { position: 'relative', width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  chartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  chartTotal: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  legend: { flex: 1, paddingLeft: 20, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendCount: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  legendLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  primaryBtn: {
    margin: 16, marginTop: 8, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  leaveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  leaveInfo: { flex: 1 },
  leaveCat: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  leaveDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  leaveEmployee: { fontSize: 12, color: COLORS.textMuted },
  leaveStatus: { fontSize: 12, fontWeight: '700' },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  empRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  empPosition: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  arrowIcon: { fontSize: 22, color: COLORS.textMuted },

  bdayRight: { alignItems: 'flex-end' },
  bdayDate: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  bdayToday: { fontSize: 11, color: COLORS.warning, marginTop: 2 },

  emptyText: { color: COLORS.textMuted, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12 },
});
