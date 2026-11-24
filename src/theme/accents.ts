// Accent colours and grounds a person can give their home screen. Values are web v2's
// `features/dashboard/board/boardLook.css` (measured there: the fill carries white text at
// 4.6:1, the strong tone reads at 4.7:1 on light and 5.2:1 on dark grounds).
import { darkColors, type ThemeColors } from './palettes';

export const ACCENTS = ['violet', 'azure', 'green', 'teal', 'rose', 'amber', 'slate'] as const;
export type Accent = (typeof ACCENTS)[number];

type Tone = { strong: string; soft: string; tint: string };
const TONES: Record<Accent, { brand: string; deep: string; light: Tone; dark: Tone }> = {
  violet: { brand: '#6742FA', deep: '#3706F9', light: { strong: '#6742FA', soft: '#EEEAFD', tint: '#FAF9FD' }, dark: { strong: '#A18BF9', soft: '#291F51', tint: '#211A3D' } },
  azure: { brand: '#0B75CB', deep: '#085391', light: { strong: '#0A6CBD', soft: '#EAF4FD', tint: '#F9FBFD' }, dark: { strong: '#77BEF8', soft: '#1F3B51', tint: '#1A2D3D' } },
  green: { brand: '#158450', deep: '#0D4F30', light: { strong: '#147B4B', soft: '#EBFCF4', tint: '#F9FDFB' }, dark: { strong: '#84EBBB', soft: '#1F513A', tint: '#1A3D2D' } },
  teal: { brand: '#118088', deep: '#0A4D52', light: { strong: '#10787F', soft: '#EBFBFC', tint: '#F9FDFD' }, dark: { strong: '#80E8EF', soft: '#1F4E51', tint: '#1A3A3D' } },
  rose: { brand: '#DF2059', deep: '#AA1844', light: { strong: '#C91D50', soft: '#FCEBF0', tint: '#FDF9FA' }, dark: { strong: '#ED82A2', soft: '#511F2E', tint: '#3D1A24' } },
  amber: { brand: '#AA610E', deep: '#714109', light: { strong: '#A05C0D', soft: '#FDF4EA', tint: '#FDFBF9' }, dark: { strong: '#F4BC7B', soft: '#513A1F', tint: '#3D2D1A' } },
  slate: { brand: '#5F74A5', deep: '#48587F', light: { strong: '#566A99', soft: '#F0F2F7', tint: '#F9FAFD' }, dark: { strong: '#A4B0CC', soft: '#283248', tint: '#1F2637' } },
};

const isDark = (c: ThemeColors) => c.bg === darkColors.bg;

export const accentFill = (a: Accent): string => TONES[a].brand;
/** Card ground of the «tinted» card style. */
export const accentTint = (a: Accent, c: ThemeColors): string => TONES[a][isDark(c) ? 'dark' : 'light'].tint;

/** The palette with its brand family replaced. `bg` stays: dark/light is told by it. */
export function withAccent(c: ThemeColors, a: Accent): ThemeColors {
  const t = TONES[a];
  const tone = isDark(c) ? t.dark : t.light;
  return {
    ...c,
    brand: t.brand,
    brandStrong: tone.strong,
    brandSoft: tone.soft,
    brandDeep: t.deep,
    brandLip: t.deep,
    ring: t.brand,
    primary: t.brand,
    primaryLight: tone.strong,
    primarySoft: tone.soft,
    primaryShadow: t.deep,
  };
}

export const GROUNDS = ['plain', 'sky', 'mint', 'dawn', 'sand', 'graphite'] as const;
export type Ground = (typeof GROUNDS)[number];
const GROUND_TOP: Record<Exclude<Ground, 'plain'>, { light: string; dark: string }> = {
  sky: { light: '#E4F1FD', dark: '#10304D' },
  mint: { light: '#E2F6EE', dark: '#0F3A2C' },
  dawn: { light: '#FDEAF0', dark: '#3D1B33' },
  sand: { light: '#FBF3E2', dark: '#3A2C14' },
  graphite: { light: '#E4E6EA', dark: '#20222C' },
};
/** Top colour of the ground's gradient; `null` — the plain canvas. */
export const groundTop = (g: Ground | undefined, c: ThemeColors): string | null =>
  !g || g === 'plain' ? null : GROUND_TOP[g][isDark(c) ? 'dark' : 'light'];
