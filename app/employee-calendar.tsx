import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../src/api/client';
import { TURNSTILE_ATTENDANCE_EVENTS, EMPLOYEE_DETAIL } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { AttendanceEvent, EmployeeFull } from '../src/types';

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const DAYS_SHORT = ['du', 'se', 'chor', 'pay', 'ju', 'sha', 'ya'];

interface DayStat { date: string; isWeekend: boolean; isToday: boolean; hasAttendance: boolean; isAbsent: boolean; }

function DonutChart({ attended, total, size = 160, c }: { attended: number; total: number; size?: number; c: ThemeColors }) {
  const radius = 58;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const rotate = `rotate(-90, ${cx}, ${cy})`;
  const attendedDash = total > 0 ? circumference * (attended / total) : 0;
  const missedDash = total > 0 ? circumference * ((total - attended) / total) : 0;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={c.cardBorder} strokeWidth={strokeWidth} />
      {attendedDash > 0 && (
        <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={c.success} strokeWidth={strokeWidth}
          strokeDasharray={`${attendedDash} ${circumference - attendedDash}`} strokeDashoffset={0} strokeLinecap="round" transform={rotate} />
      )}
      {missedDash > 0 && (
        <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={c.absent} strokeWidth={strokeWidth}
          strokeDasharray={`${missedDash} ${circumference - missedDash}`} strokeDashoffset={-attendedDash} strokeLinecap="round" transform={rotate} />
      )}
      <Circle cx={cx} cy={cy} r={radius - strokeWidth - 4} fill={c.card} />
    </Svg>
  );
}

