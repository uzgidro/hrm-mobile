// Ingichka progress chizig'i (StatTile ostida, jins taqsimoti, tabel).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export function ProgressBar({
  value,
  color,
  height = 6,
  testID,
}: {
  value: number;
  color?: string;
  height?: number;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[styles.track, { height, backgroundColor: c.surface2 }]}
    >
      <View style={[styles.fill, { width: `${v * 100}%`, backgroundColor: color ?? c.brand }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radii.pill, overflow: 'hidden', alignSelf: 'stretch' },
  fill: { height: '100%', borderRadius: radii.pill },
});
