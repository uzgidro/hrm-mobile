import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { WORK_LEAVES } from '../src/api/urls';
import { COLORS } from '../src/constants';
import { WorkLeave } from '../src/types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Kutilmoqda',   color: COLORS.warning },
  yuborildi:  { label: 'Kutilmoqda',   color: COLORS.warning },
  approved:   { label: 'Tasdiqlangan', color: COLORS.present },
  tasdiqlangan: { label: 'Tasdiqlangan', color: COLORS.present },
  signed:     { label: 'Tasdiqlangan', color: COLORS.present },
  rejected:   { label: 'Rad etildi',   color: '#E5536A' },
  rad_etilgan: { label: 'Rad etildi',  color: '#E5536A' },
};

const MY_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',      label: 'Barchasi'     },
  { key: 'pending',  label: 'Kutilmoqda'   },
  { key: 'approved', label: 'Tasdiqlangan' },
  { key: 'rejected', label: 'Rad etildi'   },
];

const INCOMING_FILTERS: { key: 'all' | 'action' | 'approved' | 'rejected'; label: string }[] = [
  { key: 'all',      label: 'Barchasi'      },
  { key: 'action',   label: 'Kutilmoqda'    },
  { key: 'approved', label: 'Tasdiqlangan'  },
  { key: 'rejected', label: 'Rad etildi'    },
];

function isPendingStatus(s: string) {
  return s === 'pending' || s === 'yuborildi';
}
function isApprovedStatus(s: string) {
  return s === 'approved' || s === 'tasdiqlangan' || s === 'signed';
}
function isRejectedStatus(s: string) {
  return s === 'rejected' || s === 'rad_etilgan';
}

