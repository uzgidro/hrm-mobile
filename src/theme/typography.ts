// Nunito — dizayn «I · Tomchi» shrifti (Duolingo uslubidagi yumaloq, qalin).
// Paket qo'shilmagan: statik TTF'lar assets/fonts'da (OFL litsenziyasi yonida),
// expo-font'ning runtime `loadAsync` i bilan yuklanadi — native o'zgarish yo'q,
// shuning uchun OTA orqali chiqsa bo'ladi.
//
// `ff(weight)` shrift yuklangunicha tizim shriftiga shu og'irlikni beradi
// (yuklanmagan oilani ko'rsatish iOS'da xato beradi). ThemeProvider shriftlar
// tayyor bo'lgach `fontsReady` ni o'zgartiradi, useThemedStyles esa uslublarni
// qayta quradi — shu sababli `ff` ni faqat makeStyles yoki render ichida
// chaqiring, modul darajasidagi StyleSheet.create ichida emas.
import type { TextStyle } from 'react-native';

export type FontWeight = '400' | '600' | '700' | '800' | '900';

const FAMILY: Record<FontWeight, string> = {
  '400': 'Nunito_400Regular',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_900Black',
};

export const FONT_ASSETS = {
  Nunito_400Regular: require('../../assets/fonts/Nunito_400Regular.ttf'),
  Nunito_600SemiBold: require('../../assets/fonts/Nunito_600SemiBold.ttf'),
  Nunito_700Bold: require('../../assets/fonts/Nunito_700Bold.ttf'),
  Nunito_800ExtraBold: require('../../assets/fonts/Nunito_800ExtraBold.ttf'),
  Nunito_900Black: require('../../assets/fonts/Nunito_900Black.ttf'),
};

let ready = false;

export function markFontsReady(): void {
  ready = true;
}

export function fontsAreReady(): boolean {
  return ready;
}

/** Nunito of the given weight once loaded; the system font at that weight until then. */
export function ff(weight: FontWeight = '700'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return ready ? { fontFamily: FAMILY[weight] } : { fontWeight: weight };
}
