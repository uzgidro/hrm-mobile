// Klaviatura ochilganda kontentni ko'tarib turuvchi umumiy qobiq.
//
// Qoidaning O'ZI `src/utils/keyboard.ts` dagi `KEYBOARD_BEHAVIOR()` da —
// u Androidda edge-to-edge oyna KICHRAYMASLIGINI hisobga oladi (Expo SDK 57).
// Bu komponent shu qoidani QAYTA YOZMAYDI, faqat uni bitta joyga o'raydi:
// forma ekranlari va tanlagich oynasi ham xuddi shu himoyani olsin.
//
// NEGA KERAK: AI yordamchi va texnik yordam yozishmasi allaqachon tuzatilgan
// edi, lekin FORMA ekranlari (bildirgi/ariza, buyruq, ta'til, hisobot, KPI)
// va PickerModal ichidagi QIDIRUV maydoni himoyasiz qolgan edi — klaviatura
// pastki maydonlarni va ko'p tanlovdagi "Tayyor" tugmasini yopib qo'yardi.
import React from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { KEYBOARD_BEHAVIOR } from '@/utils/keyboard';

export function KeyboardAvoider({
  children,
  style,
  /** Qo'shimcha siljish (masalan ustidagi sarlavha balandligi). */
  offset = 0,
  enabled = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
  enabled?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={KEYBOARD_BEHAVIOR()}
      keyboardVerticalOffset={offset}
      enabled={enabled}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default KeyboardAvoider;
