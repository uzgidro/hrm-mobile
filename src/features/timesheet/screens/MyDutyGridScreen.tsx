import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { LoadingView, ErrorState, EmptyState } from '@/components/StateViews';
import { monthName } from '@/i18n/dates';
import type { Employee } from '@/types';
import {
  myNavbatchilikGroupsQuery, groupMembersQuery, groupScheduleDaysQuery,
  departmentMembersQuery, departmentScheduleDaysQuery,
} from '../api/queries';
import { useScheduleDayMutations } from '../api/mutations';
import {
  dutyDayMeta, shiftColor, shiftIndexIn, scheduleDayMap, nextDutyCellState, backendWeekdayToDayjs,
  deptCellLabel, deptCellColorKey, nextDeptCellState,
} from '../duty';

// Variant 1 of "дежурства других": a member × day-of-month grid, mirroring the
// web NavbatchilikGrid. Rows = the roster, columns = month days, cell = shift
// chip / day-off / empty, tappable to cycle the duty state. Sticky name column
// with a horizontally scrolling day area (both halves share ROW_HEIGHT).
//
// Two navbatchilik modes, exactly as on the web NavbatchilikPage:
//   * DEPARTMENT (department.has_navbatchilik) — rows are the department's
//     employees, cells cycle K → T → D. Takes precedence when both apply, same
//     as the web (`groupMember = !deptNavbatchilik && is_navbatchi`).
//   * GROUP (navbatchilik group membership) — rows are the group roster, cells
//     cycle through the group's shifts.
// Dept mode used to be missing entirely: the screen keyed off `groups` alone, so
// a department duty roster rendered as an empty state and never appeared.
const NAME_COL_WIDTH = 128;
const CELL_WIDTH = 40;
const ROW_HEIGHT = 44;

