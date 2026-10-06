// «Tomchi × v2» shkalalari. Radiuslar v2 `--r-*` dan; LIP — Tomchi bosiladigan
// elementining pastki labi (faqat bosiladiganlarda: asosiy Button, ListRow
// `pressable`, bosiladigan StatTile). Soyalar v2 `--shadow-*` — statik panellar.
import { Platform, type ViewStyle } from 'react-native';
import { darkColors, type ThemeColors } from './palettes';

export const radii = { xs: 10, sm: 12, md: 14, lg: 18, xl: 22, pill: 999 } as const;
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;
export const LIP = 3;

const SHADOWS = {
  xs: { y: 1, blur: 2, light: 0.05, dark: 0.35, elevation: 1 },
  sm: { y: 2, blur: 8, light: 0.06, dark: 0.32, elevation: 2 },
  md: { y: 12, blur: 32, light: 0.1, dark: 0.35, elevation: 6 },
} as const;

/** v2 shadow-xs/sm/md — iOS/web shadow, Android elevation. */
export function shadow(level: keyof typeof SHADOWS, c: ThemeColors): ViewStyle {
  const s = SHADOWS[level];
  const opacity = c.bg === darkColors.bg ? s.dark : s.light;
  if (Platform.OS === 'android') return { elevation: s.elevation };
  return {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: s.y },
    shadowRadius: s.blur / 2,
    shadowOpacity: opacity,
  };
}

/** v2 grad-hero (light): binafsha → tomchi ko'k — ikki dunyo ko'prigi. */
export const gradients = {
  hero: ['#6247D9', '#7C5CFF', '#1B87C9'] as const,
  heroDark: ['#7C5CFF', '#57C8FF', '#5FE39C'] as const,
  accent: ['#8D70FF', '#7958FF', '#6247D9'] as const,
  // Xizmat safari «Keldim» kartasi — yashil (yetib keldim) → tomchi ko'k (yo'l).
  trip: ['#0E8F63', '#12A877', '#1B87C9'] as const,
  tripDark: ['#1FB67F', '#2BC79A', '#57C8FF'] as const,
};

export type ModuleTintKey = 'violet' | 'green' | 'orange' | 'drop' | 'pink' | 'amber' | 'cyan' | 'grey';

/**
 * Modul / StatTile rangi. `fg` — ikonka va urg'u; `wash` — tile foni.
 * Wash ustidagi matn DOIM `c.fg` bo'ladi (kontrast), tint rangida emas.
 */
export function moduleTint(c: ThemeColors, key: ModuleTintKey): { fg: string; wash: string } {
  const dark = c.bg === darkColors.bg;
  const map: Record<ModuleTintKey, string> = {
    violet: c.brand,
    green: c.successMark,
    orange: dark ? '#FFAB33' : '#FF9600',
    drop: c.drop,
    pink: dark ? '#FF8AC4' : '#E0569B',
    amber: c.warningMark,
    cyan: c.chart5,
    grey: c.chart6,
  };
  const fg = map[key];
  return { fg, wash: `${fg}${dark ? '29' : '1A'}` };
}
