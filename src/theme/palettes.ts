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
  inputBg: string; // filled text-field background (design I)
  // brand
  primary: string;
  primaryLight: string;
  primarySoft: string; // translucent brand tint for chips/badges
  primaryShadow: string; // the 3D «lip» under a primary button (design I)
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
  // navigation (themed bar: light in light mode, dark in dark mode)
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  tabBarActiveBg: string; // soft pill behind the active tab
  tabBarActiveBorder: string; // outline of the active tab box
  // calendar / attendance
  present: string;
  absent: string;
  weekend: string;
  today: string;
  // misc
  skeleton: string;
  shadow: string;
};

// ── Dizayn «I · Tomchi» (2026-09-28 tanlandi) ────────────────────────────────
// Duolingo uslubi: oq (tungi — to'q dengiz) yuza, kulrang 2px chegara bilan
// ajraladigan kartalar, pastki «lab»li qalin tugmalar. Brend ko'k — logotipdagi
// #0283DE, maskot tomchisi #1CB0F6; yashil — logotipdagi #0AC341 oilasi.
const LOGO_BLUE = '#0283DE';
const DROP_BLUE = '#1CB0F6';

export const lightColors: ThemeColors = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardBorder: '#E5E5E5',
  overlay: 'rgba(0,0,0,0.45)',
  inputBg: '#F7F7F7',

  primary: LOGO_BLUE,
  primaryLight: '#1482C8',
  primarySoft: '#DDF4FF',
  primaryShadow: '#0062A8',
  hero: LOGO_BLUE,
  heroText: '#FFFFFF',

  text: '#3C3C3C',
  textSecondary: '#6B6B6B',
  textMuted: '#A0A0A0',
  onPrimary: '#FFFFFF',

  success: '#2BC155',
  successSoft: '#E3F8E8',
  error: '#FF4B4B',
  errorSoft: '#FFE5E5',
  warning: '#FF9600',
  warningSoft: '#FFF1DA',
  info: DROP_BLUE,

  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5E5',
  tabBarActive: DROP_BLUE,
  tabBarInactive: '#A0A0A0',
  tabBarActiveBg: '#DDF4FF',
  tabBarActiveBorder: '#84D8FF',

  present: '#2BC155',
  absent: '#FF4B4B',
  weekend: '#F0F0F0',
  today: DROP_BLUE,

  skeleton: '#F0F0F0',
  shadow: '#000000',
};

export const darkColors: ThemeColors = {
  bg: '#131F24',
  card: '#131F24',
  cardElevated: '#1F2F36',
  cardBorder: '#37464F',
  overlay: 'rgba(0,0,0,0.6)',
  inputBg: '#1F2F36',

  primary: '#1899D6',
  primaryLight: '#49C0F8',
  primarySoft: 'rgba(28,176,246,0.15)',
  primaryShadow: '#1172A3',
  hero: '#1899D6',
  heroText: '#FFFFFF',

  text: '#F1F7FB',
  textSecondary: '#A9BAC3',
  textMuted: '#6E818B',
  onPrimary: '#FFFFFF',

  success: '#3DD16A',
  successSoft: 'rgba(43,193,85,0.16)',
  error: '#FF6B6B',
  errorSoft: 'rgba(255,75,75,0.16)',
  warning: '#FFAB33',
  warningSoft: 'rgba(255,150,0,0.16)',
  info: '#49C0F8',

  tabBar: '#131F24',
  tabBarBorder: '#37464F',
  tabBarActive: '#49C0F8',
  tabBarInactive: '#6E818B',
  tabBarActiveBg: 'rgba(28,176,246,0.15)',
  tabBarActiveBorder: '#1F6F99',

  present: '#3DD16A',
  absent: '#FF6B6B',
  weekend: '#1F2F36',
  today: '#49C0F8',

  skeleton: '#1F2F36',
  shadow: '#000000',
};
