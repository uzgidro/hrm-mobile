// Gorizontal ustunli diagramma (web v2 recharts BarChart o'rnida): nom · ustun · son. Telefonda
// gorizontal ustunlar uzun nomlarni kesmaydi; qiymat har doim raqam bilan yozilgan (ekran
// o'quvchiga ham — har qator `accessibilityLabel` bilan).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Text } from '@/ui';
import { barRatio } from '../utils/stats';

const CHART: (keyof ThemeColors)[] = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6'];

export function BarList({
  data,
  color,
  testID,
}: {
  data: { name: string; value: number }[];
  /** Bitta rang (taqsimot kartalari); berilmasa — v2 kabi navbatma-navbat chart1..6. */
  color?: keyof ThemeColors;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);
  return (
    <View style={styles.list} testID={testID}>
      {data.map((d, i) => (
        <View key={`${d.name}${i}`} style={styles.row} accessible accessibilityLabel={`${d.name}: ${d.value}`}>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.name}>
            {d.name}
          </Text>
          <View style={[styles.track, { backgroundColor: c.bg }]}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max(2, barRatio(d.value, max) * 100)}%`,
                  backgroundColor: c[color ?? CHART[i % CHART.length]!],
                },
              ]}
            />
          </View>
          <Text variant="label" weight="700" style={styles.value}>
            {d.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { width: '38%' },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  bar: { height: 12, borderRadius: 6 },
  value: { minWidth: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
