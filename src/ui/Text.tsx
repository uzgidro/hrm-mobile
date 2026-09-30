// v3 matn primitivi: variant (tipografik shkala) + tone (semantik rang).
// Display/title/number — Nunito, qolganlari — Inter. Font scale 1.3x bilan cheklangan.
import React from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { ff, type FontWeight } from '@/theme/typography';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number';
export type TextTone = 'fg' | 'muted' | 'subtle' | 'brand' | 'onBrand' | 'danger' | 'success' | 'link';

const VARIANTS: Record<TextVariant, () => TextStyle> = {
  display: () => ({ fontSize: 32, lineHeight: 38, ...ff('900') }),
  title: () => ({ fontSize: 22, lineHeight: 28, ...ff('800') }),
  heading: () => ({ fontSize: 17, lineHeight: 22, ...ff('600', 'text') }),
  body: () => ({ fontSize: 15, lineHeight: 21, ...ff('400', 'text') }),
  label: () => ({ fontSize: 13, lineHeight: 18, ...ff('500', 'text') }),
  caption: () => ({ fontSize: 12, lineHeight: 16, ...ff('400', 'text') }),
  number: () => ({ fontSize: 28, lineHeight: 32, ...ff('900'), fontVariant: ['tabular-nums'] }),
};

export type UIText = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Og'irlik — style'da `fontWeight` emas, shu prop (maxsus shriftda soxta qalinlik bo'lmasin). */
  weight?: FontWeight;
};

const DISPLAY: TextVariant[] = ['display', 'title', 'number'];

export function Text({ variant = 'body', tone = 'fg', weight, style, ...rest }: UIText) {
  const { colors: c, fontsReady } = useTheme();
  const color = {
    fg: c.fg,
    muted: c.fgMuted,
    subtle: c.fgSubtle,
    brand: c.brandStrong,
    onBrand: c.fgOnBrand,
    danger: c.danger,
    success: c.success,
    link: c.drop,
  }[tone];
  // fontsReady — shrift yuklangach uslub qayta hisoblanadi (ff natijasi o'zgaradi).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = React.useMemo(
    () => ({ ...VARIANTS[variant](), ...(weight ? ff(weight, DISPLAY.includes(variant) ? 'display' : 'text') : null) }),
    [variant, weight, fontsReady],
  );
  // style'dagi `fontWeight` maxsus shriftda soxta qalinlik beradi — uni shu
  // og'irlikdagi shrift oilasiga aylantiramiz (shrift yuklanmagan bo'lsa ff yana fontWeight qaytaradi).
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  let tail: TextStyle | undefined = flat;
  if (flat?.fontWeight && typeof flat.fontWeight === 'string' && /^[1-9]00$/.test(flat.fontWeight)) {
    const { fontWeight, ...restStyle } = flat;
    const w = (Number(fontWeight) < 400 ? '400' : fontWeight) as FontWeight;
    tail = { ...restStyle, ...ff(w, DISPLAY.includes(variant) ? 'display' : 'text') };
  }
  return <RNText maxFontSizeMultiplier={1.3} {...rest} style={[base, { color }, tail]} />;
}
