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
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { WorkLeave } from '../src/types';

function statusMeta(status: string, c: ThemeColors) {
  if (status === 'approved' || status === 'tasdiqlangan' || status === 'signed') return { label: 'Tasdiqlangan', fg: c.success, bg: c.successSoft };
  if (status === 'rejected' || status === 'rad_etilgan') return { label: 'Rad etildi', fg: c.error, bg: c.errorSoft };
  return { label: 'Kutilmoqda', fg: c.warning, bg: c.warningSoft };
}

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

export default function TeamLeavesScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(now.month());
  const [selectedYear] = useState(now.year());

  const { data: allLeaves = [], isLoading, refetch, isFetching } = useQuery<WorkLeave[]>({
    queryKey: ['team-leaves-all'],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { size: 200 } }).then((r) => {
        const d = r.data;
        return (Array.isArray(d) ? d : (d?.items ?? [])) as WorkLeave[];
      }),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    return allLeaves
      .filter((l) => {
        if (orgBranchId && l.employee?.department?.organization_branch_id !== orgBranchId) return false;
        const d = dayjs(l.created_at ?? l.start_date);
        return d.month() === selectedMonth && d.year() === selectedYear;
      })
      .sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)));
  }, [allLeaves, selectedMonth, selectedYear, orgBranchId]);

  const monthOptions = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month');
      result.push({ month: m.month(), year: m.year(), label: MONTHS_UZ[m.month()] });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jamoa so'rovlari</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-leave')}>
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthFilterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
          {monthOptions.map((m) => {
            const active = selectedMonth === m.month && selectedYear === m.year;
            return (
              <TouchableOpacity key={`${m.year}-${m.month}`} style={[styles.monthChip, active && styles.monthChipActive]} onPress={() => setSelectedMonth(m.month)} activeOpacity={0.7}>
                <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyWrapper}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>So'rovlar yo'q</Text>
              </View>
            ) : (
              filtered.map((leave) => {
                const st = statusMeta(leave.status, colors);
                const sameDay = dayjs(leave.start_date).format('DD.MM.YYYY') === dayjs(leave.end_date).format('DD.MM.YYYY');
                return (
                  <TouchableOpacity key={leave.id} style={styles.card}
                    onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.8}>
                    {leave.employee && (
                      <View style={styles.empRow}>
                        {leave.employee.photo_path ? (
                          <Image source={{ uri: leave.employee.photo_path }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>{(leave.employee.legal_name || '?').charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        <Text style={styles.empName} numberOfLines={1}>{leave.employee.legal_name}</Text>
                      </View>
                    )}
                    <View style={styles.cardTop}>
                      <Text style={styles.categoryName} numberOfLines={1}>{leave.type ?? "So'rov"}</Text>
                      <View style={[styles.badge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    </View>
                    <View style={styles.dateRow}>
                      <Text style={styles.dateIcon}>📅</Text>
                      {sameDay ? (
                        <Text style={styles.dateText}>
                          {dayjs(leave.start_date).format('DD.MM.YYYY')} {dayjs(leave.start_date).format('HH:mm')} – {dayjs(leave.end_date).format('HH:mm')}
                        </Text>
                      ) : (
                        <Text style={styles.dateText}>
                          {dayjs(leave.start_date).format('DD.MM.YYYY HH:mm')} – {dayjs(leave.end_date).format('DD.MM.YYYY HH:mm')}
                        </Text>
                      )}
                    </View>
                    {leave.description ? <Text style={styles.comment} numberOfLines={2}>{leave.description}</Text> : null}
                    {leave.created_at ? <Text style={styles.createdAt}>Yuborilgan: {dayjs(leave.created_at).format('DD.MM.YYYY HH:mm')}</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },
    addBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { fontSize: 24, color: c.primaryLight, fontWeight: '400' },

    monthFilterWrapper: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    monthRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    monthChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    monthChipText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    monthChipTextActive: { color: c.onPrimary },

    content: { paddingHorizontal: 16, paddingTop: 10 },
    emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyIcon: { fontSize: 48 },
    emptyText: { color: c.textMuted, fontSize: 15 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 14, marginBottom: 10, gap: 6 },
    empRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    avatar: { width: 30, height: 30, borderRadius: 15 },
    avatarPlaceholder: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 12, fontWeight: '700', color: c.primaryLight },
    empName: { flex: 1, fontSize: 13, color: c.textSecondary, fontWeight: '600' },

    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    categoryName: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateIcon: { fontSize: 13 },
    dateText: { fontSize: 13, color: c.textSecondary, flex: 1 },
    comment: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
    createdAt: { fontSize: 11, color: c.textMuted },
  });
