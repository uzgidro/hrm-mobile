// «Tomchi × v2» (2026-09-29). Yuzalar / siyoh / semantika — web v2
// `src/styles/theme.css` dan AYNAN (paritet: qiymatni o'zgartirsangiz webda ham
// o'zgartiring). Tomchi qo'shimchalari: `drop` (maskot ko'ki — havola / info /
// ikkinchi darajali interaktiv), `logo`, `brandLip` (bosiladigan elementning
// pastki «labi»).
//
// Eski kalitlar (primary, card, text, …) — ALIAS: eski ekranlar v3 to'lqinlarida
// ko'chirilguncha yashaydi, oxirida o'chiriladi. Yangi kodda faqat yangi nomlar.

type Core = {
  bg: string;
  surface: string;
  surface2: string;
  elevated: string;
  border: string;
  borderStrong: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  fgOnBrand: string;
  brand: string;
  brandStrong: string;
  brandSoft: string;
  brandDeep: string;
  brandLip: string;
  accent: string;
  success: string;
  successSoft: string;
  successMark: string;
  warning: string;
  warningSoft: string;
  warningMark: string;
  danger: string;
  dangerSoft: string;
  dangerMark: string;
  info: string;
  infoSoft: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
  ring: string;
  drop: string;
  dropSoft: string;
  logo: string;
  overlay: string;
  skeleton: string;
  shadow: string;
};

type Legacy = {
  card: string;
  cardElevated: string;
  cardBorder: string;
  inputBg: string;
  primary: string;
  primaryLight: string;
  primarySoft: string;
  primaryShadow: string;
  hero: string;
  heroText: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  onPrimary: string;
  error: string;
  errorSoft: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  tabBarActiveBg: string;
  tabBarActiveBorder: string;
  present: string;
  absent: string;
  weekend: string;
  today: string;
};

export type ThemeColors = Core & Legacy;

function withLegacy(c: Core): ThemeColors {
  return {
    ...c,
    card: c.surface,
    cardElevated: c.elevated,
    cardBorder: c.border,
    inputBg: c.surface2,
    primary: c.brand,
    primaryLight: c.brandStrong,
    primarySoft: c.brandSoft,
    primaryShadow: c.brandLip,
    hero: c.brand,
    heroText: c.fgOnBrand,
    text: c.fg,
    textSecondary: c.fgMuted,
    textMuted: c.fgSubtle,
    onPrimary: c.fgOnBrand,
    error: c.danger,
    errorSoft: c.dangerSoft,
    tabBar: c.surface,
    tabBarBorder: c.border,
    tabBarActive: c.brandStrong,
    tabBarInactive: c.fgSubtle,
    tabBarActiveBg: c.brandSoft,
    tabBarActiveBorder: c.brandSoft,
    present: c.successMark,
    absent: c.dangerMark,
    weekend: c.surface2,
    today: c.brand,
  };
}

export const lightColors: ThemeColors = withLegacy({
  bg: '#F2F3FA',
  surface: '#FFFFFF',
  surface2: '#F3F3F5',
  elevated: '#FFFFFF',
  border: '#E7E8EA',
  borderStrong: '#D9D9DE',
  fg: '#23244A',
  fgMuted: '#4A4C6E',
  fgSubtle: '#5D5F84',
  fgOnBrand: '#FFFFFF',
  brand: '#7958FF',
  brandStrong: '#6247D9',
  brandSoft: '#F2EFFF',
  brandDeep: '#523ABA',
  brandLip: '#523ABA',
  accent: '#895B13',
  success: '#117243',
  successSoft: '#E3F4EC',
  successMark: '#18A15E',
  warning: '#89540A',
  warningSoft: '#FBF1E2',
  warningMark: '#E09420',
  danger: '#BB2929',
  dangerSoft: '#FBE9E9',
  dangerMark: '#E05252',
  info: '#15699C',
  infoSoft: '#E4F1F9',
  chart1: '#18A15E',
  chart2: '#E09420',
  chart3: '#E05252',
  chart4: '#7C5CFF',
  chart5: '#1B87C9',
  chart6: '#6E7191',
  ring: '#7C5CFF',
  drop: '#1CB0F6',
  dropSoft: '#DDF4FF',
  logo: '#0283DE',
  overlay: 'rgba(35,36,74,0.45)',
  skeleton: '#ECECF2',
  shadow: '#23244A',
});

export const darkColors: ThemeColors = withLegacy({
  bg: '#131430',
  surface: '#1B1D3E',
  surface2: '#222446',
  elevated: '#191A38',
  border: '#2A2C52',
  borderStrong: '#3A3C68',
  fg: '#EAEAF4',
  fgMuted: '#A6A8C6',
  fgSubtle: '#9193B7',
  fgOnBrand: '#FFFFFF',
  brand: '#7959FC',
  brandStrong: '#A99BFF',
  brandSoft: '#2B275D',
  brandDeep: '#5B41CC',
  brandLip: '#5B41CC',
  accent: '#FFB648',
  success: '#5FE39C',
  successSoft: '#233549',
  successMark: '#5FE39C',
  warning: '#FFC876',
  warningSoft: '#39313F',
  warningMark: '#FFB648',
  danger: '#FF9B9B',
  dangerSoft: '#392946',
  dangerMark: '#FF7A7A',
  info: '#57C8FF',
  infoSoft: '#223255',
  chart1: '#5FE39C',
  chart2: '#FFB648',
  chart3: '#FF7A7A',
  chart4: '#7C5CFF',
  chart5: '#57C8FF',
  chart6: '#6E7191',
  ring: '#7C5CFF',
  drop: '#49C0F8',
  dropSoft: '#1B3452',
  logo: '#1899D6',
  overlay: 'rgba(0,0,0,0.6)',
  skeleton: '#222446',
  shadow: '#000000',
});
