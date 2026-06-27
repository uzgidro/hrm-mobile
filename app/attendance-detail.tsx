import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/uz';
import Svg, { Circle, G } from 'react-native-svg';
import { useAuthStore } from '../src/store/authStore';
import { usePrefsStore } from '../src/store/prefsStore';
import { apiClient } from '../src/api/client';
import { WORK_LEAVES } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { Employee, AttendanceEvent, WorkLeave } from '../src/types';
import { fetchAllAttendanceEvents, attendanceQueryKey } from '../src/utils/attendance';
import { fetchAllEmployees, employeesQueryKey } from '../src/utils/employees';
import { Icon } from '../src/components/Icon';

dayjs.locale('uz');

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const DAYS_UZ = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'];

type StatusGroup = 'present' | 'late' | 'onLeave' | 'absent';

interface GroupedEmployee { employee: Employee; entryTime?: string; exitTime?: string; leaveName?: string; }
interface Section { key: StatusGroup; items: GroupedEmployee[]; }

const SECTION_LABEL: Record<StatusGroup, string> = {
  present: 'Keldi', late: 'Kechikkan', onLeave: "So'rov yuborilgan", absent: 'Kelmagan',
};
const SECTION_EMPTY: Record<StatusGroup, string> = {
  present: "Kelgan xodim yo'q", late: "Kechikkan xodim yo'q", onLeave: "Ruxsat so'rovchi yo'q", absent: '',
};
const SECTION_ORDER: StatusGroup[] = ['present', 'late', 'onLeave', 'absent'];

function sectionColor(key: StatusGroup, c: ThemeColors) {
  if (key === 'present') return c.present;
  if (key === 'late') return c.warning;
  if (key === 'onLeave') return c.primaryLight;
  return c.error;
}

