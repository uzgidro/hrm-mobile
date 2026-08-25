import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * TanStack Query ning "fokus" tushunchasini React Native `AppState` ga ulaydi.
 *
 * NEGA KERAK: web da Query `document.visibilitychange` ni o'zi tinglaydi, RN da
 * esa bunday hodisa YO'Q va kutubxona hech nimaga ulanmaydi — ya'ni ilova
 * YIG'ILGANDA ham barcha `refetchInterval` taymerlari tarmoqqa urib turadi.
 * Ilovada 7 ta bunday polling bor (buyruqlar, xatlar, bildirishnomalar, menyu
 * nishonlari, texnik yordam, terminallar), ulardan menyu nishonlari
 * `app/(tabs)/_layout.tsx` da DOIM osilgan — demak fon rejimida ham daqiqasiga
 * bir necha so'rov ketardi. Bu batareya va (dala xodimlari uchun muhim) mobil
 * trafik.
 *
 * Ulangach: `background`/`inactive` da pollingdan to'xtaydi, `active` ga
 * qaytganda Query o'zi bir marta yangilaydi (`refetchOnWindowFocus`).
 *
 * Qaytadigan funksiya obunani uzadi (root layout unmount bo'lganda chaqiriladi).
 */
export function wireQueryFocusToAppState(): () => void {
  const onChange = (state: AppStateStatus) => {
    focusManager.setFocused(state === 'active');
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
