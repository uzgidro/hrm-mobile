import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image,
} from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { canAccessPage, hasSupervisor } from '@/utils/roles';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { monthName, weekdayName } from '@/i18n/dates';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { AttendanceDonut } from '@/components/AttendanceDonut';
import { RosterRow } from '@/components/RosterRow';
import { useBreakpoint } from '@/utils/responsive';
import { notificationMeta } from '@/services/notifications';
import { AttendanceEvent, Employee, WorkLeave } from '@/types';
import { leaveStatusGroup, leaveStatusKind } from '@/utils/leaveStatus';
import { statusColor } from '@/utils/orderStatus';
import { employeesListQuery } from '@/utils/employees';
import { buildAttendanceRoster, type AttendanceStatus } from '@/utils/attendanceRoster';
import { latenessExcusedQuery } from '@/utils/attendance';
import {
  homeAttendanceQuery,
  homeMyLeavesQuery,
  homeAssignedLeavesQuery,
  homeNotificationsQuery,
  homeTodayAttendanceQuery,
  homeTeamLeavesQuery,
  prefetchHomeData,
} from '../api/queries';

// Fixed height for the roster block so the home page itself doesn't grow
// unbounded — the list scrolls internally instead. ~4.5 rows on a phone.
const ROSTER_MAX_HEIGHT = 280;