export default function EmployeeCalendarScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const employeeId = Number(params.id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);

  const monthKey = currentMonth.format('YYYY-MM');

  const { data: employee } = useQuery<EmployeeFull>({
    queryKey: ['employee', employeeId],
    queryFn: () => apiClient.get<EmployeeFull>(EMPLOYEE_DETAIL(employeeId)).then((r) => r.data),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [], refetch } = useQuery<AttendanceEvent[]>({
    queryKey: ['attendance', employeeId, monthKey],
    queryFn: () =>
      apiClient.get(TURNSTILE_ATTENDANCE_EVENTS, {
        params: { date_from: currentMonth.format('YYYY-MM-DD'), date_to: currentMonth.endOf('month').format('YYYY-MM-DD'), employee_id: employeeId },
      }).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d?.items ?? []); }),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const eventsByDate = events.reduce<Record<string, AttendanceEvent[]>>((acc, ev) => {
    const d = dayjs(ev.happen_time).format('YYYY-MM-DD');
    if (!acc[d]) acc[d] = [];
    acc[d].push(ev);
    return acc;
  }, {});

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = (currentMonth.day() + 6) % 7;

  const calendarDays: (DayStat | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = currentMonth.date(d).format('YYYY-MM-DD');
    const dayOfWeek = (currentMonth.date(d).day() + 6) % 7;
    const isWeekend = dayOfWeek >= 5;
    const isToday = dateStr === dayjs().format('YYYY-MM-DD');
    const dayEvents = eventsByDate[dateStr] || [];
    const isFuture = dayjs(dateStr).isAfter(dayjs(), 'day');
    calendarDays.push({ date: dateStr, isWeekend, isToday, hasAttendance: dayEvents.length > 0, isAbsent: !isWeekend && dayEvents.length === 0 && !isFuture });
  }

  const selectedEvents = eventsByDate[selectedDate] || [];
  const entryEvents = selectedEvents.filter((e) => e.direction_type === 'entrance' || e.check_in_out_type === 1).sort((a, b) => dayjs(a.happen_time).diff(dayjs(b.happen_time)));
  const exitEvents = selectedEvents.filter((e) => e.direction_type === 'exit' || e.check_in_out_type === 2).sort((a, b) => dayjs(a.happen_time).diff(dayjs(b.happen_time)));
  const selEntry = entryEvents[0];
  const selExit = exitEvents[exitEvents.length - 1];

  const workDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => {
    const dw = (currentMonth.date(d).day() + 6) % 7;
    return dw < 5 && !currentMonth.date(d).isAfter(dayjs(), 'day');
  }).length;
  const attendedDays = Object.keys(eventsByDate).filter((dt) => ((dayjs(dt).day() + 6) % 7) < 5).length;
  const missedDays = Math.max(0, workDays - attendedDays);
  const remainingWorkDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => {
    const dt = currentMonth.date(d);
    const dw = (dt.day() + 6) % 7;
    return dw < 5 && dt.isAfter(dayjs(), 'day');
  }).length;

  const displayName = employee?.legal_name ?? params.name ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.headerSub}>Davomat</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        <View style={styles.card}>
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}><Text style={styles.navBtnText}>{'<'}</Text></TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS_UZ[currentMonth.month()]} {currentMonth.year()}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.add(1, 'month'))}><Text style={styles.navBtnText}>{'>'}</Text></TouchableOpacity>
          </View>

          <View style={styles.weekRow}>{DAYS_SHORT.map((d) => <Text key={d} style={styles.weekDayLabel}>{d}</Text>)}</View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, i) => {
              if (!day) return <View key={`empty-${i}`} style={styles.dayCell} />;
              const isSelected = day.date === selectedDate;
              return (
                <TouchableOpacity key={day.date}
                  style={[styles.dayCell, day.isWeekend && styles.dayCellWeekend, day.isAbsent && styles.dayCellAbsent, day.isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDate(day.date)} activeOpacity={0.75}>
                  <Text style={[styles.dayText, day.isWeekend && styles.dayTextWeekend, day.isAbsent && styles.dayTextAbsent, (day.isToday || isSelected) && styles.dayTextToday]}>
                    {dayjs(day.date).date().toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.entryExitRow}>
            <View style={styles.entryExitItem}>
              <Text style={styles.entryExitTime}>{selEntry ? dayjs(selEntry.happen_time).format('HH:mm') : '--:--'}</Text>
              <Text style={styles.entryExitLabel}>kirish</Text>
            </View>
            <View style={styles.entryExitDivider} />
            <View style={styles.entryExitItem}>
              <Text style={styles.entryExitTime}>{selExit ? dayjs(selExit.happen_time).format('HH:mm') : '--:--'}</Text>
              <Text style={styles.entryExitLabel}>chiqish</Text>
            </View>
          </View>
        </View>

        {employee?.working_hours_start && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}><Text style={styles.cardIcon}>📊</Text><Text style={styles.cardTitle}>Ish jadvali</Text></View>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleItem}>
                <Text style={styles.scheduleValue}>{employee.working_hours_start} - {employee.working_hours_end}</Text>
                <Text style={styles.scheduleLabel}>ish kuni</Text>
              </View>
              {employee.lunch_start_time && (
                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleValue}>{employee.lunch_start_time} - {employee.lunch_end_time}</Text>
                  <Text style={styles.scheduleLabel}>tanaffus</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}><Text style={styles.cardIcon}>🎯</Text><Text style={styles.cardTitle}>Qaydnoma</Text></View>
          {selectedEvents.length === 0 ? (
            <Text style={styles.emptyText}>Ro'yxat bo'sh</Text>
          ) : (
            selectedEvents.map((ev) => (
              <View key={ev.id} style={styles.eventRow}>
                <Text style={styles.eventTime}>{dayjs(ev.happen_time).format('HH:mm')}</Text>
                <Text style={styles.eventDir}>{ev.direction_type === 'entrance' ? '➡️ Kirish' : '⬅️ Chiqish'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}><Text style={styles.cardIcon}>💼</Text><Text style={styles.cardTitle}>Oylik statistika {MONTHS_UZ[currentMonth.month()]} {currentMonth.year()}</Text></View>
          <View style={styles.statsRow}>
            <View style={styles.donutWrapper}>
              <DonutChart attended={attendedDays} total={workDays} c={colors} />
              <Text style={styles.donutCenter}>{workDays}</Text>
            </View>
            <View style={styles.statsLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                <Text style={styles.legendText}>{missedDays} ({workDays > 0 ? Math.round((missedDays / workDays) * 100) : 0}%)</Text>
                <Text style={styles.legendLabel}>kelinmadi</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
                <Text style={styles.legendText}>{remainingWorkDays} ({workDays > 0 ? Math.round((remainingWorkDays / workDays) * 100) : 0}%)</Text>
                <Text style={styles.legendLabel}>qoldi</Text>
              </View>
            </View>
          </View>
          <Text style={styles.hoursText}>{workDays * 8} soat</Text>
          <Text style={styles.hoursLabel}>rejaga muvofiq</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 32 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backArrow: { fontSize: 20, color: c.primaryLight, fontWeight: '700' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardIcon: { fontSize: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1 },

    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navBtn: { width: 40, height: 40, backgroundColor: c.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
    navBtnText: { color: c.text, fontSize: 16, fontWeight: '700' },
    monthTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    weekRow: { flexDirection: 'row', marginBottom: 8 },
    weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: c.textMuted, fontWeight: '600' },

    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
    dayCellWeekend: { backgroundColor: c.weekend, borderRadius: 10 },
    dayCellAbsent: { backgroundColor: c.errorSoft, borderRadius: 10 },
    dayCellToday: { backgroundColor: c.primary, borderRadius: 10 },
    dayCellSelected: { borderWidth: 2, borderColor: c.primaryLight, borderRadius: 10 },

    dayText: { fontSize: 14, fontWeight: '600', color: c.text },
    dayTextWeekend: { color: c.primaryLight },
    dayTextAbsent: { color: c.error },
    dayTextToday: { color: '#fff', fontWeight: '800' },

    entryExitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    entryExitItem: { flex: 1, alignItems: 'center', gap: 6 },
    entryExitTime: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: 1 },
    entryExitLabel: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
    entryExitDivider: { width: 1, height: 36, backgroundColor: c.cardBorder, marginHorizontal: 16 },

    scheduleRow: { flexDirection: 'row', gap: 20 },
    scheduleItem: { flex: 1 },
    scheduleValue: { fontSize: 16, fontWeight: '700', color: c.text },
    scheduleLabel: { fontSize: 12, color: c.textMuted, marginTop: 4 },

    emptyText: { color: c.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 14 },
    eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    eventTime: { fontSize: 14, fontWeight: '700', color: c.text, width: 44 },
    eventDir: { fontSize: 13, color: c.textSecondary },

    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 8 },
    donutWrapper: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
    donutCenter: { position: 'absolute', fontSize: 28, fontWeight: '800', color: c.text },
    statsLegend: { flex: 1, gap: 16 },
    legendItem: { gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 18, fontWeight: '700', color: c.text },
    legendLabel: { fontSize: 12, color: c.textSecondary },
    hoursText: { fontSize: 22, fontWeight: '700', color: c.text, marginTop: 12 },
    hoursLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  });
