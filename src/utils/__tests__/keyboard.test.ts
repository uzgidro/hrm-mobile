/**
 * Klaviatura ochilganda YOZISH MAYDONI ko'rinib turishi kerak.
 *
 * Muammo (foydalanuvchi, 2026-08-21): "AI yordamchida matn kiritayotganda
 * kiritish maydoni klaviatura ostida qolib ketadi".
 *
 * Sabab: `behavior` faqat iOS uchun berilgan edi, Androidda `undefined`.
 * Ilgari bu ishlardi, chunki Android oynani o'zi kichraytirardi
 * (`softwareKeyboardLayoutMode: resize`). Expo SDK 54+ da esa Androidda
 * EDGE-TO-EDGE doimiy yoqilgan va oyna endi KICHRAYMAYDI — natijada
 * composer klaviatura ostida qoladi.
 *
 * Shu bois `behavior` IKKALA platformada ham berilishi shart. Test aynan
 * shuni qulflaydi: Android uchun ham `undefined` bo'lmasligi kerak.
 */
import { Platform } from 'react-native';
import { KEYBOARD_BEHAVIOR } from '../keyboard';

describe('KEYBOARD_BEHAVIOR', () => {
  const orig = Platform.OS;
  afterEach(() => { (Platform as { OS: string }).OS = orig; });

  it('iOS: padding bilan ko\'tariladi', () => {
    (Platform as { OS: string }).OS = 'ios';
    expect(KEYBOARD_BEHAVIOR()).toBe('padding');
  });

  // Asosiy regressiya: avval bu yerda `undefined` edi va composer
  // Androidda klaviatura ostida qolardi (edge-to-edge, oyna kichraymaydi).
  it('Android: `undefined` EMAS — aks holda composer klaviatura ostida qoladi', () => {
    (Platform as { OS: string }).OS = 'android';
    expect(KEYBOARD_BEHAVIOR()).toBeDefined();
  });

  it('Android: height — edge-to-edge oynada ishonchli ishlaydi', () => {
    (Platform as { OS: string }).OS = 'android';
    expect(KEYBOARD_BEHAVIOR()).toBe('height');
  });
});