// See MyDutyScreen: `embedded` renders body-only under NavbatchilikScreen.
export default function MyDutyGridScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const monthKey = currentMonth.format('YYYY-MM');
  const user = useAuthStore((s) => s.user);
  const department = user?.employee?.department;
  // Dept mode wins when the employee is both in a duty department and a group.
  const deptId = department?.has_navbatchilik ? department.id : undefined;
  const deptMode = !!deptId;

  const groupsQ = useQuery({ ...myNavbatchilikGroupsQuery(), enabled: !deptMode });
  const groups = useMemo(() => groupsQ.data ?? [], [groupsQ.data]);
  const selectedGroup = groups[Math.min(selectedGroupIdx, Math.max(0, groups.length - 1))];

  const membersQ = useQuery({ ...groupMembersQuery(selectedGroup?.id ?? 0), enabled: !deptMode && !!selectedGroup });
  const groupDaysQ = useQuery({ ...groupScheduleDaysQuery(monthKey, selectedGroup?.id), enabled: !deptMode && !!selectedGroup });
  const deptMembersQ = useQuery(departmentMembersQuery(deptId));
  const deptDaysQ = useQuery(departmentScheduleDaysQuery(monthKey, deptId));

  const rosterQ = deptMode ? deptMembersQ : membersQ;
  const daysQ = deptMode ? deptDaysQ : groupDaysQ;
  const members: Employee[] = rosterQ.data ?? [];
  const dayMap = useMemo(() => scheduleDayMap(daysQ.data ?? []), [daysQ.data]);

  const monthDays = useMemo(() => {
    const n = currentMonth.daysInMonth();
    return Array.from({ length: n }, (_, i) => currentMonth.date(i + 1).format('YYYY-MM-DD'));
  }, [currentMonth]);

  // Group mode restricts taps to the group's weekdays; a department is on duty
  // every day, so dept mode has no weekday restriction (web parity: isGroupDay
  // returns true whenever weekdays is null).
  const groupWeekdays = useMemo(
    () => new Set(deptMode ? [] : (selectedGroup?.weekdays ?? []).map(backendWeekdayToDayjs)),
    [deptMode, selectedGroup],
  );
  const groupHasDam = (selectedGroup?.shifts?.length ?? 0) >= 1;
  const { assign, clear, isPending } = useScheduleDayMutations(monthKey, selectedGroup?.id, deptId);

  const onCellPress = useCallback(
    async (emp: Employee, dateStr: string) => {
      if (isPending) return;
      if (groupWeekdays.size > 0 && !groupWeekdays.has(dayjs(dateStr).day())) return; // non-group day
      const entry = dayMap[`${emp.id}_${dateStr}`];
      const action = deptMode
        ? nextDeptCellState(entry)
        : nextDutyCellState(entry, selectedGroup?.shifts, groupHasDam);
      try {
        if (action.kind === 'noop') return;
        if (action.kind === 'clear') { if (entry?.id != null) await clear(entry.id); return; }
        await assign(
          {
            employee_id: emp.id,
            schedule_date: dateStr,
            schedule_type: action.shiftName ?? null,
            working_hours_start: action.start ? `${action.start}:00` : null,
            working_hours_end: action.end ? `${action.end}:00` : null,
            is_day_off: action.isDayOff ?? false,
          },
          entry?.id,
        );
      } catch {
        Alert.alert(t('timesheet.dutySaveError'));
      }
    },
    [assign, clear, dayMap, deptMode, groupHasDam, groupWeekdays, isPending, selectedGroup, t],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all(
      deptMode
        ? [deptMembersQ.refetch(), deptDaysQ.refetch()]
        : [
            groupsQ.refetch(),
            selectedGroup ? membersQ.refetch() : Promise.resolve(),
            selectedGroup ? groupDaysQ.refetch() : Promise.resolve(),
          ],
    );
    setRefreshing(false);
  }, [deptMode, deptMembersQ, deptDaysQ, groupsQ, membersQ, groupDaysQ, selectedGroup]);

  // In dept mode the roster IS the screen — there are no groups to wait on.
  const isLoading = deptMode ? deptMembersQ.isLoading : groupsQ.isLoading;
  const isError = deptMode ? deptMembersQ.isError || deptDaysQ.isError : groupsQ.isError;
  const showEmpty = !isLoading && !isError && (deptMode ? members.length === 0 : groups.length === 0);

  const renderRoot = (children: ReactNode) =>
    embedded ? (
      <View style={{ flex: 1 }}>{children}</View>
    ) : (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="chevronLeft" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('timesheet.dutyGridTitle')}</Text>
            <Text style={styles.headerSub}>{t('timesheet.dutyGridSubtitle')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        {children}
      </Screen>
    );

  return renderRoot(
    <>
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('timesheet.dutyLoadError')} onRetry={() => { void onRefresh(); }} />
      ) : showEmpty ? (
        <EmptyState icon="calendar" title={t('timesheet.dutyEmpty')} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
        >
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}>
              <Icon name="chevronLeft" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthName(currentMonth.month())} {currentMonth.year()}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(currentMonth.add(1, 'month'))}>
              <Icon name="chevronRight" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!deptMode && groups.length > 1 && (
            <View style={styles.tabsRow}>
              {groups.map((g, i) => (
                <TouchableOpacity key={g.id} style={[styles.tab, i === selectedGroupIdx && styles.tabActive]} onPress={() => setSelectedGroupIdx(i)}>
                  <Text style={[styles.tabText, i === selectedGroupIdx && styles.tabTextActive]} numberOfLines={1}>{g.name ?? `#${g.id}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {rosterQ.isLoading ? (
            <Text style={styles.hint}>…</Text>
          ) : members.length === 0 ? (
            <Text style={styles.hint}>{t('timesheet.dutyMonthEmpty')}</Text>
          ) : (
            <View style={[styles.gridScroll, { flexDirection: 'row' }]}>
              {/* Fixed name column: header name-cell + each member's name-cell. */}
              <View>
                <View style={[styles.nameCell, styles.headerCell]}>
                  <Text style={styles.gridHeaderText} numberOfLines={1}>{t('timesheet.membersTitle')}</Text>
                </View>
                {members.map((emp) => (
                  <View key={emp.id} style={styles.nameCell}>
                    <Text style={styles.nameText} numberOfLines={2}>{emp.legal_name}</Text>
                  </View>
                ))}
              </View>

              {/* Horizontally scrolling day area: header day-row + member day-rows. */}
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={styles.gridRow}>
                    {monthDays.map((d) => {
                      const dj = dayjs(d);
                      const isWeekend = ((dj.day() + 6) % 7) >= 5;
                      return (
                        <View key={d} style={[styles.dayCell, styles.headerCell]}>
                          <Text style={[styles.gridHeaderText, isWeekend && styles.weekendText]}>{dj.date()}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {members.map((emp) => (
                    <View key={emp.id} style={styles.gridRow}>
                      {monthDays.map((d) => {
                        const entry = dayMap[`${emp.id}_${d}`];
                        // Dept mode has its own K/T/D letters + colors; group
                        // mode colors by the shift's index in the group.
                        let label: string | null = null;
                        let bg = colors.primaryLight;
                        if (entry && deptMode) {
                          label = deptCellLabel(entry);
                          bg = colors[deptCellColorKey(entry)];
                        } else if (entry) {
                          const meta = dutyDayMeta(entry);
                          const sIdx = shiftIndexIn(selectedGroup?.shifts, meta.label);
                          label = meta.isDayOff ? t('timesheet.dutyDayOff') : (meta.label ?? '•');
                          bg = meta.isDayOff
                            ? colors.textMuted
                            : sIdx >= 0 ? shiftColor(sIdx, colors) : colors.primaryLight;
                        }
                        return (
                          <TouchableOpacity key={d} style={styles.dayCell} activeOpacity={0.7} onPress={() => onCellPress(emp, d)}>
                            {label !== null ? (
                              <View style={[styles.cellChip, { backgroundColor: bg }]}>
                                <Text style={styles.cellChipText} numberOfLines={1}>{label}</Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </>,
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    navBtn: { width: 40, height: 40, backgroundColor: c.card, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.cardBorder },
    monthTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.primaryLight },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary, paddingHorizontal: 8 },
    tabTextActive: { color: c.primaryLight },

    hint: { color: c.textMuted, fontSize: 14, paddingVertical: 12, textAlign: 'center' },

    gridScroll: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden' },
    gridRow: { flexDirection: 'row', alignItems: 'stretch' },
    headerCell: { backgroundColor: c.bg, height: ROW_HEIGHT },
    nameCell: { width: NAME_COL_WIDTH, height: ROW_HEIGHT, paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', borderRightWidth: 1, borderRightColor: c.cardBorder, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    nameText: { fontSize: 12, fontWeight: '600', color: c.text },
    gridHeaderText: { fontSize: 12, fontWeight: '700', color: c.textSecondary, textAlign: 'center' },
    weekendText: { color: c.primaryLight },
    dayCell: { width: CELL_WIDTH, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRightWidth: 1, borderRightColor: c.cardBorder, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    cellChip: { minWidth: 28, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 3, alignItems: 'center' },
    cellChipText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  });
