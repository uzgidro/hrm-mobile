import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
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
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { WorkLeave, AttendanceEvent } from '../../src/types';

dayjs.locale('uz');

const DAYS_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

function statusInfo(status: string, c: ThemeColors) {
  if (status === 'approved' || status === 'tasdiqlangan' || status === 'signed') return { label: 'Tasdiqlangan', color: c.success };
  if (status === 'rejected' || status === 'rad_etilgan') return { label: 'Rad etildi', color: c.error };
  return { label: 'Kutilmoqda', color: c.warning };
}

const MODULE_ITEMS = [
  { key: 'attendance', emoji: '🕐', label: 'Davomat' },
  { key: 'requests', emoji: '📋', label: "So'rovlar" },
  { key: 'team', emoji: '👥', label: 'Jamoa' },
  { key: 'salary', emoji: '💳', label: 'Oylik' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isSupervisor = !employee?.supervisor;

  const [refreshing, setRefreshing] = useState(false);

  const now = dayjs();
  const dateStr = `${DAYS_UZ[now.day()]}, ${now.date()} ${MONTHS_UZ[now.month()]} ${now.year()}`;
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const monthEnd = now.endOf('month').format('YYYY-MM-DD');
  const todayStr = now.format('YYYY-MM-DD');

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

  const { data: myLeaves = [], refetch: refetchMyLeaves } = useQuery<WorkLeave[]>({
    queryKey: ['work-leaves-home', employee?.id],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { employee_id: employee!.id, size: 5 } }).then((r) => {
        const d = r.data;
        return (Array.isArray(d) ? d : (d?.items ?? [])).slice(0, 5);
      }),
    enabled: !!employee?.id && !isSupervisor,
    staleTime: 2 * 60 * 1000,
  });

  const { data: assignedLeaves = [], refetch: refetchAssigned } = useQuery<WorkLeave[]>({
    queryKey: ['assigned-leaves-home', employee?.id],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { assigned_signer: true, size: 50 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: !!employee?.id && isSupervisor,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const pendingCount = useMemo(() => {
    if (!isSupervisor) return 0;
    return assignedLeaves.filter(
      (l) => (l.status === 'pending' || l.status === 'yuborildi') && !l.signers?.some((s) => s.id === employee?.id)
    ).length;
  }, [assignedLeaves, isSupervisor, employee?.id]);

  const recentAssigned = useMemo(
    () => [...assignedLeaves].sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))).slice(0, 5),
    [assignedLeaves]
  );

  useEffect(() => {
    const orgBranchId = employee?.organization_branches?.[0]?.id ?? employee?.department?.organization_branch_id;
    const today = dayjs().format('YYYY-MM-DD');
    queryClient.prefetchQuery({ queryKey: employeesQueryKey(orgBranchId), queryFn: () => fetchAllEmployees(orgBranchId), staleTime: 5 * 60 * 1000 });
    queryClient.prefetchQuery({ queryKey: attendanceQueryKey(today, orgBranchId), queryFn: () => fetchAllAttendanceEvents(today, orgBranchId), staleTime: 3 * 60 * 1000 });
    queryClient.prefetchQuery({
      queryKey: ['team-birthdays', orgBranchId],
      queryFn: () => apiClient.get(EMPLOYEES_BIRTHDAYS, { params: orgBranchId ? { organization_branch_id: orgBranchId } : {} }).then((r) => r.data),
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
    await Promise.all([refetchEvents(), isSupervisor ? refetchAssigned() : refetchMyLeaves()]);
    setRefreshing(false);
  }, [refetchEvents, refetchAssigned, refetchMyLeaves, isSupervisor]);

  const sortedToday = [...todayEvents].sort((a, b) => dayjs(a.happen_time).diff(dayjs(b.happen_time)));
  const entry = sortedToday[0];
  const exit = sortedToday.length > 1 ? sortedToday[sortedToday.length - 1] : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Assalomu alaykum 👋</Text>
            <Text style={styles.userName} numberOfLines={1}>{employee?.legal_name || 'Foydalanuvchi'}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/work-leaves')}>
            <Text style={styles.bellEmoji}>🔔</Text>
            {pendingCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Jadval */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <View style={styles.dot} />
              <Text style={styles.cardTitle}>Bugungi jadval</Text>
            </View>
            {employee?.working_hours_start && (
              <Text style={styles.scheduleTime}>{employee.working_hours_start} – {employee.working_hours_end}</Text>
            )}
          </View>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceArrow}>🔽</Text>
              <Text style={styles.attendanceTime}>{entry ? dayjs(entry.happen_time).format('HH:mm') : '--:--'}</Text>
              <Text style={styles.attendanceLbl}>Kelish</Text>
            </View>
            <View style={styles.attendanceDivider} />
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceArrowUp}>🔼</Text>
              <Text style={styles.attendanceTime}>{exit ? dayjs(exit.happen_time).format('HH:mm') : '--:--'}</Text>
              <Text style={styles.attendanceLbl}>Ketish</Text>
            </View>
          </View>
        </View>

        {/* Modullar */}
        <View style={styles.modulesGrid}>
          {MODULE_ITEMS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={styles.moduleBtn}
              activeOpacity={0.75}
              onPress={() => {
                if (m.key === 'team') router.push('/team');
                else if (m.key === 'requests') router.push('/work-leaves');
                else if (m.key === 'attendance') router.push('/attendance-detail');
                else if (m.key === 'salary') router.push('/salary');
              }}
            >
              <Text style={styles.moduleEmoji}>{m.emoji}</Text>
              <Text style={styles.moduleLabel}>{m.label}</Text>
              {m.key === 'requests' && isSupervisor && pendingCount > 0 && (
                <View style={styles.moduleBadge}>
                  <Text style={styles.moduleBadgeText}>{pendingCount > 9 ? '9+' : String(pendingCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* So'rovlar */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>📋</Text>
              <Text style={styles.cardTitle}>{isSupervisor ? "Kiruvchi so'rovlar" : "So'rovlar"}</Text>
              {isSupervisor && pendingCount > 0 && (
                <View style={styles.inlineBadge}><Text style={styles.inlineBadgeText}>{pendingCount}</Text></View>
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
                const needsAction = (leave.status === 'pending' || leave.status === 'yuborildi') && !leave.signers?.some((s) => s.id === employee?.id);
                const st = statusInfo(leave.status, colors);
                return (
                  <TouchableOpacity key={leave.id} style={styles.leaveRow}
                    onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.75}>
                    <View style={styles.leaveInfo}>
                      <Text style={styles.leaveName}>{leave.employee?.legal_name ?? 'Xodim'}</Text>
                      <Text style={styles.leaveDate}>{leave.type || "Ruxsat so'rovi"}</Text>
                      <Text style={styles.leaveDate}>{dayjs(leave.start_date).format('D MMM, HH:mm')} – {dayjs(leave.end_date).format('HH:mm')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                      {needsAction && <Text style={styles.actionHint}>Tasdiqlash kerak</Text>}
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
                const st = statusInfo(leave.status, colors);
                return (
                  <TouchableOpacity key={leave.id} style={styles.leaveRow}
                    onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.75}>
                    <View style={styles.leaveInfo}>
                      <Text style={styles.leaveName}>{leave.type || "Ruxsat so'rovi"}</Text>
                      <Text style={styles.leaveDate}>{dayjs(leave.start_date).format('D MMM YYYY, HH:mm')}-{dayjs(leave.end_date).format('HH:mm')}</Text>
                    </View>
                    <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                  </TouchableOpacity>
                );
              })
            )
          )}

          {!isSupervisor && (
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-leave')} activeOpacity={0.85}>
              <Text style={styles.createBtnText}>So'rov yaratish</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 32 },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 16, marginBottom: 18, gap: 12 },
    hello: { fontSize: 13, color: c.textSecondary },
    userName: { fontSize: 22, fontWeight: '800', color: c.text, marginTop: 2 },
    dateText: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    bellBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    bellEmoji: { fontSize: 20 },
    bellBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: c.warning, borderRadius: 9, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    bellBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    card: { backgroundColor: c.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
    cardIcon: { fontSize: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    scheduleTime: { fontSize: 13, color: c.textSecondary },
    linkText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },
    inlineBadge: { backgroundColor: c.warning, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
    inlineBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    attendanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    attendanceItem: { flex: 1, alignItems: 'center', gap: 4 },
    attendanceArrow: { fontSize: 18 },
    attendanceArrowUp: { fontSize: 18 },
    attendanceTime: { fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: 1 },
    attendanceLbl: { fontSize: 11, color: c.textMuted },
    attendanceDivider: { width: 1, height: 48, backgroundColor: c.cardBorder, marginHorizontal: 16 },

    modulesGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    moduleBtn: { flex: 1, backgroundColor: c.card, borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.cardBorder, position: 'relative' },
    moduleEmoji: { fontSize: 24 },
    moduleLabel: { fontSize: 11, color: c.textSecondary, fontWeight: '600', textAlign: 'center' },
    moduleBadge: { position: 'absolute', top: 6, right: 8, backgroundColor: c.warning, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    moduleBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    emptyText: { color: c.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 14 },

    leaveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    leaveInfo: { flex: 1, gap: 3 },
    leaveName: { fontSize: 14, fontWeight: '600', color: c.text },
    leaveDate: { fontSize: 12, color: c.textSecondary },
    leaveStatus: { fontSize: 12, fontWeight: '700', marginLeft: 8, marginTop: 2 },
    actionHint: { fontSize: 10, color: c.warning, fontWeight: '600' },

    createBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
    createBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