function EmployeeAvatar({ emp, size = 44, c }: { emp: Employee; size?: number; c: ThemeColors }) {
  const r = size / 2;
  if (emp.photo_path) {
    return <Image source={{ uri: emp.photo_path }} style={{ width: size, height: size, borderRadius: r }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: c.primaryLight }}>{(emp.legal_name || 'X').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function DonutChart({ total, present, late, onLeave, activeFilter, onFilter, styles, c }: {
  total: number; present: number; late: number; onLeave: number;
  activeFilter: StatusGroup | null; onFilter: (k: StatusGroup | null) => void; styles: any; c: ThemeColors;
}) {
  const absent = Math.max(0, total - present - late - onLeave);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const R = 68;
  const stroke = 24;
  const circ = 2 * Math.PI * R;
  const rotate = `rotate(-90, ${cx}, ${cy})`;

  const allSegs: { value: number; color: string; key: StatusGroup }[] = [
    { value: present, color: c.present, key: 'present' },
    { value: late, color: c.warning, key: 'late' },
    { value: onLeave, color: c.primaryLight, key: 'onLeave' },
    { value: absent, color: c.error, key: 'absent' },
  ];
  const segments = allSegs.filter((s) => s.value > 0 && total > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, offset };
    offset += dash;
    return arc;
  });

  const legendItems = [
    { key: 'present' as StatusGroup, count: present, color: c.present, label: 'keldi' },
    { key: 'late' as StatusGroup, count: late, color: c.warning, label: 'kechikkan' },
    { key: 'absent' as StatusGroup, count: absent, color: c.error, label: 'kelmagan' },
    { key: 'onLeave' as StatusGroup, count: onLeave, color: c.primaryLight, label: "so'rov" },
  ].filter((it) => it.count > 0 || it.key === 'absent');

  const handleFilter = (key: StatusGroup) => onFilter(activeFilter === key ? null : key);

  return (
    <View style={styles.chartOuter}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <G>
            <Circle cx={cx} cy={cy} r={R} fill="none" stroke={c.cardBorder} strokeWidth={stroke} />
            {arcs.map((arc, i) => (
              <Circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={arc.color}
                strokeWidth={activeFilter === null || activeFilter === arc.key ? stroke : stroke * 0.6}
                strokeDasharray={`${arc.dash} ${circ - arc.dash}`} strokeDashoffset={-arc.offset} transform={rotate}
                opacity={activeFilter === null || activeFilter === arc.key ? 1 : 0.3} onPress={() => handleFilter(arc.key)} />
            ))}
          </G>
        </Svg>
        <View style={styles.chartCenter}>
          <Text style={styles.chartTotal}>{activeFilter ? (allSegs.find((s) => s.key === activeFilter)?.value ?? total) : total}</Text>
          {activeFilter && <Text style={styles.chartFilterLabel}>tozalash uchun bosing</Text>}
        </View>
      </View>
      <View style={styles.legend}>
        {legendItems.map((it) => {
          const isActive = activeFilter === it.key;
          return (
            <TouchableOpacity key={it.key}
              style={[styles.legendItem, isActive && { backgroundColor: it.color + '18', borderRadius: 8, paddingHorizontal: 4 }]}
              onPress={() => handleFilter(it.key)} activeOpacity={0.7}>
              <View style={[styles.legendDot, { backgroundColor: it.color, opacity: !activeFilter || isActive ? 1 : 0.35 }]} />
              <View style={{ opacity: !activeFilter || isActive ? 1 : 0.4 }}>
                <Text style={styles.legendCount}>{it.count}</Text>
                <Text style={styles.legendLabel}>{it.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StatusSection({ section, styles, c }: { section: Section; styles: any; c: ThemeColors }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 5;
  const shown = expanded ? section.items : section.items.slice(0, PREVIEW);
  const hasMore = section.items.length > PREVIEW;

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={styles.statusTitleRow}>
          <View style={[styles.statusDot, { backgroundColor: sectionColor(section.key, c) }]} />
          <Text style={styles.statusTitle}>{SECTION_LABEL[section.key]} ({section.items.length})</Text>
        </View>
        {hasMore && (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
            <Text style={styles.linkText}>{expanded ? "Yig'ish" : "Barchasini ko'rsatish"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {section.items.length === 0 ? (
        <Text style={styles.emptySection}>{SECTION_EMPTY[section.key]}</Text>
      ) : (
        shown.map((row, idx) => (
          <TouchableOpacity key={row.employee.id}
            style={[styles.empRow, idx < shown.length - 1 && styles.empRowBorder]}
            onPress={() => router.push({ pathname: '/profile-detail', params: { id: row.employee.id } })} activeOpacity={0.7}>
            <EmployeeAvatar emp={row.employee} size={48} c={c} />
            <View style={styles.empInfo}>
              <Text style={styles.empName} numberOfLines={1}>{row.employee.legal_name}</Text>
              <Text style={styles.empPosition} numberOfLines={1}>{row.employee.job_position?.name ?? row.employee.department?.name ?? '—'}</Text>
            </View>
            {row.entryTime && (
              <View style={styles.timeTag}>
                <Icon name="clock" size={14} color={c.textMuted} />
                <Text style={styles.timeTagText}>{dayjs(row.entryTime).format('HH:mm')}</Text>
              </View>
            )}
            {row.leaveName && <Text style={styles.leaveTag} numberOfLines={1}>{row.leaveName}</Text>}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

export default function AttendanceDetailScreen() {
  const { user } = useAuthStore();
  const { onlySubordinates } = usePrefsStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const myId = user?.employee?.id;
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;

  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sectionFilter, setSectionFilter] = useState<StatusGroup | null>(null);
  const selDay = dayjs(selectedDate);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const dateLabel = `${selDay.date()} ${MONTHS_UZ[selDay.month()]} ${selDay.year()} (${DAYS_UZ[selDay.day()]})`;

  const prevDay = () => setSelectedDate(selDay.subtract(1, 'day').format('YYYY-MM-DD'));
  const nextDay = () => setSelectedDate(selDay.add(1, 'day').format('YYYY-MM-DD'));

  const results = useQueries({
    queries: [
      { queryKey: employeesQueryKey(orgBranchId), queryFn: () => fetchAllEmployees(orgBranchId), staleTime: 5 * 60 * 1000 },
      { queryKey: attendanceQueryKey(selectedDate, orgBranchId), queryFn: () => fetchAllAttendanceEvents(selectedDate, orgBranchId), staleTime: 3 * 60 * 1000 },
      {
        queryKey: ['team-leaves', selectedDate],
        queryFn: () => apiClient.get(WORK_LEAVES, { params: { size: 100 } }).then((r) => {
          const d = r.data as any; return (Array.isArray(d) ? d : (d.items ?? [])) as WorkLeave[];
        }),
        staleTime: 2 * 60 * 1000,
      },
    ],
  });

  const [empQ, attQ, leavesQ] = results;
  const isLoading = results.some((r) => r.isLoading);

  const { sections, totalEmp } = useMemo(() => {
    let employees: Employee[] = empQ.data?.items ?? [];
    if (onlySubordinates && myId) employees = employees.filter((e) => e.supervisor_id === myId);
    const events: AttendanceEvent[] = attQ.data?.items ?? [];
    const workLeaves: WorkLeave[] = leavesQ.data ?? [];

    const empIdSet = new Set(employees.map((e) => e.id));
    const firstEntry = new Map<number, string>();
    const lastExit = new Map<number, string>();

    for (const ev of events) {
      const eid = ev.employee_id;
      if (!eid || !empIdSet.has(eid)) continue;
      const exEntry = firstEntry.get(eid);
      if (!exEntry || ev.happen_time < exEntry) firstEntry.set(eid, ev.happen_time);
      const exExit = lastExit.get(eid);
      if (!exExit || ev.happen_time > exExit) lastExit.set(eid, ev.happen_time);
    }

    const dayStart = dayjs(selectedDate).startOf('day');
    const dayEnd = dayjs(selectedDate).endOf('day');
    const leaveMap = new Map<number, string>();
    for (const l of workLeaves) {
      if (!l.employee?.id) continue;
      const s = dayjs(l.start_date);
      const e = dayjs(l.end_date);
      if (s.isBefore(dayEnd) && e.isAfter(dayStart)) leaveMap.set(l.employee.id, l.type ?? 'Ruxsat');
    }

    const buckets: Record<StatusGroup, GroupedEmployee[]> = { present: [], late: [], onLeave: [], absent: [] };

    for (const emp of employees) {
      const entry = firstEntry.get(emp.id);
      const exit = lastExit.get(emp.id);
      const leaveName = leaveMap.get(emp.id);
      if (leaveName && !entry) { buckets.onLeave.push({ employee: emp, leaveName }); continue; }
      if (!entry) { buckets.absent.push({ employee: emp }); continue; }
      if (emp.working_hours_start) {
        const expected = dayjs(`${selectedDate}T${emp.working_hours_start}`);
        if (dayjs(entry).diff(expected, 'minute') > 5) { buckets.late.push({ employee: emp, entryTime: entry, exitTime: exit }); continue; }
      }
      buckets.present.push({ employee: emp, entryTime: entry, exitTime: exit });
    }

    return {
      sections: SECTION_ORDER.map((key) => ({ key, items: buckets[key] })),
      totalEmp: employees.length,
    };
  }, [empQ.data, attQ.data, leavesQ.data, selectedDate, onlySubordinates, myId]);

  const presentCount = sections.find((s) => s.key === 'present')?.items.length ?? 0;
  const lateCount = sections.find((s) => s.key === 'late')?.items.length ?? 0;
  const onLeaveCount = sections.find((s) => s.key === 'onLeave')?.items.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Davomat</Text>
          <Text style={styles.headerDate}>{dateLabel}</Text>
        </View>
        <View style={styles.navBtns}>
          <TouchableOpacity onPress={prevDay} style={styles.navBtn}><Icon name="chevronLeft" size={20} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity onPress={nextDay} style={[styles.navBtn, isToday && styles.navBtnDisabled]} disabled={isToday}>
            <Icon name="chevronRight" size={20} color={isToday ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrapper}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {onlySubordinates && (
            <View style={styles.filterNotice}>
              <Icon name="users" size={16} color={colors.primaryLight} />
              <Text style={styles.filterNoticeText}>Faqat bo'ysunuvchilar</Text>
            </View>
          )}
          <View style={styles.chartCard}>
            <DonutChart total={totalEmp} present={presentCount} late={lateCount} onLeave={onLeaveCount}
              activeFilter={sectionFilter} onFilter={setSectionFilter} styles={styles} c={colors} />
          </View>

          {sections
            .filter((sec) => sectionFilter ? sec.key === sectionFilter : sec.key !== 'absent' || sec.items.length > 0)
            .map((sec) => <StatusSection key={sec.key} section={sec} styles={styles} c={colors} />)}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerCenter: { flex: 1, paddingLeft: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: c.text },
    headerDate: { fontSize: 13, color: c.textSecondary, marginTop: 1 },
    navBtns: { flexDirection: 'row', gap: 6 },
    navBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    navBtnDisabled: { opacity: 0.35 },
    navArrow: { fontSize: 20, color: c.text, fontWeight: '600', lineHeight: 24 },
    navArrowDisabled: { color: c.textMuted },

    content: { paddingHorizontal: 16, paddingTop: 16 },
    filterNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
    filterNoticeText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },

    chartCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 14, paddingVertical: 16 },
    chartOuter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    chartWrapper: { position: 'relative', width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
    chartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    chartTotal: { fontSize: 30, fontWeight: '800', color: c.text },
    chartFilterLabel: { fontSize: 9, color: c.textMuted, marginTop: 2 },
    legend: { flex: 1, paddingLeft: 20, gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendDot: { width: 13, height: 13, borderRadius: 7 },
    legendCount: { fontSize: 20, fontWeight: '700', color: c.text },
    legendLabel: { fontSize: 12, color: c.textSecondary, marginTop: 1 },

    statusCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 14, overflow: 'hidden' },
    statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    linkText: { fontSize: 13, color: c.primaryLight, fontWeight: '600' },
    emptySection: { color: c.textMuted, fontSize: 13, paddingHorizontal: 16, paddingVertical: 12 },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    empRowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '600', color: c.text },
    empPosition: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    timeTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    timeTagArrow: { fontSize: 11, color: c.textMuted },
    timeTagText: { fontSize: 13, fontWeight: '700', color: c.text },
    leaveTag: { fontSize: 11, color: c.primaryLight, fontWeight: '600', maxWidth: 90, textAlign: 'right' },
  });
