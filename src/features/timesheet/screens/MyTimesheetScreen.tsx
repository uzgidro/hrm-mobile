// «Mening tabelim» — backend hisoblagan normallashgan kalendar ({sana → holat
// kodi}) asosidagi shaxsiy oylik tabel (xom turniket voqealari EMAS): ta'til,
// safar, kasallik ham ko'rinadi. Faqat ko'rish. v3: `src/ui` primitivlarida,
// planshetda ikki ustun (kalendar + kun | xulosa + jurnal + izoh).
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { timeRange } from '@/utils/timeText';
import { locationsCatalogQuery } from '@/utils/attendance';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { useBreakpoint } from '@/utils/responsive';
import { weekdayNameShort } from '@/i18n/dates';
import { AttendanceEventRow } from '@/components/AttendanceEventRow';
import { MonthNavigator } from '@/components/MonthNavigator';
import { Card, EmptyState, ErrorState, PageHeader, Screen, Skeleton, StatTile, Text } from '@/ui';
import { myTimesheetQuery, myTimesheetEventsQuery } from '../api/queries';
import { tabelCodeMeta, tabelCodeColor, legendCodesFor, tabelSummary, dayAttendanceDetail } from '../utils';

// Hafta sarlavhasi dushanbadan (dayjs: yakshanba = 0).
const WEEKDAY_INDICES = [1, 2, 3, 4, 5, 6, 0];

