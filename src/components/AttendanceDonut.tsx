// Attendance donut chart with a tap-to-filter legend. Shared by the
// `attendance` feature (AttendanceDetailScreen) and the `dashboard` feature
// (HomeScreen's attendance content block) — lives here, not inside either
// feature, so neither has to cross-import the other (see
// `src/features/README.md`).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, G } from 'react-native-svg';
import type { ThemeColors } from '@/theme/palettes';
import type { AttendanceStatus } from '@/utils/attendanceRoster';

export function sectionColor(key: AttendanceStatus, c: ThemeColors) {
  if (key === 'present') return c.present;
  if (key === 'late') return c.warning;
  if (key === 'onLeave') return c.primaryLight;
  return c.error;
}

interface AttendanceDonutProps {
  total: number;
  present: number;
  late: number;
  onLeave: number;
  activeFilter: AttendanceStatus | null;
  onFilter: (key: AttendanceStatus | null) => void;
  colors: ThemeColors;
  /** 180 on the full detail screen, smaller on the Home preview. Defaults to 180. */
  size?: number;
}

export const AttendanceDonut = React.memo(function AttendanceDonut({
  total, present, late, onLeave, activeFilter, onFilter, colors: c, size = 180,
}: AttendanceDonutProps) {
  const { t } = useTranslation();
  const absent = Math.max(0, total - present - late - onLeave);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * (68 / 180);
  const stroke = size * (24 / 180);
  const circ = 2 * Math.PI * R;
  const rotate = `rotate(-90, ${cx}, ${cy})`;

  const allSegs: { value: number; color: string; key: AttendanceStatus }[] = [
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
    { key: 'present' as AttendanceStatus, count: present, color: c.present, label: t('attendance.legend.present') },
    { key: 'late' as AttendanceStatus, count: late, color: c.warning, label: t('attendance.legend.late') },
    { key: 'absent' as AttendanceStatus, count: absent, color: c.error, label: t('attendance.legend.absent') },
    { key: 'onLeave' as AttendanceStatus, count: onLeave, color: c.primaryLight, label: t('attendance.legend.onLeave') },
  ].filter((it) => it.count > 0 || it.key === 'absent');

  const handleFilter = (key: AttendanceStatus) => onFilter(activeFilter === key ? null : key);

  return (
    <View style={styles.outer}>
      <View style={[styles.wrapper, { width: size, height: size }]}>
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
        <View style={styles.center}>
          <Text style={[styles.total, { color: c.text }]}>{activeFilter ? (allSegs.find((s) => s.key === activeFilter)?.value ?? total) : total}</Text>
          {activeFilter && <Text style={[styles.filterLabel, { color: c.textMuted }]}>{t('attendance.clearFilter')}</Text>}
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
                <Text style={[styles.legendCount, { color: c.text }]}>{it.count}</Text>
                <Text style={[styles.legendLabel, { color: c.textSecondary }]}>{it.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  wrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 30, fontWeight: '800' },
  filterLabel: { fontSize: 9, marginTop: 2 },
  legend: { flex: 1, paddingLeft: 20, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 13, height: 13, borderRadius: 7 },
  legendCount: { fontSize: 20, fontWeight: '700' },
  legendLabel: { fontSize: 12, marginTop: 1 },
});