function statusInfo(status: string, c: ThemeColors, t: TFunction) {
  const group = leaveStatusGroup(status);
  const { fg } = statusColor(leaveStatusKind(status), c);
  if (group === 'approved') return { label: t('dashboard.status.approved'), color: fg };
  if (group === 'rejected') return { label: t('dashboard.status.rejected'), color: fg };
  return { label: t('dashboard.status.pending'), color: fg };
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const employee = user?.employee;
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const isSupervisor = !hasSupervisor(user);
  const canSeeNotificationsTile = canAccessPage(user, 'notifications');
  const canSeeAttendanceContent = canAccessPage(user, 'attendance');
  const onlySubordinates = usePrefsStore((s) => s.onlySubordinates);
  const myId = employee?.id;
  const orgBranchId = employee?.organization_branches?.[0]?.id ?? employee?.department?.organization_branch_id;

  const [refreshing, setRefreshing] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<AttendanceStatus | null>(null);

  const now = dayjs();
  const dateStr = `${weekdayName(now.day())}, ${now.date()} ${monthName(now.month())}`;
  const initials = (employee?.legal_name || 'F U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const monthEnd = now.endOf('month').format('YYYY-MM-DD');
  const todayStr = now.format('YYYY-MM-DD');

  const { data: monthEvents = [], refetch: refetchEvents } = useQuery(
    homeAttendanceQuery(employee?.id, now.format('YYYY-MM'), monthStart, monthEnd),
  );

  const { data: myLeaves = [], refetch: refetchMyLeaves } = useQuery({
    ...homeMyLeavesQuery(employee?.id),
    enabled: !!employee?.id && !isSupervisor,
  });

  const { data: assignedLeaves = [], refetch: refetchAssigned } = useQuery({
    ...homeAssignedLeavesQuery(employee?.id),
    enabled: !!employee?.id && isSupervisor,
  });

  const { data: notifications = [] } = useQuery(homeNotificationsQuery(employee?.id));

  // Attendance content block (donut + roster) — reuses the SAME queries
  // `prefetchHomeData` below already warms (employeesListQuery,
  // attendanceQueryKey for today) plus a leaves query keyed identically to
  // the attendance feature's teamLeavesQuery, so this never double-fetches:
  // it's the same cache entries TanStack Query already has (or is about to
  // populate) for Team / Attendance-detail. Gated by the same role check as
  // the tile it replaces, and skipped entirely off that role.
  const rosterQueries = useMemo(
    () => [
      { ...employeesListQuery(orgBranchId), enabled: canSeeAttendanceContent },
      { ...homeTodayAttendanceQuery(todayStr, orgBranchId), enabled: canSeeAttendanceContent },
      { ...homeTeamLeavesQuery(todayStr, 100, orgBranchId), enabled: canSeeAttendanceContent },
      // Kechikish uzri (ta'til/buyruq/safar xati) — backend ro'yxati; usiz
      // uzri bor xodim "kechikdi" bo'lib chiqardi.
      { ...latenessExcusedQuery(todayStr, orgBranchId), enabled: canSeeAttendanceContent },
    ],
    [orgBranchId, todayStr, canSeeAttendanceContent]
  );
  const rosterResults = useQueries({ queries: rosterQueries });
  const [rosterEmpQ, rosterAttQ, rosterLeavesQ, rosterExcusedQ] = rosterResults;
  const isRosterLoading = canSeeAttendanceContent && rosterResults.some((r) => r.isLoading);

  const { rows: rosterRows, counts: rosterCounts } = useMemo(() => {
    let employees: Employee[] = (rosterEmpQ.data as { items: Employee[] } | undefined)?.items ?? [];
    if (onlySubordinates && myId) employees = employees.filter((e) => e.supervisor_id === myId);
    const events: AttendanceEvent[] = (rosterAttQ.data as { items: AttendanceEvent[] } | undefined)?.items ?? [];
    const workLeaves: WorkLeave[] = (rosterLeavesQ.data as WorkLeave[]) ?? [];
    const excused = (rosterExcusedQ.data as number[] | undefined) ?? [];
    return buildAttendanceRoster(employees, events, workLeaves, todayStr, t('attendance.leaveFallback'), excused);
  }, [rosterEmpQ.data, rosterAttQ.data, rosterLeavesQ.data, rosterExcusedQ.data, todayStr, onlySubordinates, myId, t]);

  // One alphabetical list; the donut zone (rosterFilter) narrows it — same
  // behavior as AttendanceDetailScreen.
  const visibleRosterRows = useMemo(
    () => (rosterFilter ? rosterRows.filter((r) => r.status === rosterFilter) : rosterRows),
    [rosterRows, rosterFilter]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

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
    prefetchHomeData(queryClient, orgBranchId, todayStr);
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

  const assistantFab = canAccessPage(user, 'assistant') ? (
    // LLM assistant FAB — web BotButton parity. Client gate only (the
    // backend /llm accepts any token); stricter than web: employee-like
    // and KPP roles never see it (see roles.ts 'assistant').
    <TouchableOpacity
      style={styles.assistantFab}
      onPress={() => router.push('/assistant')}
      activeOpacity={0.85}
      testID="assistant-fab"
    >
      <Icon name="target" size={24} color={colors.onPrimary} strokeWidth={2.2} />
    </TouchableOpacity>
  ) : undefined;

  return (
    <Screen edges={['top']} overlay={assistantFab}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={() => router.push('/(tabs)/profile')}>
            {employee?.photo_path ? (
              <Image source={{ uri: employee.photo_path }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.greeting}>{dateStr}</Text>
            <Text style={styles.userName} numberOfLines={1}>{employee?.legal_name || t('dashboard.userFallback')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
            <Icon name="bell" size={21} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* On tablet the three tiles bento-wrap 2-per-row; on phone this View
            gets no style (undefined) so the cards stack exactly as before. */}
        <View style={bp.isTablet ? styles.bento : undefined}>
          {/* Bugungi jadval */}
          <View style={[styles.card, bp.isTablet && styles.bentoTile]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Icon name="clock" size={17} color={colors.primary} />
                <Text style={styles.cardTitle}>{t('dashboard.scheduleTitle')}</Text>
              </View>
              {employee?.working_hours_start && (
                <Text style={styles.scheduleTime}>{employee.working_hours_start} – {employee.working_hours_end}</Text>
              )}
            </View>
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceItem}>
                <View style={[styles.attIcon, { backgroundColor: colors.successSoft }]}>
                  <Icon name="arrowDown" size={16} color={colors.success} />
                </View>
                <Text style={styles.attendanceTime}>{entry ? dayjs(entry.happen_time).format('HH:mm') : '--:--'}</Text>
                <Text style={styles.attendanceLbl}>{t('dashboard.checkIn')}</Text>
              </View>
              <View style={styles.attendanceDivider} />
              <View style={styles.attendanceItem}>
                <View style={[styles.attIcon, { backgroundColor: colors.errorSoft }]}>
                  <Icon name="arrowUp" size={16} color={colors.error} />
                </View>
                <Text style={styles.attendanceTime}>{exit ? dayjs(exit.happen_time).format('HH:mm') : '--:--'}</Text>
                <Text style={styles.attendanceLbl}>{t('dashboard.checkOut')}</Text>
              </View>
            </View>
          </View>

          {/* Davomat (attendance) content block — the module's own donut +
              alphabetical roster (not just a nav tile), placed after the
              schedule and before So'rovlar. Role-gated exactly like the
              module (canAccessPage('attendance')) so KPP/chancellery don't
              see it. The header is tappable to open the full module; the
              roster list gets a fixed max height and scrolls internally so
              this card never grows the page unbounded. */}
          {canSeeAttendanceContent && (
            <View style={[styles.card, styles.attendanceCard, bp.isTablet && styles.bentoTile]}>
              <TouchableOpacity
                style={styles.attendanceHeaderRow}
                activeOpacity={0.75}
                onPress={() => router.push('/attendance-detail')}
              >
                <View style={styles.cardTitleRow}>
                  <Icon name="clock" size={17} color={colors.primary} />
                  <Text style={styles.cardTitle}>{t('modules.labels.attendance')}</Text>
                </View>
                <Icon name="chevronRight" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {isRosterLoading ? (
                <View style={styles.rosterLoading}><Icon name="clock" size={20} color={colors.textMuted} /></View>
              ) : (
                <>
                  <AttendanceDonut
                    total={rosterCounts.total} present={rosterCounts.present}
                    late={rosterCounts.late} onLeave={rosterCounts.onLeave}
                    activeFilter={rosterFilter} onFilter={setRosterFilter}
                    colors={colors} size={140}
                  />

                  <View style={styles.rosterHeader}>
                    <Text style={styles.rosterTitle}>
                      {rosterFilter ? t(`attendance.section.${rosterFilter}`) : t('attendance.allEmployees')} ({visibleRosterRows.length})
                    </Text>
                    {rosterFilter && (
                      <TouchableOpacity onPress={() => setRosterFilter(null)}>
                        <Text style={styles.linkText}>{t('attendance.showAll')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {visibleRosterRows.length === 0 ? (
                    <Text style={styles.emptyText}>{t('attendance.sectionEmpty.present')}</Text>
                  ) : (
                    <ScrollView style={styles.rosterScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {visibleRosterRows.map((row, idx) => (
                        <RosterRow key={row.employee.id} row={row} colors={colors} showBorder={idx < visibleRosterRows.length - 1} />
                      ))}
                    </ScrollView>
                  )}
                </>
              )}
            </View>
          )}

          {/* So'rovlar */}
          <View style={[styles.card, bp.isTablet && styles.bentoTile]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleRow}>
                <Icon name="checklist" size={17} color={colors.primary} />
                <Text style={styles.cardTitle}>{isSupervisor ? t('dashboard.incomingRequests') : t('dashboard.requests')}</Text>
                {isSupervisor && pendingCount > 0 && (
                  <View style={styles.inlineBadge}><Text style={styles.inlineBadgeText}>{pendingCount}</Text></View>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push('/work-leaves')} hitSlop={8}>
                <Text style={styles.linkText}>{t('common.all')}</Text>
              </TouchableOpacity>
            </View>

            {isSupervisor ? (
              recentAssigned.length === 0 ? (
                <Text style={styles.emptyText}>{t('dashboard.noIncomingRequests')}</Text>
              ) : (
                recentAssigned.map((leave) => {
                  const needsAction = (leave.status === 'pending' || leave.status === 'yuborildi') && !leave.signers?.some((s) => s.id === employee?.id);
                  const st = statusInfo(leave.status, colors, t);
                  return (
                    <TouchableOpacity key={leave.id} style={styles.leaveRow}
                      onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.75}>
                      <View style={styles.leaveInfo}>
                        <Text style={styles.leaveName}>{leave.employee?.legal_name ?? t('dashboard.employeeFallback')}</Text>
                        <Text style={styles.leaveDate}>{leave.type || t('dashboard.leaveRequestFallback')}</Text>
                        <Text style={styles.leaveDate}>{dayjs(leave.start_date).format('D MMM, HH:mm')} – {dayjs(leave.end_date).format('HH:mm')}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[styles.leaveStatus, { color: st.color }]}>{st.label}</Text>
                        {needsAction && <Text style={styles.actionHint}>{t('dashboard.actionNeeded')}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              myLeaves.length === 0 ? (
                <Text style={styles.emptyText}>{t('dashboard.noRequests')}</Text>
              ) : (
                myLeaves.map((leave) => {
                  const st = statusInfo(leave.status, colors, t);
                  return (
                    <TouchableOpacity key={leave.id} style={styles.leaveRow}
                      onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.75}>
                      <View style={styles.leaveInfo}>
                        <Text style={styles.leaveName}>{leave.type || t('dashboard.leaveRequestFallback')}</Text>
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
                <Icon name="plus" size={18} color={colors.onPrimary} />
                <Text style={styles.createBtnText}>{t('dashboard.createRequest')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bildirishnoma preview — third bento tile, tablet-only (matches
              web-parity gate: canAccessPage('notifications'), same as the
              bell icon route above; the page itself is unconditionally
              visible today, but the gate is kept so a future role change
              only needs to flip roles.ts, not this screen). Rendered only
              on tablet — on phone the vertical stack stays exactly as it was. */}
          {bp.isTablet && canSeeNotificationsTile && (
            <View style={[styles.card, styles.bentoTile]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Icon name="bell" size={17} color={colors.primary} />
                  <Text style={styles.cardTitle}>{t('modules.labels.notifications')}</Text>
                  {unreadCount > 0 && (
                    <View style={styles.inlineBadge}><Text style={styles.inlineBadgeText}>{unreadCount}</Text></View>
                  )}
                </View>
                <TouchableOpacity onPress={() => router.push('/notifications')} hitSlop={8}>
                  <Text style={styles.linkText}>{t('common.all')}</Text>
                </TouchableOpacity>
              </View>

              {notifications.length === 0 ? (
                <Text style={styles.emptyText}>{t('dashboard.noRequests')}</Text>
              ) : (
                notifications.slice(0, 3).map((n) => {
                  const meta = notificationMeta(n.notification_type);
                  return (
                    <TouchableOpacity key={n.id} style={styles.leaveRow}
                      onPress={() => router.push('/notifications')} activeOpacity={0.75}>
                      <View style={styles.leaveInfo}>
                        <Text style={styles.leaveName} numberOfLines={1}>{meta.title}</Text>
                        {!!n.description && <Text style={styles.leaveDate} numberOfLines={1}>{n.description}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 32 },

    headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, marginBottom: 18, gap: 12 },
    avatarWrap: { width: 48, height: 48 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.skeleton },
    avatarText: { color: c.onPrimary, fontSize: 17, fontWeight: '800' },
    greeting: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
    userName: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 2 },
    bellBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    bellBadge: { position: 'absolute', top: 7, right: 7, backgroundColor: c.warning, borderRadius: 9, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.card },
    bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    // Tablet-only 2-column bento wrapper for the schedule/requests/notifications
    // tiles (Task 8). On phone this is never applied (`bp.isTablet` gates its
    // use at the call site) so the cards keep stacking full-width via `card`'s
    // own marginBottom, byte-identical to the pre-bento layout.
    bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    // Two tiles per row on tablet: ~half the row minus the gap. flexGrow lets a
    // lone trailing tile (odd tile count) stretch to fill the row instead of
    // leaving a half-empty gap.
    bentoTile: { flexGrow: 1, flexBasis: '48%', marginBottom: 0 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },

    // Attendance content block (donut + roster). Reuses `card` chrome but
    // drops its own padding (`attendanceCard`) so the tappable header row and
    // the internally-scrolling roster can each control their own padding.
    attendanceCard: { padding: 0, overflow: 'hidden' },
    attendanceHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    rosterLoading: { paddingVertical: 40, alignItems: 'center' },
    rosterHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.cardBorder,
    },
    rosterTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    // Fixed max height + its own scroll (ROSTER_MAX_HEIGHT) so the roster
    // never grows the home page unbounded — it scrolls inside this block.
    rosterScroll: { maxHeight: ROSTER_MAX_HEIGHT },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    scheduleTime: { fontSize: 13, color: c.textSecondary },
    linkText: { fontSize: 13, color: c.primary, fontWeight: '700' },
    inlineBadge: { backgroundColor: c.warning, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
    inlineBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    attendanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    attendanceItem: { flex: 1, alignItems: 'center', gap: 6 },
    attIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    attendanceTime: { fontSize: 24, fontWeight: '800', color: c.text, letterSpacing: 1 },
    attendanceLbl: { fontSize: 11, color: c.textMuted },
    attendanceDivider: { width: 1, height: 56, backgroundColor: c.cardBorder, marginHorizontal: 16 },

    emptyText: { color: c.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 14 },

    leaveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    leaveInfo: { flex: 1, gap: 3 },
    leaveName: { fontSize: 14, fontWeight: '600', color: c.text },
    leaveDate: { fontSize: 12, color: c.textSecondary },
    leaveStatus: { fontSize: 12, fontWeight: '700', marginLeft: 8, marginTop: 2 },
    actionHint: { fontSize: 10, color: c.warning, fontWeight: '600' },

    createBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    assistantFab: {
      position: 'absolute', right: 16, bottom: 20, width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
      elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    createBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
