// One row of the attendance roster list — status stripe + avatar + name/position
// + entry time or leave tag. Shared by the `attendance` feature
// (AttendanceDetailScreen) and the `dashboard` feature (HomeScreen's
// attendance content block) — lives here, not inside either feature, so
// neither has to cross-import the other (see `src/features/README.md`).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import type { ThemeColors } from '@/theme/palettes';
import type { RosterRow as RosterRowData } from '@/utils/attendanceRoster';
import { Icon } from '@/components/Icon';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { sectionColor } from '@/components/AttendanceDonut';

interface RosterRowProps {
  row: RosterRowData;
  colors: ThemeColors;
  showBorder: boolean;
}

export const RosterRow = React.memo(function RosterRow({ row, colors: c, showBorder }: RosterRowProps) {
  return (
    <TouchableOpacity
      style={[styles.empRow, showBorder && { borderBottomWidth: 1, borderBottomColor: c.cardBorder }]}
      onPress={() => router.push({ pathname: '/profile-detail', params: { id: row.employee.id } })}
      activeOpacity={0.7}
    >
      <View style={[styles.statusStripe, { backgroundColor: sectionColor(row.status, c) }]} />
      <EmployeeAvatar emp={row.employee} size={48} />
      <View style={styles.empInfo}>
        <Text style={[styles.empName, { color: c.text }]} numberOfLines={1}>{row.employee.legal_name}</Text>
        <Text style={[styles.empPosition, { color: c.textMuted }]} numberOfLines={1}>
          {row.employee.job_position?.name ?? row.employee.department?.name ?? '—'}
        </Text>
      </View>
      {row.entryTime && (
        <View style={styles.timeTag}>
          <Icon name="clock" size={14} color={c.textMuted} />
          <Text style={[styles.timeTagText, { color: c.text }]}>{dayjs(row.entryTime).format('HH:mm')}</Text>
        </View>
      )}
      {row.leaveName && (
        <Text style={[styles.leaveTag, { color: c.primaryLight }]} numberOfLines={1}>{row.leaveName}</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  statusStripe: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: -2 },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600' },
  empPosition: { fontSize: 12, marginTop: 2 },
  timeTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeTagText: { fontSize: 13, fontWeight: '700' },
  leaveTag: { fontSize: 11, fontWeight: '600', maxWidth: 90, textAlign: 'right' },
});
