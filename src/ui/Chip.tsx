// Filtr / sabab chipi. Tanlangan — brand fon; bosiladigan tanlanmagan — surface + chegara;
// faqat ko'rsatuvchi — surface2. Ixtiyoriy son.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { radii } from '@/theme/tokens';
import { Text } from './Text';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

/** Semantik ton → (yumshoq fon, matn, belgi) — Chip, Badge va statuslar uchun yagona xarita. */
export function toneColors(c: ThemeColors, tone: Tone): { soft: string; fg: string; mark: string } {
  switch (tone) {
    case 'success':
      return { soft: c.successSoft, fg: c.success, mark: c.successMark };
    case 'warning':
      return { soft: c.warningSoft, fg: c.warning, mark: c.warningMark };
    case 'danger':
      return { soft: c.dangerSoft, fg: c.danger, mark: c.dangerMark };
    case 'info':
      return { soft: c.infoSoft, fg: c.info, mark: c.chart5 };
    case 'brand':
      return { soft: c.brandSoft, fg: c.brandStrong, mark: c.brand };
    default:
      return { soft: c.surface2, fg: c.fgMuted, mark: c.chart6 };
  }
}

export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'neutral',
  count,
  tintSelected = false,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: Tone;
  count?: number;
  /** Tanlangan holat brand emas, o'z toni bilan (status tanlovi: sog'lom — yashil, kasal — qizil). */
  tintSelected?: boolean;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const t = toneColors(c, tone);
  const tinted = tintSelected && tone !== 'neutral';
  const pressable = !!onPress;
  // Bosiladigan tanlanmagan chip — surface + chegara (yorug' mavzuda surface2 fon kanvasga
  // singib ketardi, chip bosiladigan narsa bo'lib o'qilmasdi). Faqat ko'rsatuvchi chip — avvalgidek surface2.
  const bg = selected ? (tinted ? t.soft : c.brand) : pressable ? c.surface : c.surface2;
  const fg = selected ? (tinted ? t.fg : c.fgOnBrand) : c.fg;
  const body = (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg },
        // Tonli tanlov: qalinroq chegara; tanlanganda — ton belgisi rangida. Chegara qalinligi
        // holatga bog'liq emas — tanlanganda o'lcham sakramaydi.
        tinted
          ? { borderWidth: 1.5, borderColor: selected ? t.mark : pressable ? c.borderStrong : 'transparent' }
          : pressable && { borderWidth: 1, borderColor: selected ? c.brand : c.borderStrong },
      ]}
    >
      {tone !== 'neutral' && (!selected || tinted) && <View style={[styles.dot, { backgroundColor: t.mark }]} />}
      <Text variant="label" style={[{ color: fg }, tinted && selected && styles.strong]}>
        {label}
      </Text>
      {count !== undefined && (
        <Text variant="label" style={[styles.count, { color: fg }]}>
          {String(count)}
        </Text>
      )}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => pressed && { opacity: 0.75 }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  count: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '700' },
});
