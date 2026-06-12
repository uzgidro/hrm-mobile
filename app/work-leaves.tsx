import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
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
  pending:  { label: 'Kutilmoqda',   color: COLORS.warning },
  approved: { label: 'Tasdiqlangan', color: COLORS.present },
  rejected: { label: 'Rad etildi',   color: '#E5536A' },
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',      label: 'Barchasi'     },
  { key: 'pending',  label: 'Kutilmoqda'   },
  { key: 'approved', label: 'Tasdiqlangan' },
  { key: 'rejected', label: 'Rad etildi'   },
];

export default function WorkLeavesScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data: leaves = [], isLoading, refetch, isFetching } = useQuery<WorkLeave[]>({
    queryKey: ['work-leaves', employee?.id],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, {
        params: { employee_id: employee?.id, size: 100 },
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: !!employee?.id,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const f = filter === 'all' ? leaves : leaves.filter((l) => l.status === filter);
    return [...f].sort((a, b) =>
      (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))
    );
  }, [leaves, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>So'rovlar</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/create-leave')}
          activeOpacity={0.7}
        >
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
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
          {filtered.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>So'rovlar yo'q</Text>
            </View>
          ) : (
            filtered.map((leave) => {
              const st = STATUS_META[leave.status] ?? STATUS_META.pending;
              const sameDay =
                dayjs(leave.start_date).format('DD.MM.YYYY') ===
                dayjs(leave.end_date).format('DD.MM.YYYY');
              return (
                <TouchableOpacity
                  key={leave.id} style={styles.card}
                  onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
                  activeOpacity={0.75}
                >
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
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-leave')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, paddingLeft: 4 },
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
