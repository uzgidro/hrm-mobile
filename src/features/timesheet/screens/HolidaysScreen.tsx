import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { LoadingView, ErrorState, EmptyState } from '@/components/StateViews';
import type { Employee } from '@/types';
import { holidaysQuery, offDayDutyQuery } from '../api/queries';
import { dateRangeLabel, sortByDateFrom, isOngoing } from '../holidays';

// "Праздники / дежурные дни" — read-only lists (web HolidaysPage's two tabs).
// CRUD stays on the desktop page; mobile only views.
export default function HolidaysScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [tab, setTab] = useState<'holidays' | 'offduty'>('holidays');
  const today = dayjs().format('YYYY-MM-DD');

  const holidaysQ = useQuery(holidaysQuery(orgBranchId));
  const offDutyQ = useQuery(offDayDutyQuery());
  const activeQ = tab === 'holidays' ? holidaysQ : offDutyQ;

  const holidays = useMemo(() => sortByDateFrom(holidaysQ.data ?? []), [holidaysQ.data]);
  const offDuty = useMemo(() => sortByDateFrom(offDutyQ.data ?? []), [offDutyQ.data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('timesheet.holidaysTitle')}</Text>
          <Text style={styles.headerSub}>{t('timesheet.holidaysSubtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsRow}>
        {([['holidays', t('timesheet.holidaysTab')], ['offduty', t('timesheet.offDutyTab')]] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeQ.isLoading ? (
        <LoadingView />
      ) : activeQ.isError ? (
        <ErrorState title={t('timesheet.holidaysLoadError')} onRetry={() => activeQ.refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={activeQ.isFetching} onRefresh={() => activeQ.refetch()} tintColor={colors.primaryLight} />
          }
        >
          {tab === 'holidays' ? (
            holidays.length === 0 ? (
              <EmptyState icon="sun" title={t('timesheet.holidaysEmpty')} />
            ) : (
              holidays.map((h) => (
                <View key={h.id} style={styles.card}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{h.name ?? '—'}</Text>
                    <View style={styles.badges}>
                      {isOngoing(h, today) && (
                        <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
                          <Text style={[styles.badgeText, { color: colors.success }]}>{t('timesheet.ongoingBadge')}</Text>
                        </View>
                      )}
                      {!!h.is_repeatable && (
                        <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                          <Text style={[styles.badgeText, { color: colors.primaryLight }]}>{t('timesheet.repeatableBadge')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.rowDates}>
                    <Icon name="calendar" size={14} color={colors.textMuted} />
                    <Text style={styles.rowDatesText}>{dateRangeLabel(h.date_from, h.date_to)}</Text>
                  </View>
                </View>
              ))
            )
          ) : offDuty.length === 0 ? (
            <EmptyState icon="briefcase" title={t('timesheet.offDutyEmpty')} />
          ) : (
            offDuty.map((d) => (
              <View key={d.id} style={styles.card}>
                <View style={styles.rowDates}>
                  <Icon name="calendar" size={14} color={colors.textMuted} />
                  <Text style={[styles.rowDatesText, styles.rowDatesStrong]}>{dateRangeLabel(d.date_from, d.date_to)}</Text>
                  {isOngoing(d, today) && (
                    <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
                      <Text style={[styles.badgeText, { color: colors.success }]}>{t('timesheet.ongoingBadge')}</Text>
                    </View>
                  )}
                </View>
                {(d.employees ?? []).map((emp: Employee, idx: number) => (
                  <View key={emp.id} style={[styles.memberRow, idx < (d.employees?.length ?? 0) - 1 && styles.memberRowBorder]}>
                    <EmployeeAvatar emp={emp} size={36} />
                    <Text style={styles.memberName} numberOfLines={1}>{emp.legal_name}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 32 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.primaryLight },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary, paddingHorizontal: 8 },
    tabTextActive: { color: c.primaryLight },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 14, marginTop: 12, borderWidth: 1, borderColor: c.cardBorder },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    badges: { flexDirection: 'row', gap: 6 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    rowDates: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    rowDatesText: { fontSize: 13, color: c.textSecondary },
    rowDatesStrong: { fontWeight: '700', color: c.text, flex: 1 },

    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, marginTop: 4 },
    memberRowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
  });
