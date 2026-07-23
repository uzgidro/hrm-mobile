import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { ChairmanTask } from '@/types';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { canManageChairmanTasks } from '@/utils/roles';
import { monthName } from '@/i18n/dates';
import { chairmanTasksListQuery } from '../api/queries';

// Month-scoped agenda as a day-grouped list (mobile-first; the web uses a wide
// horizontal calendar, not portable here). Secretariat/admin get a create button
// and per-task edit; the minister only views (canManage=false).
export default function ChairmanTasksScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const canManage = canManageChairmanTasks(user);

  // Anchor month, navigable with ‹ ›. Stored as the first day of the month.
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const from = month.format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');

  const { data: tasks = [], isLoading, isError, refetch, isFetching } = useQuery(
    chairmanTasksListQuery(from, to),
  );

  // Group by day → SectionList sections, ordered by date, tasks by start_time.
  const sections = useMemo(() => {
    const byDay: Record<string, ChairmanTask[]> = {};
    for (const task of tasks) {
      (byDay[task.task_date] ??= []).push(task);
    }
    return Object.keys(byDay)
      .sort()
      .map((date) => ({
        date,
        data: byDay[date].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
      }));
  }, [tasks]);

  const timeRange = (task: ChairmanTask) => {
    if (!task.start_time) return '';
    const s = task.start_time.slice(0, 5);
    return task.end_time ? `${s} – ${task.end_time.slice(0, 5)}` : s;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('chairman.title')}
        right={canManage ? <HeaderAction icon="plus" onPress={() => router.push('/chairman-task-form')} /> : undefined}
      />

      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => setMonth((m) => m.subtract(1, 'month'))} hitSlop={10} style={styles.monthBtn}>
          <Icon name="chevronLeft" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthName(month.month())} {month.year()}</Text>
        <TouchableOpacity onPress={() => setMonth((m) => m.add(1, 'month'))} hitSlop={10} style={styles.monthBtn}>
          <Icon name="chevronRight" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('chairman.loadError')} onRetry={refetch} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.dayHeader}>{dayjs(section.date).format('DD MMMM, dddd')}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={canManage ? 0.8 : 1}
              disabled={!canManage}
              onPress={() =>
                canManage &&
                router.push({ pathname: '/chairman-task-form', params: { id: String(item.id), date: item.task_date } })
              }
            >
              <View style={[styles.colorBar, { backgroundColor: item.color || colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                {!!timeRange(item) && <Text style={styles.taskTime}>{timeRange(item)}</Text>}
                {!!item.participants && <Text style={styles.taskParticipants} numberOfLines={1}>{item.participants}</Text>}
              </View>
              {canManage && <Icon name="chevronRight" size={18} color={colors.textMuted} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState icon="calendar" title={t('chairman.empty')} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
    monthBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { fontSize: 16, fontWeight: '700', color: c.text },
    content: { paddingHorizontal: 16, paddingBottom: 24 },
    dayHeader: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginTop: 16, marginBottom: 8, backgroundColor: c.bg },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder },
    colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    taskTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    taskTime: { fontSize: 12, color: c.primary, fontWeight: '600', marginTop: 2 },
    taskParticipants: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  });