function LeaveCard({
  leave,
  showEmployee = false,
  actionNeeded = false,
}: {
  leave: WorkLeave;
  showEmployee?: boolean;
  actionNeeded?: boolean;
}) {
  const st = STATUS_META[leave.status] ?? STATUS_META.pending;
  const sameDay =
    dayjs(leave.start_date).format('DD.MM.YYYY') ===
    dayjs(leave.end_date).format('DD.MM.YYYY');

  return (
    <TouchableOpacity
      style={[styles.card, actionNeeded && styles.cardHighlight]}
      onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
      activeOpacity={0.75}
    >
      {actionNeeded && (
        <View style={styles.actionBadgeRow}>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>Tasdiqlash kerak</Text>
          </View>
        </View>
      )}

      {showEmployee && leave.employee && (
        <View style={styles.empRow}>
          {leave.employee.photo_path ? (
            <Image source={{ uri: leave.employee.photo_path }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(leave.employee.legal_name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.empName} numberOfLines={1}>
            {leave.employee.legal_name}
          </Text>
        </View>
      )}

      <View style={styles.cardTop}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {leave.type ?? "So'rov"}
        </Text>
        <View style={[styles.badge, { backgroundColor: st.color + '22' }]}>
          <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateIcon}>📅</Text>
        {sameDay ? (
          <Text style={styles.dateText}>
            {dayjs(leave.start_date).format('DD.MM.YYYY')}{' '}
            {dayjs(leave.start_date).format('HH:mm')} – {dayjs(leave.end_date).format('HH:mm')}
          </Text>
        ) : (
          <Text style={styles.dateText}>
            {dayjs(leave.start_date).format('DD.MM.YYYY HH:mm')}
            {' – '}
            {dayjs(leave.end_date).format('DD.MM.YYYY HH:mm')}
          </Text>
        )}
      </View>

      {leave.description ? (
        <Text style={styles.comment} numberOfLines={2}>{leave.description}</Text>
      ) : null}

      {leave.created_at ? (
        <Text style={styles.createdAt}>
          Yuborilgan: {dayjs(leave.created_at).format('DD.MM.YYYY HH:mm')}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function WorkLeavesScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const employeeId = employee?.id;

  // Supervisor = employee with no supervisor assigned
  const isSupervisor = !employee?.supervisor;

  const [myFilter, setMyFilter] = useState<StatusFilter>('all');
  const [incomingFilter, setIncomingFilter] = useState<'all' | 'action' | 'approved' | 'rejected'>('action');

  // ── My own leaves (for regular employees) ──────────────────────────────
  const { data: myLeaves = [], isLoading: myLoading, refetch: myRefetch, isFetching: myFetching } =
    useQuery<WorkLeave[]>({
      queryKey: ['work-leaves', employeeId],
      queryFn: () =>
        apiClient.get(WORK_LEAVES, {
          params: { employee_id: employeeId, size: 100 },
        }).then((r) => {
          const d = r.data;
          return Array.isArray(d) ? d : (d?.items ?? []);
        }),
      enabled: !!employeeId && !isSupervisor,
      staleTime: 2 * 60 * 1000,
    });

  // ── Incoming leaves assigned to me (for supervisors) ───────────────────
  const { data: allLeaves = [], isLoading: allLoading, refetch: allRefetch, isFetching: allFetching } =
    useQuery<WorkLeave[]>({
      queryKey: ['assigned-leaves', employeeId],
      queryFn: () =>
        apiClient.get(WORK_LEAVES, { params: { size: 200 } }).then((r) => {
          const d = r.data;
          const items: WorkLeave[] = Array.isArray(d) ? d : (d?.items ?? []);
          return items.filter((l) =>
            l.assigned_signers?.some((s) => s.id === employeeId)
          );
        }),
      enabled: !!employeeId && isSupervisor,
      staleTime: 60 * 1000,
    });

  const isLoading = isSupervisor ? allLoading : myLoading;
  const isFetching = isSupervisor ? allFetching : myFetching;
  const refetch = isSupervisor ? allRefetch : myRefetch;

  // ── Filtered lists ─────────────────────────────────────────────────────
  const filteredMyLeaves = useMemo(() => {
    const base = myFilter === 'all'
      ? myLeaves
      : myLeaves.filter((l) => {
          if (myFilter === 'pending') return isPendingStatus(l.status);
          if (myFilter === 'approved') return isApprovedStatus(l.status);
          if (myFilter === 'rejected') return isRejectedStatus(l.status);
          return true;
        });
    return [...base].sort((a, b) =>
      (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))
    );
  }, [myLeaves, myFilter]);

  const filteredIncoming = useMemo(() => {
    const base = allLeaves.filter((l) => {
      if (incomingFilter === 'all') return true;
      const alreadySigned = l.signers?.some((s) => s.id === employeeId);
      if (incomingFilter === 'action') {
        return isPendingStatus(l.status) && !alreadySigned;
      }
      if (incomingFilter === 'approved') return isApprovedStatus(l.status) || alreadySigned;
      if (incomingFilter === 'rejected') return isRejectedStatus(l.status);
      return true;
    });
    return [...base].sort((a, b) =>
      (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))
    );
  }, [allLeaves, incomingFilter, employeeId]);

  const pendingCount = useMemo(
    () => allLeaves.filter((l) =>
      isPendingStatus(l.status) && !l.signers?.some((s) => s.id === employeeId)
    ).length,
    [allLeaves, employeeId]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>
            {isSupervisor ? "Kiruvchi so'rovlar" : "So'rovlar"}
          </Text>
          {isSupervisor && pendingCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        {!isSupervisor && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/create-leave')}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        )}
        {isSupervisor && <View style={{ width: 36 }} />}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {isSupervisor
            ? INCOMING_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterTab, incomingFilter === f.key && styles.filterTabActive]}
                  onPress={() => setIncomingFilter(f.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, incomingFilter === f.key && styles.filterTabTextActive]}>
                    {f.label}
                    {f.key === 'action' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                  </Text>
                </TouchableOpacity>
              ))
            : MY_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterTab, myFilter === f.key && styles.filterTabActive]}
                  onPress={() => setMyFilter(f.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, myFilter === f.key && styles.filterTabTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))
          }
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primaryLight} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={refetch}
                tintColor={COLORS.primaryLight}
              />
            }
          >
            {isSupervisor ? (
              filteredIncoming.length === 0 ? (
                <View style={styles.emptyWrapper}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>
                    {incomingFilter === 'action' ? "Kutilayotgan so'rovlar yo'q" : "So'rovlar yo'q"}
                  </Text>
                </View>
              ) : (
                filteredIncoming.map((leave) => {
                  const alreadySigned = leave.signers?.some((s) => s.id === employeeId);
                  const actionNeeded = isPendingStatus(leave.status) && !alreadySigned;
                  return (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      showEmployee
                      actionNeeded={actionNeeded}
                    />
                  );
                })
              )
            ) : (
              filteredMyLeaves.length === 0 ? (
                <View style={styles.emptyWrapper}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>So'rovlar yo'q</Text>
                </View>
              ) : (
                filteredMyLeaves.map((leave) => (
                  <LeaveCard key={leave.id} leave={leave} />
                ))
              )
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {/* FAB for regular employees */}
      {!isSupervisor && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-leave')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 4, gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  countBadge: {
    backgroundColor: COLORS.warning, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center',
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  addBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { fontSize: 24, color: COLORS.primaryLight, fontWeight: '400' },

  filterWrapper: {
    flexShrink: 0,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  filterRow: {
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  filterTabTextActive: { color: '#fff' },

  content: { paddingHorizontal: 16, paddingTop: 8 },

  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 14, marginBottom: 10, gap: 6,
  },
  cardHighlight: {
    borderColor: COLORS.warning + '88',
    backgroundColor: COLORS.warning + '08',
  },
  actionBadgeRow: { flexDirection: 'row' },
  actionBadge: {
    backgroundColor: COLORS.warning + '22',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  actionBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },

  empRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 12, fontWeight: '700', color: COLORS.primaryLight },
  empName: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateIcon: { fontSize: 13 },
  dateText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  comment: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  createdAt: { fontSize: 11, color: COLORS.textMuted },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '400' },
});
