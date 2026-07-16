import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
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
import { LoadingView, ErrorState, EmptyState } from '@/components/StateViews';
import { monthName, weekdayNameShort } from '@/i18n/dates';
import { myTimesheetQuery } from '../api/queries';
import { tabelCodeMeta, tabelCodeColor, legendCodesFor, tabelSummary } from '../utils';

// Weekday header, Monday-first (dayjs indexes weekdays Sunday=0).
const WEEKDAY_INDICES = [1, 2, 3, 4, 5, 6, 0];

// "Мой табель" — the personal monthly tabel built from the backend-computed
// normalized calendar ({date -> status code}), NOT from raw turnstile events.
// Unlike the davomat calendar it also shows leaves/trips/sick days. Read-only.
export default function MyTimesheetScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);

  // Month navigation keeps the selection inside the shown month — today when
  // navigating back to the current month, else the 1st (a stale out-of-month
  // selection would render an empty "day status" card).
  const goToMonth = useCallback((m: dayjs.Dayjs) => {
    setCurrentMonth(m);
    setSelectedDate(m.isSame(dayjs(), 'month') ? dayjs().format('YYYY-MM-DD') : m.format('YYYY-MM-DD'));
  }, []);

  const monthKey = currentMonth.format('YYYY-MM');
  const query = myTimesheetQuery(monthKey, employeeId);
  const { data: row, isLoading, isError, refetch } = useQuery(query);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Own useMemo so the `?? {}` fallback doesn't mint a new object every render
  // (it feeds the memoized grid/legend deps below).
  const calendar = useMemo(() => row?.attendance?.calendar ?? {}, [row?.attendance?.calendar]);
  const lateMinutes = row?.attendance?.daily_late_minutes ?? {};
  const summary = useMemo(() => tabelSummary(row?.attendance), [row?.attendance]);
  const legendCodes = useMemo(() => legendCodesFor(calendar), [calendar]);

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = (currentMonth.day() + 6) % 7;
  const calendarDays = useMemo(() => {
    const cells: ({ date: string; code?: string; isWeekend: boolean; isToday: boolean } | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = currentMonth.date(d).format('YYYY-MM-DD');
      const dow = (currentMonth.date(d).day() + 6) % 7;
      cells.push({
        date,
        code: calendar[date],
        isWeekend: dow >= 5,
        isToday: date === dayjs().format('YYYY-MM-DD'),
      });
    }
    return cells;
  }, [currentMonth, firstDayOfWeek, daysInMonth, calendar]);

  const selectedCode = calendar[selectedDate];
  const selectedMeta = tabelCodeMeta(selectedCode);
  const selectedLate = lateMinutes[selectedDate] ?? 0;
  const hasData = Object.keys(calendar).length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('timesheet.myTitle')}</Text>
          <Text style={styles.headerSub}>{t('timesheet.mySubtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('timesheet.loadError')} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        >
          <View style={styles.card}>
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navBtn} onPress={() => goToMonth(currentMonth.subtract(1, 'month'))}>
                <Icon name="chevronLeft" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthName(currentMonth.month())} {currentMonth.year()}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={() => goToMonth(currentMonth.add(1, 'month'))}>
                <Icon name="chevronRight" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAY_INDICES.map((d) => <Text key={d} style={styles.weekDayLabel}>{weekdayNameShort(d)}</Text>)}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, i) => {
                if (!day) return <View key={`empty-${i}`} style={styles.dayCell} />;
                const isSelected = day.date === selectedDate;
                const color = day.code ? tabelCodeColor(day.code, colors) : undefined;
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[styles.dayCell, day.isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]}
                    onPress={() => setSelectedDate(day.date)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayText, day.isWeekend && styles.dayTextWeekend, isSelected && styles.dayTextSelected]}>
                      {dayjs(day.date).date()}
                    </Text>
                    {color ? (
                      <View style={[styles.dayDot, { backgroundColor: color }]} />
                    ) : (
                      <View style={styles.dayDotPlaceholder} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {!hasData && <EmptyState icon="calendar" title={t('timesheet.empty')} />}

          {hasData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('timesheet.dayTitle')}</Text>
              <View style={styles.dayDetailRow}>
                <View style={[styles.letterBadge, { backgroundColor: tabelCodeColor(selectedCode, colors) }]}>
                  <Text style={styles.letterBadgeText}>{selectedMeta.letter}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayDetailLabel}>{selectedCode ? t(selectedMeta.labelKey) : '—'}</Text>
                  <Text style={styles.dayDetailDate}>{dayjs(selectedDate).format('D MMMM YYYY')}</Text>
                </View>
                {selectedLate > 0 && (
                  <Text style={styles.lateText}>{t('timesheet.lateByMinutes', { value: selectedLate })}</Text>
                )}
              </View>
            </View>
          )}

          {hasData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('timesheet.summaryTitle')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.present }]}>{summary.present}</Text>
                  <Text style={styles.statLabel}>{t('timesheet.present')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{summary.late}</Text>
                  <Text style={styles.statLabel}>{t('timesheet.late')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.error }]}>{summary.absent}</Text>
                  <Text style={styles.statLabel}>{t('timesheet.absent')}</Text>
                </View>
              </View>
              <View style={styles.hoursRow}>
                <Text style={styles.hoursValue}>{t('timesheet.hoursValue', { value: summary.hours })}</Text>
                <Text style={styles.hoursLabel}>{t('timesheet.hoursLabel')}</Text>
              </View>
            </View>
          )}

          {legendCodes.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('timesheet.legendTitle')}</Text>
              {legendCodes.map((code) => {
                const meta = tabelCodeMeta(code);
                return (
                  <View key={code} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: tabelCodeColor(code, colors) }]} />
                    <Text style={styles.legendLetter}>{meta.letter}</Text>
                    <Text style={styles.legendLabel}>{t(meta.labelKey)}</Text>
                  </View>
                );
              })}
            </View>
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

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 12 },

    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navBtn: { width: 40, height: 40, backgroundColor: c.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
    monthTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    weekRow: { flexDirection: 'row', marginBottom: 8 },
    weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: c.textMuted, fontWeight: '600' },

    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: `${100 / 7}%`, aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    dayCellToday: { borderWidth: 1, borderColor: c.primaryLight },
    dayCellSelected: { backgroundColor: c.primarySoft },
    dayText: { fontSize: 14, fontWeight: '600', color: c.text },
    dayTextWeekend: { color: c.textMuted },
    dayTextSelected: { color: c.primaryLight },
    dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
    dayDotPlaceholder: { width: 6, height: 6, marginTop: 3 },

    dayDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    letterBadge: { minWidth: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    letterBadgeText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    dayDetailLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    dayDetailDate: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    lateText: { fontSize: 12, fontWeight: '700', color: c.warning },

    statsRow: { flexDirection: 'row' },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    hoursRow: { alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.cardBorder },
    hoursValue: { fontSize: 18, fontWeight: '800', color: c.text },
    hoursLabel: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLetter: { width: 28, fontSize: 13, fontWeight: '800', color: c.text },
    legendLabel: { flex: 1, fontSize: 13, color: c.textSecondary },
  });
