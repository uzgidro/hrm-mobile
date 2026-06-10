import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/uz';
import Svg, { Circle, G } from 'react-native-svg';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { EMPLOYEES_LIST, TURNSTILE_ATTENDANCE_EVENTS, WORK_LEAVES } from '../src/api/urls';
import { COLORS } from '../src/constants';
import { Employee, AttendanceEvent, WorkLeave } from '../src/types';

dayjs.locale('uz');

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const DAYS_UZ = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'];

interface EmployeePage { items: Employee[]; total: number }
interface AttendancePage { items: AttendanceEvent[]; total: number }

type StatusGroup = 'absent' | 'late' | 'onLeave' | 'present';

interface GroupedEmployee {
  employee: Employee;
  entryTime?: string;
  exitTime?: string;
  leaveName?: string;
}

interface Section {
  key: StatusGroup;
  label: string;
  color: string;
  items: GroupedEmployee[];
}

function EmployeeAvatar({ emp, size = 44 }: { emp: Employee; size?: number }) {
  const r = size / 2;
  if (emp.photo_path) {
    return <Image source={{ uri: emp.photo_path }} style={{ width: size, height: size, borderRadius: r }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: COLORS.primary + '33', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: COLORS.primaryLight }}>
        {(emp.legal_name || 'X').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function DonutChart({ total, present, late, onLeave }: { total: number; present: number; late: number; onLeave: number }) {
  const absent = Math.max(0, total - present - late - onLeave);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const R = 68;
  const stroke = 24;
  const circ = 2 * Math.PI * R;
  const rotate = `rotate(-90, ${cx}, ${cy})`;

  const segments = [
    { value: present, color: COLORS.present },
    { value: late, color: COLORS.warning },
    { value: onLeave, color: COLORS.primaryLight },
    { value: absent, color: '#E5536A' },
  ].filter((s) => s.value > 0 && total > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <View style={styles.chartOuter}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <G>
            <Circle cx={cx} cy={cy} r={R} fill="none" stroke={COLORS.cardBorder} strokeWidth={stroke} />
            {arcs.map((arc, i) => (
              <Circle
                key={i} cx={cx} cy={cy} r={R}
                fill="none" stroke={arc.color} strokeWidth={stroke}
                strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
                strokeDashoffset={-arc.offset}
                transform={rotate}
              />
            ))}
          </G>
        </Svg>
        <View style={styles.chartCenter}>
          <Text style={styles.chartTotal}>{total}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {late > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <View>
              <Text style={styles.legendCount}>{late}</Text>
              <Text style={styles.legendLabel}>kechikkan</Text>
            </View>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E5536A' }]} />
          <View>
            <Text style={styles.legendCount}>{absent}</Text>
            <Text style={styles.legendLabel}>kelmagan</Text>
          </View>
        </View>
        {onLeave > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primaryLight }]} />
            <View>
              <Text style={styles.legendCount}>{onLeave}</Text>
              <Text style={styles.legendLabel}>so'rov yuborilgan</Text>
            </View>
          </View>
        )}
        {present > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.present }]} />
            <View>
              <Text style={styles.legendCount}>{present}</Text>
              <Text style={styles.legendLabel}>keldi</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function StatusSection({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 5;
  const shown = expanded ? section.items : section.items.slice(0, PREVIEW);
  const hasMore = section.items.length > PREVIEW;

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={styles.statusTitleRow}>
          <View style={[styles.statusDot, { backgroundColor: section.color }]} />
          <Text style={styles.statusTitle}>
            {section.label} ({section.items.length})
          </Text>
        </View>
        {hasMore && (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
            <Text style={styles.linkText}>
              {expanded ? 'Yig\'ish' : 'Barchasini ko\'rsatish'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {shown.map((row, idx) => (
        <TouchableOpacity
          key={row.employee.id}
          style={[styles.empRow, idx < shown.length - 1 && styles.empRowBorder]}
          onPress={() => router.push({ pathname: '/profile-detail', params: { id: row.employee.id } })}
          activeOpacity={0.7}
        >
          <EmployeeAvatar emp={row.employee} size={48} />
          <View style={styles.empInfo}>
            <Text style={styles.empName} numberOfLines={1}>{row.employee.legal_name}</Text>
            <Text style={styles.empPosition} numberOfLines={1}>
              {row.employee.job_position?.name ?? row.employee.department?.name ?? '—'}
            </Text>
          </View>
          {row.entryTime && (
            <View style={styles.timeTag}>
              <Text style={styles.timeTagArrow}>→|</Text>
              <Text style={styles.timeTagText}>{dayjs(row.entryTime).format('HH:mm')}</Text>
            </View>
          )}
          {row.leaveName && (
            <Text style={styles.leaveTag} numberOfLines={1}>{row.leaveName}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AttendanceDetailScreen() {
  const { user } = useAuthStore();
  const orgBranchId = user?.employee?.organization_branches?.[0]?.id;
  const today = dayjs().format('YYYY-MM-DD');
  const now = dayjs();
  const dateLabel = `${now.date()} ${MONTHS_UZ[now.month()]} ${now.year()} (${DAYS_UZ[now.day()]})`;

  const results = useQueries({
    queries: [
      {
        queryKey: ['team-employees', orgBranchId],
        queryFn: () =>
          apiClient.get<EmployeePage>(EMPLOYEES_LIST, {
            params: { organization_branch_id: orgBranchId, size: 100, page: 1 },
          }).then((r) => r.data),
        enabled: !!orgBranchId,
      },
      {
        queryKey: ['team-attendance', today],
        queryFn: async () => {
          const all: AttendanceEvent[] = [];
          let page = 1;
          while (true) {
            const res = await apiClient.get<AttendancePage>(TURNSTILE_ATTENDANCE_EVENTS, {
              params: { date_from: today, date_to: today, size: 100, page },
            });
            const d = res.data;
            all.push(...d.items);
            if (all.length >= d.total || d.items.length < 100) break;
            if (page >= 20) break;
            page++;
          }
          return { items: all, total: all.length } as AttendancePage;
        },
        enabled: !!orgBranchId,
      },
      {
        queryKey: ['team-leaves', today],
        queryFn: () =>
          apiClient.get(WORK_LEAVES, { params: { size: 100 } }).then((r) => {
            const d = r.data as any;
            return (Array.isArray(d) ? d : (d.items ?? [])) as WorkLeave[];
          }),
        enabled: !!orgBranchId,
      },
    ],
  });

  const [empQ, attQ, leavesQ] = results;
  const isLoading = results.some((r) => r.isLoading);

  const sections = useMemo<Section[]>(() => {
    const employees: Employee[] = empQ.data?.items ?? [];
    const events: AttendanceEvent[] = attQ.data?.items ?? [];
    const workLeaves: WorkLeave[] = leavesQ.data ?? [];

    // Set of employee IDs in this org branch (for frontend filtering)
    const empIdSet = new Set(employees.map((e) => e.id));

    // Build maps
    const firstEntry = new Map<number, string>();
    const lastExit = new Map<number, string>();

    for (const ev of events) {
      const eid = ev.employee?.id ?? ev.employee_id;
      if (!eid || !empIdSet.has(eid)) continue;
      if (ev.direction_type === 'entrance') {
        const ex = firstEntry.get(eid);
        if (!ex || ev.happen_time < ex) firstEntry.set(eid, ev.happen_time);
      } else {
        const ex = lastExit.get(eid);
        if (!ex || ev.happen_time > ex) lastExit.set(eid, ev.happen_time);
      }
    }

    const todayStart = dayjs(today).startOf('day');
    const todayEnd = dayjs(today).endOf('day');
    const leaveMap = new Map<number, string>();
    for (const l of workLeaves) {
      if (!l.employee?.id) continue;
      const s = dayjs(l.start_date);
      const e = dayjs(l.end_date);
      if (s.isBefore(todayEnd) && e.isAfter(todayStart)) {
        leaveMap.set(l.employee.id, l.type ?? 'Ruxsat');
      }
    }

    const absent: GroupedEmployee[] = [];
    const late: GroupedEmployee[] = [];
    const onLeave: GroupedEmployee[] = [];
    const present: GroupedEmployee[] = [];

    for (const emp of employees) {
      const entry = firstEntry.get(emp.id);
      const exit = lastExit.get(emp.id);
      const leaveName = leaveMap.get(emp.id);

      if (leaveName && !entry) {
        onLeave.push({ employee: emp, leaveName });
        continue;
      }
      if (!entry) {
        absent.push({ employee: emp });
        continue;
      }
      // Has entry — check late
      if (emp.working_hours_start) {
        const expected = dayjs(`${today}T${emp.working_hours_start}`);
        const actual = dayjs(entry);
        if (actual.diff(expected, 'minute') > 5) {
          late.push({ employee: emp, entryTime: entry, exitTime: exit });
          continue;
        }
      }
      present.push({ employee: emp, entryTime: entry, exitTime: exit });
    }

    const result: Section[] = [];
    if (absent.length > 0)
      result.push({ key: 'absent', label: 'Kelmagan', color: '#E5536A', items: absent });
    if (late.length > 0)
      result.push({ key: 'late', label: 'Kechikkan', color: COLORS.warning, items: late });
    if (onLeave.length > 0)
      result.push({ key: 'onLeave', label: "So'rov yuborilgan", color: COLORS.primaryLight, items: onLeave });
    if (present.length > 0)
      result.push({ key: 'present', label: 'Keldi', color: COLORS.present, items: present });
    return result;
  }, [empQ.data, attQ.data, leavesQ.data, today]);

  const totalEmp = empQ.data?.total ?? 0;
  const presentCount = sections.find((s) => s.key === 'present')?.items.length ?? 0;
  const lateCount = sections.find((s) => s.key === 'late')?.items.length ?? 0;
  const onLeaveCount = sections.find((s) => s.key === 'onLeave')?.items.length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Davomat</Text>
          <Text style={styles.headerDate}>{dateLabel}</Text>
        </View>
        <TouchableOpacity style={styles.calBtn}>
          <Text style={styles.calIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Donut chart card */}
          <View style={styles.chartCard}>
            <DonutChart
              total={totalEmp}
              present={presentCount}
              late={lateCount}
              onLeave={onLeaveCount}
            />
          </View>

          {/* Status sections */}
          {sections.map((sec) => (
            <StatusSection key={sec.key} section={sec} />
          ))}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerCenter: { flex: 1, paddingLeft: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  calBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  calIcon: { fontSize: 20 },

  content: { paddingHorizontal: 16, paddingTop: 16 },

  // Chart
  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 14, paddingVertical: 16,
  },
  chartOuter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  chartWrapper: { position: 'relative', width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  chartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  chartTotal: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  legend: { flex: 1, paddingLeft: 20, gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 13, height: 13, borderRadius: 7 },
  legendCount: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  legendLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  // Status section card
  statusCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 14, overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  linkText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  empRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  empPosition: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  timeTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeTagArrow: { fontSize: 11, color: COLORS.textMuted },
  timeTagText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  leaveTag: {
    fontSize: 11, color: COLORS.primaryLight, fontWeight: '600',
    maxWidth: 90, textAlign: 'right',
  },
});
