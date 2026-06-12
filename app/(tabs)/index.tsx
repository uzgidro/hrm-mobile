import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/uz';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { WORK_LEAVES, EMPLOYEES_BIRTHDAYS, TURNSTILE_ATTENDANCE_EVENTS } from '../../src/api/urls';
import { fetchAllAttendanceEvents, attendanceQueryKey } from '../../src/utils/attendance';
import { fetchAllEmployees, employeesQueryKey } from '../../src/utils/employees';
import { COLORS } from '../../src/constants';
import { WorkLeave, AttendanceEvent } from '../../src/types';

dayjs.locale('uz');

const DAYS_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Kutilmoqda',   color: '#F59E0B' },
  yuborildi:    { label: 'Kutilmoqda',   color: '#F59E0B' },
  approved:     { label: 'Tasdiqlangan', color: '#22C55E' },
  tasdiqlangan: { label: 'Tasdiqlangan', color: '#22C55E' },
  signed:       { label: 'Tasdiqlangan', color: '#22C55E' },
  rejected:     { label: 'Rad etildi',   color: '#EF4444' },
  rad_etilgan:  { label: 'Rad etildi',   color: '#EF4444' },
};

const MODULE_ITEMS = [
  { key: 'attendance', emoji: '🕐', label: 'Davomat' },
  { key: 'requests',   emoji: '📋', label: "So'rovlar" },
  { key: 'team',       emoji: '👥', label: 'Jamoa' },
  { key: 'salary',     emoji: '💳', label: 'Oylik' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const queryClient = useQueryClient();
  const isSupervisor = !employee?.supervisor;

  const [refreshing, setRefreshing] = useState(false);

  const now = dayjs();
  const dateStr = `${DAYS_UZ[now.day()]} - ${now.date()} ${MONTHS_UZ[now.month()]} ${now.year()}`;
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const monthEnd = now.endOf('month').format('YYYY-MM-DD');
  const todayStr = now.format('YYYY-MM-DD');

  // Attendance events for this month
  const { data: monthEvents = [], refetch: refetchEvents } = useQuery<AttendanceEvent[]>({
    queryKey: ['attendance', employee?.id, now.format('YYYY-MM')],
    queryFn: () =>
      apiClient.get(TURNSTILE_ATTENDANCE_EVENTS, {
        params: { date_from: monthStart, date_to: monthEnd, employee_id: employee!.id },
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: !!employee?.id,
    staleTime: 2 * 60 * 1000,
  });

  // My own recent leaves (regular employee)
  const { data: myLeaves = [], refetch: refetchMyLeaves } = useQuery<WorkLeave[]>({
    queryKey: ['work-leaves-home', employee?.id],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { employee_id: employee!.id, size: 5 } })
        .then((r) => {
          const d = r.data;
          return (Array.isArray(d) ? d : (d?.items ?? [])).slice(0, 5);
        }),
    enabled: !!employee?.id && !isSupervisor,
    staleTime: 2 * 60 * 1000,
  });

  // Incoming assigned leaves (supervisor) — polls every 60 sec for real-time feel
  const { data: assignedLeaves = [], refetch: refetchAssigned } = useQuery<WorkLeave[]>({
    queryKey: ['assigned-leaves-home', employee?.id],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { assigned_signer: true, size: 50 } })
        .then((r) => {
          const d = r.data;
          return Array.isArray(d) ? d : (d?.items ?? []);
        }),
    enabled: !!employee?.id && isSupervisor,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Pending count for badge (supervisor)
  const pendingCount = useMemo(() => {
    if (!isSupervisor) return 0;
    return assignedLeaves.filter(
      (l) =>
        (l.status === 'pending' || l.status === 'yuborildi') &&
        !l.signers?.some((s) => s.id === employee?.id)
    ).length;
  }, [assignedLeaves, isSupervisor, employee?.id]);

  // Recent incoming leaves for dashboard card (supervisor)
  const recentAssigned = useMemo(() =>
    [...assignedLeaves]
      .sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)))
      .slice(0, 5),
    [assignedLeaves]
  );

  // Prefetch team data
  useEffect(() => {
    const orgBranchId =
      employee?.organization_branches?.[0]?.id ??
      employee?.department?.organization_branch_id;
    const today = dayjs().format('YYYY-MM-DD');
    queryClient.prefetchQuery({
      queryKey: employeesQueryKey(orgBranchId),
      queryFn: () => fetchAllEmployees(orgBranchId),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: attendanceQueryKey(today, orgBranchId),
      queryFn: () => fetchAllAttendanceEvents(today, orgBranchId),
      staleTime: 3 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['team-birthdays', orgBranchId],
      queryFn: () =>
        apiClient.get(EMPLOYEES_BIRTHDAYS, {
          params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
        }).then((r) => r.data),
      staleTime: 60 * 60 * 1000,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  const todayEvents = useMemo<AttendanceEvent[]>(
    () => monthEvents.filter((e) => dayjs(e.happen_time).format('YYYY-MM-DD') === todayStr),
    [monthEvents, todayStr]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchEvents(),
      isSupervisor ? refetchAssigned() : refetchMyLeaves(),
    ]);
    setRefreshing(false);
  }, [refetchEvents, refetchAssigned, refetchMyLeaves, isSupervisor]);

  const sortedToday = [...todayEvents].sort((a, b) =>
    dayjs(a.happen_time).diff(dayjs(b.happen_time))
  );
  const entry = sortedToday[0];
  const exit = sortedToday.length > 1 ? sortedToday[sortedToday.length - 1] : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Asosiy</Text>
            <Text style={styles.headerDate}>{dateStr}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            {pendingCount > 0 ? (
              <View style={styles.bellBadgeWrap}>
                <Text style={styles.bellEmoji}>🔔</Text>
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.bellEmoji}>🔔</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Jadval card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <View style={styles.dot} />
              <Text style={styles.cardTitle}>Jadval</Text>
            </View>
            {employee?.working_hours_start && (
              <Text style={styles.scheduleTime}>
                {employee.working_hours_start} - {employee.working_hours_end}
              </Text>
            )}
          </View>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceArrow}>🔽</Text>
              <Text style={styles.attendanceTime}>
                {entry ? dayjs(entry.happen_time).format('HH:mm') : '--:--'}
              </Text>
            </View>
            <View style={styles.attendanceDivider} />
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceArrowUp}>🔼</Text>
              <Text style={styles.attendanceTime}>
                {exit ? dayjs(exit.happen_time).format('HH:mm') : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Qaydnoma card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>🎯</Text>
              <Text style={styles.cardTitle}>Qaydnoma</Text>
            </View>
          </View>
          {todayEvents.length === 0 ? (
            <Text style={styles.emptyText}>Ro'yxat bo'sh</Text>
          ) : (
            todayEvents.slice(0, 3).map((ev) => (
              <View key={ev.id} style={styles.eventRow}>
                <Text style={styles.eventTime}>{dayjs(ev.happen_time).format('HH:mm')}</Text>
                <Text style={styles.eventDir}>
                  {ev.direction_type === 'exit' ? '⬅️ Chiqish' : '➡️ Kirish'}
                </Text>
                <Text style={styles.eventTurnstile}>{ev.turnstile?.acs_dev_name || ''}</Text>
              </View>
            ))
          )}
        </View>

        {/* Modullar */}
        <View style={styles.modulesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Modullar</Text>
          </View>
          <View style={styles.modulesGrid}>
            {MODULE_ITEMS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={styles.moduleBtn}
                activeOpacity={0.75}
                onPress={() => {
                  if (m.key === 'team')       router.push('/team');
                  else if (m.key === 'requests') router.push('/work-leaves');
                  else if (m.key === 'attendance') router.push('/attendance-detail');
                  else if (m.key === 'salary') router.push('/salary');
                }}
              >
                <Text style={styles.moduleEmoji}>{m.emoji}</Text>
                <Text style={styles.moduleLabel}>{m.label}</Text>
                {/* Badge for supervisors on "So'rovlar" */}
                {m.key === 'requests' && isSupervisor && pendingCount > 0 && (
                  <View style={styles.moduleBadge}>
                    <Text style={styles.moduleBadgeText}>
                      {pendingCount > 9 ? '9+' : String(pendingCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* So'rovlar card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>📋</Text>
              <Text style={styles.cardTitle}>
                {isSupervisor ? "Kiruvchi so'rovlar" : "So'rovlar"}
              </Text>
              {isSupervisor && pendingCount > 0 && (
                <View style={styles.inlineCountBadge}>
                  <Text style={styles.inlineCountText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/work-leaves')}>
              <Text style={styles.linkText}>Barchasi</Text>
            </TouchableOpacity>
          </View>

          {isSupervisor ? (
            recentAssigned.length === 0 ? (
              <Text style={styles.emptyText}>Kiruvchi so'rovlar yo'q</Text>
            ) : (
              recentAssigned.map((leave) => {
                const needsAction =
                  (leave.status === 'pending' || leave.status === 'yuborildi') &&
                  !leave.signers?.some((s) => s.id === employee?.id);
                const st = STATUS_MAP[leave.status] ?? STATUS_MAP.pending;
                return (
                  <TouchableOpacity
                    key={leave.id}
                    style={[styles.leaveRow, needsAction && styles.leaveRowHighlight]}
                    onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.leaveInfo}>
                      <Text style={styles.leaveName}>
                        {leave.employee?.legal_name ?? 'Xodim'}
                      </Text>
                      <Text style={styles.leaveDate}>
                        {leave.type || "Ruxsat so'rovi"}
                      </Text>
                      <Text style={styles.leaveDate}>
                        {dayjs(leave.start_date).format('D MMM, HH:mm')} –{' '}
                        {dayjs(leave.end_date).format('HH:mm')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                      {needsAction && (
                        <Text style={styles.actionHint}>Tasdiqlash kerak</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          ) : (
            myLeaves.length === 0 ? (
              <Text style={styles.emptyText}>So'rovlar yo'q</Text>
            ) : (
              myLeaves.map((leave) => {
                const st = STATUS_MAP[leave.status] || STATUS_MAP.pending;
                return (
                  <TouchableOpacity
                    key={leave.id}
                    style={styles.leaveRow}
                    onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.leaveInfo}>
                      <Text style={styles.leaveName}>
                        {leave.type || "Ruxsat so'rovi"}
                      </Text>
                      <Text style={styles.leaveDate}>
                        {dayjs(leave.start_date).format('D MMM. YYYY, HH:mm')}-
                        {dayjs(leave.end_date).format('HH:mm')}
                      </Text>
                    </View>
                    <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                  </TouchableOpacity>
                );
              })
            )
          )}

          {!isSupervisor && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/create-leave')}
              activeOpacity={0.85}
            >
              <Text style={styles.createBtnText}>So'rov yaratish</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  headerDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeWrap: { position: 'relative' },
  bellEmoji: { fontSize: 20 },
  bellBadge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: COLORS.warning,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  scheduleTime: { fontSize: 13, color: COLORS.textSecondary },
  linkText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },

  inlineCountBadge: {
    backgroundColor: COLORS.warning, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  inlineCountText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  attendanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  attendanceItem: { flex: 1, alignItems: 'center', gap: 8 },
  attendanceArrow: { fontSize: 20 },
  attendanceArrowUp: { fontSize: 20 },
  attendanceTime: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: 1 },
  attendanceDivider: { width: 1, height: 40, backgroundColor: COLORS.cardBorder, marginHorizontal: 16 },

  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 14 },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  eventTime: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 44 },
  eventDir: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  eventTurnstile: { fontSize: 12, color: COLORS.textMuted },

  modulesSection: { marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modulesGrid: { flexDirection: 'row', gap: 10 },
  moduleBtn: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
    position: 'relative',
  },
  moduleEmoji: { fontSize: 24 },
  moduleLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  moduleBadge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: COLORS.warning, borderRadius: 9,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  moduleBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  leaveRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  leaveRowHighlight: { backgroundColor: COLORS.warning + '08' },
  leaveInfo: { flex: 1, gap: 3 },
  leaveName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  leaveDate: { fontSize: 12, color: COLORS.textSecondary },
  leaveStatus: { fontSize: 12, fontWeight: '700', marginLeft: 8, marginTop: 2 },
  actionHint: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },

  createBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 14,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
