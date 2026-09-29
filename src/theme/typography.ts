// «Tomchi × v2» shriftlari: Nunito — sarlavhalar, katta raqamlar, tugma yozuvlari
// (display); Inter — matn, jadval, forma (text). Ikkalasi ham expo-font'ning
// runtime `loadAsync` i bilan yuklanadi (ThemeProvider).
//
// `ff(weight, role)` shrift yuklangunicha tizim shriftiga shu og'irlikni beradi
// (yuklanmagan oilani ko'rsatish iOS'da xato beradi). ThemeProvider shriftlar
// tayyor bo'lgach `fontsReady` ni o'zgartiradi, useThemedStyles esa uslublarni
// qayta quradi — shu sababli `ff` ni faqat makeStyles yoki render ichida
// chaqiring, modul darajasidagi StyleSheet.create ichida emas.
import type { TextStyle } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';
export type FontRole = 'display' | 'text';

// Yuklanadigan og'irliklar: Nunito 400/600/700/800/900, Inter 400–700.
// Yo'q og'irlik eng yaqin yuklanganiga tushadi.
const NUNITO: Record<FontWeight, string> = {
  '400': 'Nunito_400Regular',
  '500': 'Nunito_600SemiBold',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_900Black',
};
const INTER: Record<FontWeight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_700Bold',
  '900': 'Inter_700Bold',
};

export const FONT_ASSETS = {
  Nunito_400Regular: require('../../assets/fonts/Nunito_400Regular.ttf'),
  Nunito_600SemiBold: require('../../assets/fonts/Nunito_600SemiBold.ttf'),
  Nunito_700Bold: require('../../assets/fonts/Nunito_700Bold.ttf'),
  Nunito_800ExtraBold: require('../../assets/fonts/Nunito_800ExtraBold.ttf'),
  Nunito_900Black: require('../../assets/fonts/Nunito_900Black.ttf'),
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

let ready = false;

export function markFontsReady(): void {
  ready = true;
}

export function fontsAreReady(): boolean {
  return ready;
}

/** Loaded family for the weight/role; the system font at that weight until then. */
export function ff(
  weight: FontWeight = '700',
  role: FontRole = 'display',
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (!ready) return { fontWeight: weight };
  return { fontFamily: (role === 'display' ? NUNITO : INTER)[weight] };
}
