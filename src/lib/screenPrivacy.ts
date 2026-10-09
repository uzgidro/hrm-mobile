// Maxfiy ma'lumotli ekranlarda skrinshot / ekran yozuvini taqiqlash (Android
// FLAG_SECURE, iOS — expo-screen-capture). Qolgan ekranlarda skrinshot RUXSAT
// (foydalanuvchi qarori 2026-10-09): faqat JShShIR, pasport, manzil va shu kabi
// shaxsiy ma'lumot ko'rinadigan joylar yopiladi. Ilovalar almashtirgichidagi
// ko'rinish ham shu ekranlarda qora bo'ladi.
//
// ⚠️ Pastki oyna (ui/Sheet = RN Modal) Android'da ALOHIDA oyna: u FLAG_SECURE ni
// faqat OCHILISH paytida asosiy oynadan ko'chiradi. Shuning uchun maxfiy
// sheet'lar uchun hook sheet ichida emas, uni ochadigan EKRANDA chaqiriladi.
import { useEffect, useId } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Komponent ekranda turganda skrinshotni taqiqlaydi. Har chaqiruv o'z kaliti
 * bilan: ikki maxfiy ekran ustma-ust bo'lsa, birinchisi yopilganda ikkinchisi
 * himoyasiz qolmaydi.
 */
export function useSensitiveScreen(active: boolean = true): void {
  const key = useId();
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;
    // Native modul yo'q bo'lsa (Expo Go) — ekran ochilaversin, faqat himoyasiz.
    const safe = (fn: () => Promise<void>) => {
      try {
        fn().catch(() => {});
      } catch {
        /* ignore */
      }
    };
    safe(() => ScreenCapture.preventScreenCaptureAsync(key));
    return () => safe(() => ScreenCapture.allowScreenCaptureAsync(key));
  }, [active, key]);
}
