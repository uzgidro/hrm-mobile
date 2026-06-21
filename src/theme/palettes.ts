// Shared color palette shape used across the whole app.
// Both light and dark palettes implement the exact same keys so any
// screen can switch instantly by reading from the active theme.

export type ThemeColors = {
  // surfaces
  bg: string;
  card: string;
  cardElevated: string;
  cardBorder: string;
  overlay: string;
  // brand
  primary: string;
  primaryLight: string;
  primarySoft: string; // translucent brand tint for chips/badges
  hero: string;        // hero / summary banner background
  heroText: string;    // text on the hero banner
  // text
  text: string;
  textSecondary: string;
  textMuted: string;
  onPrimary: string;
  // status
  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  // navigation (the bottom bar is dark in both themes — reference look)
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  // calendar / attendance
  present: string;
  absent: string;
  weekend: string;
  today: string;
  // misc
  skeleton: string;
  shadow: string;
};

// ── Brand violet (shared accent across both themes) ──────────────────────────
const VIOLET = '#7B68EE';
const VIOLET_BRIGHT = '#8A7CF8';

export const lightColors: ThemeColors = {
  bg: '#F4F5FA',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardBorder: '#ECEEF5',
  overlay: 'rgba(20,18,40,0.45)',

  primary: VIOLET,
  primaryLight: '#6A57E0',
  primarySoft: 'rgba(123,104,238,0.12)',
  hero: VIOLET,
  heroText: '#FFFFFF',

  text: '#1A1B2E',
  textSecondary: '#6B6F86',
  textMuted: '#9AA0B5',
  onPrimary: '#FFFFFF',

  success: '#16C098',
  successSoft: 'rgba(22,192,152,0.12)',
  error: '#FF5C5C',
  errorSoft: 'rgba(255,92,92,0.12)',
  warning: '#FF9F43',
  warningSoft: 'rgba(255,159,67,0.14)',
  info: VIOLET,

  tabBar: '#16161F',
  tabBarBorder: '#16161F',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#6E7080',

  present: '#16C098',
  absent: '#FF5C5C',
  weekend: '#E7E9F2',
  today: VIOLET,

  skeleton: '#ECEEF5',
  shadow: '#9098B5',
};

export const darkColors: ThemeColors = {
  bg: '#0E0E16',
  card: '#181826',
  cardElevated: '#1F1F30',
  cardBorder: '#262636',
  overlay: 'rgba(0,0,0,0.6)',

  primary: VIOLET,
  primaryLight: VIOLET_BRIGHT,
  primarySoft: 'rgba(123,104,238,0.20)',
  hero: VIOLET,
  heroText: '#FFFFFF',

  text: '#F2F3F9',
  textSecondary: '#9DA1B8',
  textMuted: '#62667E',
  onPrimary: '#FFFFFF',

  success: '#1FD6A6',
  successSoft: 'rgba(31,214,166,0.16)',
  error: '#FF6B6B',
  errorSoft: 'rgba(255,107,107,0.16)',
  warning: '#FFA94D',
  warningSoft: 'rgba(255,169,77,0.16)',
  info: VIOLET_BRIGHT,

  tabBar: '#000000',
  tabBarBorder: '#1C1C2A',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#5C6076',

  present: '#1FD6A6',
  absent: '#FF6B6B',
  weekend: '#22222F',
  today: VIOLET,

  skeleton: '#1F1F30',
  shadow: '#000000',
};
