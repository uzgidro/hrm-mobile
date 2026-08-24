import { Platform } from 'react-native';

/**
 * `KeyboardAvoidingView` uchun behavior — IKKALA platformada ham beriladi.
 *
 * Ilgari kod `Platform.OS === 'ios' ? 'padding' : undefined` edi: Androidda
 * behavior YO'Q, chunki tarixan Android oynaning O'ZINI kichraytirardi
 * (`android:windowSoftInputMode=adjustResize`) va composer klaviatura
 * tepasiga chiqib qolardi.
 *
 * Expo SDK 57 da Androidda EDGE-TO-EDGE doimiy yoqilgan va uni o'chirib
 * bo'lmaydi: `expo-modules-core` HAR BIR activity `onCreate` da
 * `updateEdgeToEdgeFeatureFlag(activity)` ni chaqiradi (manba:
 * `expo-modules-core/android/.../edgeToEdge/EdgeToEdgePackage.kt` — tekshirildi,
 * hech qanday shart yoki config yo'q). Bunday oyna klaviatura chiqqanda
 * KICHRAYMAYDI — klaviatura kontent USTIGA chiqadi. Natijada `undefined`
 * behavior bilan yozish maydoni klaviatura ostida ko'rinmay qoladi
 * (foydalanuvchi shikoyati 2026-08-21).
 *
 * `app.json` da `softwareKeyboardLayoutMode` ATAYLAB qo'yilmadi: u native
 * config (prebuild) o'zgarishi bo'lardi, ya'ni `expo.version` bump + store
 * relizi talab qilinardi. Bu yechim esa sof JS — OTA bilan yetib boradi.
 *
 * Nega Androidda 'height', iOSda 'padding':
 *  - iOS: 'padding' — standart va eng silliq variant, animatsiya klaviatura
 *    bilan birga ketadi.
 *  - Android: 'padding' edge-to-edge oynada ishonchsiz (oyna balandligi
 *    o'zgarmagani uchun padding ba'zan hisobga olinmaydi); 'height' esa
 *    konteyner balandligini to'g'ridan-to'g'ri qisqartiradi va FlatList
 *    +composer birgalikda ko'tariladi.
 *
 * Funksiya sifatida — `Platform.OS` modul yuklanganda EMAS, chaqirilganda
 * o'qilsin (test platformani almashtirib tekshiradi).
 */
export function KEYBOARD_BEHAVIOR(): 'padding' | 'height' {
  return Platform.OS === 'ios' ? 'padding' : 'height';
}