/** `embedded` — Davomat tabining «Mening tabelim» segmenti ichida (sarlavha va yuqori safe-area tabda). */
export default function MyTimesheetScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const { sizeClass } = useBreakpoint();
  const wide = sizeClass !== 'compact';

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  // Oy almashganda tanlov shu oy ichida qoladi: joriy oyda — bugun, aks holda 1-kun
  // (oydan tashqaridagi tanlov bo'sh «kun holati» kartasini chizardi).
  const goToMonth = useCallback((m: dayjs.Dayjs) => {
    setCurrentMonth(m);
    setSelectedDate(m.isSame(dayjs(), 'month') ? dayjs().format('YYYY-MM-DD') : m.format('YYYY-MM-DD'));
  }, []);

  const monthKey = currentMonth.format('YYYY-MM');
  // isLoading (isPending EMAS): xodim kartasi yo'q akkauntda so'rov o'chiq — skeletda qotmasin.
  const { data: row, isLoading, isError, isRefetching, refetch } = useQuery(myTimesheetQuery(monthKey, employeeId));
  const { data: locations } = useQuery(locationsCatalogQuery(resolveEmployeeBranchId(user?.employee)));
  // Kirish/chiqish va jurnal uchun xom voqealar — bloklamaydi, kalendar ularsiz chiziladi.
  const { data: events = [], refetch: refetchEvents } = useQuery(myTimesheetEventsQuery(monthKey, employeeId));

  const dayDetail = useMemo(() => dayAttendanceDetail(events, selectedDate), [events, selectedDate]);
  const calendar = useMemo(() => row?.attendance?.calendar ?? {}, [row?.attendance?.calendar]);
  const lateMinutes = row?.attendance?.daily_late_minutes ?? {};
  const summary = useMemo(() => tabelSummary(row?.attendance), [row?.attendance]);
  const legendCodes = useMemo(() => legendCodesFor(calendar), [calendar]);

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = (currentMonth.day() + 6) % 7;
  const today = dayjs().format('YYYY-MM-DD');
  const cells = useMemo(() => {
    const out: ({ date: string; code?: string; weekend: boolean } | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = currentMonth.date(d).format('YYYY-MM-DD');
      out.push({ date, code: calendar[date], weekend: (currentMonth.date(d).day() + 6) % 7 >= 5 });
    }
    return out;
  }, [currentMonth, firstDayOfWeek, daysInMonth, calendar]);

  const selectedCode = calendar[selectedDate];
  const selectedMeta = tabelCodeMeta(selectedCode);
  const selectedLate = lateMinutes[selectedDate] ?? 0;
  const hasData = Object.keys(calendar).length > 0;
  const time = (iso?: string) => (iso ? dayjs(iso).format('HH:mm') : '--:--');

  const calendarCard = (
    <Card>
      <MonthNavigator month={currentMonth} onChange={goToMonth} />
      <View style={styles.weekRow}>
        {WEEKDAY_INDICES.map((d) => (
          <Text key={d} variant="caption" tone="subtle" style={styles.weekDay}>
            {weekdayNameShort(d)}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
          const selected = day.date === selectedDate;
          const dot = day.code ? tabelCodeColor(day.code, colors) : undefined;
          return (
            <Pressable
              key={day.date}
              testID={`tabel-day-${day.date}`}
              accessibilityRole="button"
              onPress={() => setSelectedDate(day.date)}
              style={[
                styles.cell,
                day.date === today && { borderWidth: 1, borderColor: colors.brand },
                selected && { backgroundColor: colors.brandSoft },
              ]}
            >
              <Text variant="label" tone={selected ? 'brand' : day.weekend ? 'subtle' : 'fg'}>
                {dayjs(day.date).date()}
              </Text>
              <View style={[styles.dot, dot ? { backgroundColor: dot } : null]} />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );

  const dayCard = hasData && (
    <Card title={t('timesheet.dayTitle')}>
      <View style={styles.dayRow}>
        <View style={[styles.letter, { backgroundColor: tabelCodeColor(selectedCode, colors) }]}>
          <Text variant="label" style={{ color: colors.fgOnBrand }}>
            {selectedMeta.letter}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="label">{selectedCode ? t(selectedMeta.labelKey) : '—'}</Text>
          <Text variant="caption" tone="muted">
            {dayjs(selectedDate).format('D MMMM YYYY')}
          </Text>
        </View>
        {selectedLate > 0 && (
          <Text variant="caption" tone="danger">
            {t('timesheet.lateByMinutes', { value: selectedLate })}
          </Text>
        )}
      </View>
      <View style={[styles.entryExit, { borderTopColor: colors.border }]}>
        <View style={styles.entryItem}>
          <Text variant="number">{time(dayDetail.firstEntry?.happen_time)}</Text>
          <Text variant="caption" tone="muted">
            {t('timesheet.entry')}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.entryItem}>
          <Text variant="number">{time(dayDetail.lastExit?.happen_time)}</Text>
          <Text variant="caption" tone="muted">
            {t('timesheet.exit')}
          </Text>
        </View>
      </View>
    </Card>
  );

  const summaryTiles = hasData && (
    <View style={styles.tiles}>
      {(
        [
          { id: 'tabel-present', label: t('timesheet.present'), value: summary.present, icon: 'check', tint: 'green' },
          { id: 'tabel-late', label: t('timesheet.late'), value: summary.late, icon: 'clock', tint: 'amber' },
          { id: 'tabel-absent', label: t('timesheet.absent'), value: summary.absent, icon: 'close', tint: 'pink' },
          {
            id: 'tabel-hours',
            label: t('timesheet.hoursLabel'),
            value: t('timesheet.hoursValue', { value: summary.hours }),
            icon: 'chart',
            tint: 'violet',
          },
        ] as const
      ).map((x) => (
        <View key={x.id} style={styles.tile}>
          <StatTile testID={x.id} label={x.label} value={x.value} icon={x.icon} tint={x.tint} />
        </View>
      ))}
    </View>
  );

  const details = hasData && (
    <>
      {!!row?.working_hours_start && (
        <Card title={t('timesheet.scheduleTitle')}>
          <View style={styles.schedule}>
            <View style={styles.flex}>
              <Text variant="label">{timeRange(row.working_hours_start, row.working_hours_end)}</Text>
              <Text variant="caption" tone="muted">
                {t('timesheet.workDay')}
              </Text>
            </View>
            {!!row.lunch_start_time && (
              <View style={styles.flex}>
                <Text variant="label">{timeRange(row.lunch_start_time, row.lunch_end_time)}</Text>
                <Text variant="caption" tone="muted">
                  {t('timesheet.break')}
                </Text>
              </View>
            )}
          </View>
        </Card>
      )}
      <Card title={t('timesheet.logTitle')}>
        {dayDetail.journal.length === 0 ? (
          <Text variant="body" tone="muted" style={styles.center}>
            {t('timesheet.logEmpty')}
          </Text>
        ) : (
          // Qatorda GES/obyekt, Face ID surati va xarita ham (AttendanceEventRow).
          dayDetail.journal.map((ev, i) => (
            <AttendanceEventRow
              key={ev.id}
              event={ev}
              locations={locations}
              showBorder={i < dayDetail.journal.length - 1}
            />
          ))
        )}
      </Card>
      {legendCodes.length > 0 && (
        <Card title={t('timesheet.legendTitle')}>
          {legendCodes.map((code) => {
            const meta = tabelCodeMeta(code);
            return (
              <View key={code} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: tabelCodeColor(code, colors) }]} />
                <Text variant="label" style={styles.legendLetter}>
                  {meta.letter}
                </Text>
                <Text variant="body" tone="muted" style={styles.flex}>
                  {t(meta.labelKey)}
                </Text>
              </View>
            );
          })}
        </Card>
      )}
    </>
  );

  return (
    <Screen
      refreshing={isRefetching}
      onRefresh={() => void Promise.all([refetch(), refetchEvents()])}
      edges={embedded ? [] : ['top']}
    >
      {!embedded && <PageHeader title={t('timesheet.myTitle')} subtitle={t('timesheet.mySubtitle')} />}
      {isError ? (
        <ErrorState title={t('timesheet.loadError')} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton height={320} />
      ) : (
        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={[styles.col, wide && styles.colWide]}>
            {calendarCard}
            {!hasData && <EmptyState title={t('timesheet.empty')} />}
            {dayCard}
          </View>
          <View style={[styles.col, wide && styles.colWide]}>
            {summaryTiles}
            {details}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { gap: 12 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { gap: 12 },
  colWide: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center', paddingVertical: 16 },
  weekRow: { flexDirection: 'row', marginTop: 8, marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  letter: {
    minWidth: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  entryExit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryItem: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: 1, height: 36 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  schedule: { flexDirection: 'row', gap: 20 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLetter: { width: 28 },
});
