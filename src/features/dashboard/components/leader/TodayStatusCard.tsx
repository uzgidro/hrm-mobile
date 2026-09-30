// «Bugungi holat» donut (v2): vaqtida / kech / kelmagan / boshqa sabab + sabab chiplari.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, Chip, Donut, Text } from '@/ui';
import type { StatusCounts } from '../../utils/attendanceBoard';
import { pct } from './useBoardDay';

export function TodayStatusCard({ counts }: { counts: StatusCounts }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const slices = [
    { key: 'onTime', label: t('dashboard.home.onTime'), value: counts.present, color: c.chart1 },
    { key: 'late', label: t('dashboard.home.lateShort'), value: counts.late, color: c.chart2 },
    { key: 'absent', label: t('dashboard.home.absentShort'), value: counts.absent, color: c.chart3 },
    { key: 'other', label: t('dashboard.home.otherReason'), value: counts.other, color: c.chart5 },
  ];
  const rate = pct(counts.arrived, counts.total);
  return (
    <Card title={t('dashboard.home.todayStatus')} icon="chart" tint="violet" testID="card-status">
      <View style={styles.row}>
        <Donut
          segments={slices.map((s) => ({ value: s.value, color: s.color }))}
          size={128}
          accessibilityLabel={`${t('dashboard.home.todayStatus')}: ${rate}%`}
          center={
            <View style={styles.center}>
              <Text variant="number">{`${rate}%`}</Text>
              <Text variant="caption" tone="subtle">{`${counts.arrived} / ${counts.total}`}</Text>
            </View>
          }
        />
        <View style={styles.legend}>
          {slices.map((s) => (
            <View key={s.key} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text variant="label" tone="muted" style={styles.legendLabel} numberOfLines={1}>
                {s.label}
              </Text>
              <Text variant="label" style={styles.legendValue}>
                {String(s.value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.chips}>
        <Chip label={t('dashboard.home.boardStatus.vacation')} count={counts.vacation} tone="info" />
        <Chip label={t('dashboard.home.boardStatus.trip')} count={counts.trip} tone="brand" />
        <Chip label={t('dashboard.home.boardStatus.sick')} count={counts.sick} tone="warning" />
        <Chip label={t('dashboard.home.boardStatus.dekret')} count={counts.dekret} tone="neutral" />
        <Chip label={t('dashboard.home.boardStatus.leave')} count={counts.leave} tone="neutral" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  center: { alignItems: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1 },
  legendValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
});
