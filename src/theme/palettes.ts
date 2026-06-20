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
  // navigation
  tabBar: string;
  tabBarBorder: string;
  // calendar / attendance
  present: string;
  absent: string;
  weekend: string;
  today: string;
  // misc
  skeleton: string;
  shadow: string;
};

export const darkColors: ThemeColors = {
  bg: '#0D0F1A',
  card: '#161829',
  cardElevated: '#1B1E33',
  cardBorder: '#222640',
  overlay: 'rgba(0,0,0,0.6)',

  primary: '#3B6FF5',
  primaryLight: '#5B8DEF',
  primarySoft: 'rgba(59,111,245,0.16)',

  text: '#F4F6FB',
  textSecondary: '#9AA0BC',
  textMuted: '#5A5F7A',
  onPrimary: '#FFFFFF',

  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.16)',
  error: '#F87171',
  errorSoft: 'rgba(248,113,113,0.16)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.16)',
  info: '#60A5FA',

  tabBar: '#12141F',
  tabBarBorder: '#222640',

  present: '#34D399',
  absent: '#F87171',
  weekend: '#2A3358',
  today: '#3B6FF5',

  skeleton: '#1E2235',
  shadow: '#000000',
};

export const lightColors: ThemeColors = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardBorder: '#E6E9F2',
  overlay: 'rgba(15,23,42,0.45)',

  primary: '#2D6BE4',
  primaryLight: '#2D6BE4',
  primarySoft: 'rgba(45,107,228,0.10)',

  text: '#111525',
  textSecondary: '#5B6178',
  textMuted: '#9499AD',
  onPrimary: '#FFFFFF',

  success: '#16A34A',
  successSoft: 'rgba(22,163,74,0.12)',
  error: '#DC2626',
  errorSoft: 'rgba(220,38,38,0.10)',
  warning: '#D97706',
  warningSoft: 'rgba(217,119,6,0.12)',
  info: '#2563EB',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E6E9F2',

  present: '#16A34A',
  absent: '#DC2626',
  weekend: '#DCE4F7',
  today: '#2D6BE4',

  skeleton: '#E6E9F2',
  shadow: '#1F2A44',
};
