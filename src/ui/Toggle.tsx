// Tema ranglaridagi RN Switch. O'chiq holat ikkala mavzuda ham ko'rinsin: trek — borderStrong,
// tutqich — yorug'da oq (surface), qorong'ida fgMuted (avval surface edi — qorong'i trekda
// deyarli ko'rinmasdi). Yoqiq — brand (yoki danger: buzuvchi rejim) trek + oq tutqich.
import React from 'react';
import { Platform, Switch } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

export type ToggleTone = 'brand' | 'danger';

/** Switch ranglari — sof funksiya (test qilinadi). */
export function toggleColors(c: ThemeColors, isDark: boolean, value: boolean, tone: ToggleTone = 'brand') {
  const on = tone === 'danger' ? c.dangerMark : c.brand;
  const offThumb = isDark ? c.fgMuted : c.surface;
  return {
    trackColor: { false: c.borderStrong, true: on },
    thumbColor: value ? c.fgOnBrand : offThumb,
    offThumb,
    onThumb: c.fgOnBrand,
  };
}

export function Toggle({
  value,
  onValueChange,
  tone = 'brand',
  disabled,
  accessibilityLabel,
  testID,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  tone?: ToggleTone;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const { colors: c, isDark } = useTheme();
  const k = toggleColors(c, isDark, value, tone);
  // react-native-web: thumbColor — o'chiq tutqich, activeThumbColor — yoqiq tutqich (RN tiplarida yo'q).
  const web = Platform.OS === 'web' ? ({ thumbColor: k.offThumb, activeThumbColor: k.onThumb } as object) : null;
  return (
    <Switch
      testID={testID}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={k.trackColor}
      thumbColor={k.thumbColor}
      ios_backgroundColor={k.trackColor.false}
      {...web}
    />
  );
}
