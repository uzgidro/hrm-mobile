import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { KPI_BANDS, bandFor } from '../utils';

// Verifix-style half-circle gauge (web KpiGauge.jsx parity, drawn with
// react-native-svg instead of recharts): 5 colored band arcs, a needle, and a
// center label. The needle/band saturate at 100; the center number shows the
// REAL value (up to ~170%); null renders an em-dash with the needle parked left.
const GAUGE_MAX = 100;

// Angle (degrees) for a 0..100 value on the half circle: 180° (left) → 0° (right).
const angleFor = (v: number) => 180 - (v / GAUGE_MAX) * 180;

// Point on the arc at `deg`, in screen coords (y grows downward).
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// One band's stroked arc path, inset by `pad` value-units on each side so the
// segments read as separate blocks (web paddingAngle analogue).
function bandPath(cx: number, cy: number, r: number, from: number, to: number, pad = 0.6) {
  const s = polar(cx, cy, r, angleFor(from + pad));
  const e = polar(cx, cy, r, angleFor(to - pad));
  // Left→right over the top is clockwise in screen coords → sweep flag 1.
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}

export function KpiGauge({ value, size = 240 }: { value: number | null | undefined; size?: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const real = value == null ? null : Math.max(0, Number(value));
  const clamped = real == null ? null : Math.min(GAUGE_MAX, real);
  const band = bandFor(clamped ?? 0);

  const stroke = size * 0.075;
  const cx = size / 2;
  const cy = size / 2; // arc center sits on the svg's bottom edge
  const r = size / 2 - stroke / 2 - 2;
  const svgH = size / 2 + 10; // + room for the needle hub

  const needle = polar(cx, cy, r * 0.72, angleFor(clamped ?? 0));

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Svg width={size} height={svgH}>
        {KPI_BANDS.map((b) => (
          <Path
            key={b.labelKey}
            d={bandPath(cx, cy, r, b.from, b.to)}
            stroke={b.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            fill="none"
          />
        ))}
        {/* Needle + hub */}
        <Path
          d={`M ${cx} ${cy - 2} L ${needle.x} ${needle.y}`}
          stroke={real == null ? colors.textMuted : band.color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy - 2} r={7} fill={real == null ? colors.textMuted : band.color} />
        <Circle cx={cx} cy={cy - 2} r={3} fill={colors.card} />
      </Svg>

      {/* Center label: the REAL number (not the clamped one) + the band title */}
      <View style={styles.labelWrap}>
        <Text style={[styles.value, { color: real == null ? colors.textMuted : band.color }]}>
          {real == null ? '—' : `${real.toFixed(0)}%`}
        </Text>
        {real != null && (
          <Text style={[styles.band, { color: band.color }]}>{t(band.labelKey)}</Text>
        )}
      </View>
    </View>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    labelWrap: { alignItems: 'center', marginTop: -4 },
    value: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
    band: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  });
