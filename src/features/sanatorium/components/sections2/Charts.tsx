// Analytics charts built from plain Views (no chart library): a tappable column chart with axis
// labels, grouped columns, stacked rows and overlay rows. Colours come from theme tokens only.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Text } from '@/ui';
import { barPercents, niceMax, stackPercents } from '../../utils/sections2';
import { HBar } from './kit';

const AXIS_W = 34;

export type ChartSeries = { key: string; label: string; color: string; values: number[] };

function Legend({ items, testID }: { items: { key: string; label: string; color: string }[]; testID?: string }) {
  return (
    <View style={styles.legend} testID={testID}>
      {items.map((i) => (
        <View key={i.key} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <Text variant="caption" tone="muted">{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Y axis (top / middle / zero labels) + grid lines behind `children` (the bars row). */
function Plot({ top, unit, height, children }: { top: number; unit: string; height: number; children: React.ReactNode }) {
  const { colors: c } = useTheme();
  const ticks = [top, top / 2, 0];
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
  return (
    <View style={styles.plotRow}>
      <View style={[styles.axis, { height }]}>
        {ticks.map((v, i) => (
          <Text key={i} variant="caption" tone="subtle" style={[styles.tick, { top: i === 0 ? 0 : i === 1 ? height / 2 - 8 : height - 16 }]}>{fmt(v)}</Text>
        ))}
      </View>
      <View style={[styles.plot, { height }]}>
        {[0, 0.5, 1].map((p, i) => <View key={i} pointerEvents="none" style={[styles.grid, { top: p * (height - 1), backgroundColor: c.border }]} />)}
        {children}
      </View>
    </View>
  );
}

function XLabels({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  const mid = labels[Math.floor((labels.length - 1) / 2)];
  return (
    <View style={styles.xLabels}>
      <Text variant="caption" tone="subtle">{labels[0]}</Text>
      {labels.length > 2 && <Text variant="caption" tone="subtle">{mid}</Text>}
      {labels.length > 1 && <Text variant="caption" tone="subtle">{labels[labels.length - 1]}</Text>}
    </View>
  );
}

/** One series of columns. Tap a column to read its value under the chart. */
export function ColumnChart({
  values, labels, max, unit = '', height = 130, color, title, testID,
}: {
  values: number[]; labels: string[]; max?: number; unit?: string; height?: number; color?: string; title: string; testID?: string;
}) {
  const { colors: c } = useTheme();
  const [sel, setSel] = useState<number | null>(null);
  const top = max ?? niceMax(Math.max(0, ...values));
  const pct = barPercents(values, top);
  const fill = color ?? c.brand;
  return (
    <View testID={testID} accessibilityLabel={title}>
      <Plot top={top} unit={unit} height={height}>
        <View style={styles.bars}>
          {pct.map((p, i) => (
            <Pressable
              key={i}
              style={styles.col}
              onPress={() => setSel(sel === i ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${labels[i] ?? i + 1}: ${values[i]}${unit}`}
              testID={testID ? `${testID}-bar-${i}` : undefined}
            >
              <View style={[styles.bar, { height: `${p}%`, backgroundColor: fill, opacity: sel == null || sel === i ? 1 : 0.4 }]} />
            </Pressable>
          ))}
        </View>
      </Plot>
      <XLabels labels={labels} />
      {sel != null && values[sel] != null && (
        <Text variant="label" tone="brand" testID={testID ? `${testID}-readout` : undefined}>
          {labels[sel]}: {Math.round(values[sel]! * 10) / 10}{unit}
        </Text>
      )}
    </View>
  );
}

/** Several series side by side per x position (e.g. arrivals and departures per day). */
export function GroupedColumns({
  series, labels, height = 130, title, testID,
}: {
  series: ChartSeries[]; labels: string[]; height?: number; title: string; testID?: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const top = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  return (
    <View testID={testID} accessibilityLabel={title}>
      <Legend items={series} />
      <Plot top={top} unit="" height={height}>
        <View style={styles.bars}>
          {labels.map((l, i) => (
            <Pressable
              key={i}
              style={[styles.col, styles.group]}
              onPress={() => setSel(sel === i ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${l}: ${series.map((s) => `${s.label} ${s.values[i] ?? 0}`).join(', ')}`}
              testID={testID ? `${testID}-group-${i}` : undefined}
            >
              {series.map((s) => (
                <View key={s.key} style={[styles.bar, styles.half, { height: `${barPercents([s.values[i] ?? 0], top)[0]}%`, backgroundColor: s.color, opacity: sel == null || sel === i ? 1 : 0.4 }]} />
              ))}
            </Pressable>
          ))}
        </View>
      </Plot>
      <XLabels labels={labels} />
      {sel != null && (
        <Text variant="label" tone="brand" testID={testID ? `${testID}-readout` : undefined}>
          {labels[sel]}: {series.map((s) => `${s.label} ${Math.round((s.values[sel] ?? 0) * 10) / 10}`).join(' · ')}
        </Text>
      )}
    </View>
  );
}

export type StackRow = { key: string; label: string; sub?: string; parts: number[] };

/** Horizontal stacked bars, one row per item; segments follow `colors` / `names`. */
export function StackedRows({
  rows, colors, names, title, testID,
}: {
  rows: StackRow[]; colors: string[]; names: string[]; title: string; testID?: string;
}) {
  const { colors: c } = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.parts.reduce((s, x) => s + x, 0)));
  return (
    <View testID={testID} accessibilityLabel={title}>
      <Legend items={names.map((n, i) => ({ key: n, label: n, color: colors[i]! }))} />
      {rows.map((r) => {
        const w = stackPercents(r.parts, max);
        return (
          <View key={r.key} style={styles.row} accessible accessibilityLabel={`${r.label}: ${r.parts.map((v, i) => `${names[i]} ${v}`).join(', ')}`}>
            <View style={styles.rowHead}>
              <Text variant="label" style={styles.flex} numberOfLines={1}>{r.label}</Text>
              <Text variant="label" tone="muted">{r.parts.reduce((s, x) => s + x, 0)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.surface2 }]}>
              {w.map((p, i) => <View key={i} style={{ width: `${p}%`, height: '100%', backgroundColor: colors[i] }} />)}
            </View>
            {!!r.sub && <Text variant="caption" tone="subtle" numberOfLines={1}>{r.sub}</Text>}
          </View>
        );
      })}
    </View>
  );
}

/** A bar of `total` with the `part` of it filled in another colour (requests: accepted of total). */
export function OverlayRows({
  rows, totalColor, partColor, legend, title, testID,
}: {
  rows: { key: string; label: string; total: number; part: number }[]; totalColor: string; partColor: string; legend: { total: string; part: string }; title: string; testID?: string;
}) {
  const { colors: c } = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <View testID={testID} accessibilityLabel={title}>
      <Legend items={[{ key: 't', label: legend.total, color: totalColor }, { key: 'p', label: legend.part, color: partColor }]} />
      {rows.map((r) => {
        const w = (r.total / max) * 100;
        const inner = r.total > 0 ? (r.part / r.total) * 100 : 0;
        return (
          <View key={r.key} style={styles.row} accessible accessibilityLabel={`${r.label}: ${r.part}/${r.total}`}>
            <View style={styles.rowHead}>
              <Text variant="label" style={styles.flex} numberOfLines={1}>{r.label}</Text>
              <Text variant="label" tone="muted">{r.part}/{r.total}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.surface2 }]}>
              <View style={{ width: `${w}%`, height: '100%', backgroundColor: totalColor }}>
                <View style={{ width: `${inner}%`, height: '100%', backgroundColor: partColor }} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  plotRow: { flexDirection: 'row', gap: 4 },
  axis: { width: AXIS_W },
  tick: { position: 'absolute', right: 2, fontSize: 11, lineHeight: 16 },
  plot: { flex: 1 },
  grid: { position: 'absolute', left: 0, right: 0, height: 1 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  group: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  half: { flex: 1, width: undefined },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: AXIS_W + 4, marginTop: 3 },
  row: { marginVertical: 5, gap: 3 },
  rowHead: { flexDirection: 'row', gap: 8 },
  track: { height: 10, borderRadius: radii.pill, overflow: 'hidden', flexDirection: 'row' },
});

/** Share of each 1..5 star answer (bars out of the total). */
export function RatingDistribution({ dist, total, testID }: { dist: Record<string, number>; total: number; testID?: string }) {
  return (
    <View testID={testID}>
      {[5, 4, 3, 2, 1].map((n) => (
        <HBar key={n} label={'★'.repeat(n)} value={dist[String(n)] ?? 0} max={Math.max(1, total)} tone={n <= 2 ? 'warn' : 'brand'} />
      ))}
    </View>
  );
}
