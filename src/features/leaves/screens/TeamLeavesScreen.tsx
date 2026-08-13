import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { SearchBox } from '@/components/SearchBox';
import { monthName } from '@/i18n/dates';
import { leaveStatusGroup, leaveStatusKind } from '@/utils/leaveStatus';
import { statusColor } from '@/utils/orderStatus';
import { teamLeavesQuery } from '../api/queries';
import { leaveTypeLabel } from '../components/LeaveTypeSheet';

function statusMeta(status: string, c: ThemeColors, t: TFunction) {
  const group = leaveStatusGroup(status);
  const { fg, bg } = statusColor(leaveStatusKind(status), c);
  if (group === 'approved') return { label: t('leaves.statusApproved'), fg, bg };
  if (group === 'rejected') return { label: t('leaves.statusRejected'), fg, bg };
  return { label: t('leaves.statusPending'), fg, bg };
}

type StatusGroup = 'all' | 'pending' | 'approved' | 'rejected';
function statusGroup(s?: string | null): Exclude<StatusGroup, 'all'> {
  return leaveStatusGroup(s ?? undefined);
}
const STATUS_CHIPS: { key: StatusGroup; labelKey: string }[] = [
  { key: 'all', labelKey: 'leaves.filterAll' },
  { key: 'pending', labelKey: 'leaves.statusPending' },
  { key: 'approved', labelKey: 'leaves.statusApproved' },
  { key: 'rejected', labelKey: 'leaves.statusRejected' },
];

export default function TeamLeavesScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(now.month());
  const [selectedYear] = useState(now.year());
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<StatusGroup>('all');

  const { data: allLeaves = [], isLoading, refetch, isFetching } = useQuery({
    ...teamLeavesQuery(user, orgBranchId),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLeaves
      .filter((l) => {
        const d = dayjs(l.created_at ?? l.start_date);
        if (d.month() !== selectedMonth || d.year() !== selectedYear) return false;
        if (statusF !== 'all' && statusGroup(l.status) !== statusF) return false;
        if (!q) return true;
        return (
          (l.employee?.legal_name?.toLowerCase().includes(q) ?? false) ||
          (l.type?.toLowerCase().includes(q) ?? false) ||
          (l.description?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)));
  }, [allLeaves, selectedMonth, selectedYear, search, statusF]);

  const monthOptions = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month');
      result.push({ month: m.month(), year: m.year(), label: monthName(m.month()) });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('leaves.teamTitle')}
        right={<HeaderAction icon="plus" onPress={() => router.push('/create-leave')} color={colors.primaryLight} />}
      />

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

      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('leaves.searchPlaceholder')} />
      </View>

      <View style={styles.statusFilterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          {STATUS_CHIPS.map((s) => {
            const active = statusF === s.key;
            return (
              <TouchableOpacity key={s.key} style={[styles.statusChip, active && styles.statusChipActive]} onPress={() => setStatusF(s.key)} activeOpacity={0.7}>
                <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{t(s.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <LoadingView />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
          >
            {filtered.length === 0 ? (
              <EmptyState icon="checklist" title={t('leaves.emptyLeaves')} />
            ) : (
              filtered.map((leave) => {
                const st = statusMeta(leave.status, colors, t);
                const sameDay = dayjs(leave.start_date).format('DD.MM.YYYY') === dayjs(leave.end_date).format('DD.MM.YYYY');
                return (
                  <TouchableOpacity key={leave.id} style={styles.card}
                    onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })} activeOpacity={0.8}>
                    {leave.employee && (
                      <View style={styles.empRow}>
                        <EmployeeAvatar emp={leave.employee} size={30} />
                        <Text style={styles.empName} numberOfLines={1}>{leave.employee.legal_name}</Text>
                      </View>
                    )}
                    <View style={styles.cardTop}>
                      <Text style={styles.categoryName} numberOfLines={1}>{leave.type ? leaveTypeLabel(t, leave.type) : t('leaves.typeFallback')}</Text>
                      <View style={[styles.badge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    </View>
                    <View style={styles.dateRow}>
                      <Icon name="calendar" size={14} color={colors.textMuted} />
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
                    {leave.created_at ? <Text style={styles.createdAt}>{t('leaves.createdAtPrefix', { date: dayjs(leave.created_at).format('DD.MM.YYYY HH:mm') })}</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    monthFilterWrapper: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    searchWrap: { paddingHorizontal: 16, paddingTop: 10, flexShrink: 0 },
    statusFilterWrapper: { flexShrink: 0 },
    statusRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    statusChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    statusChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    statusChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    statusChipTextActive: { color: c.onPrimary },
    monthRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    monthChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    monthChipText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    monthChipTextActive: { color: c.onPrimary },

    content: { paddingHorizontal: 16, paddingTop: 10 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 14, marginBottom: 10, gap: 6 },
    empRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
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
