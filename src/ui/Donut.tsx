// Donut / halqa grafigi (react-native-svg). Yoy geometriyasi sof `donutArcs` da.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export type DonutSegment = { value: number; color: string };

/** Segmentlar → stroke-dasharray yoylari. Jami 0 bo'lsa bo'sh; <=0 segmentlar tashlanadi. */
export function donutArcs(segments: DonutSegment[], radius: number, gap = 2) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  if (total <= 0) return [];
  const circumference = 2 * Math.PI * radius;
  let acc = 0;
  return segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * circumference;
      const arc = {
        color: s.color,
        dasharray: `${Math.max(0, len - gap)} ${circumference}`,
        dashoffset: -acc,
      };
      acc += len;
      return arc;
    });
}

export function Donut({
  segments,
  size = 132,
  stroke = 16,
  center,
  accessibilityLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
  accessibilityLabel: string;
}) {
  const { colors: c } = useTheme();
  const r = (size - stroke) / 2;
  const mid = size / 2;
  const arcs = donutArcs(segments, r);
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Aylantirish Svg style orqali: <G origin> web'da noto'g'ri DOM atributi beradi. */}
      <Svg width={size} height={size} testID="donut-svg" style={styles.rotate}>
        <G>
          <Circle cx={mid} cy={mid} r={r} stroke={c.surface2} strokeWidth={stroke} fill="none" />
          {arcs.map((a, i) => (
            <Circle
              key={i}
              cx={mid}
              cy={mid}
              r={r}
              stroke={a.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
              strokeLinecap={arcs.length > 1 ? 'butt' : 'round'}
            />
          ))}
        </G>
      </Svg>
      {center ? <View style={styles.center}>{center}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
