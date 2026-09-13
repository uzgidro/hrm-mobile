import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { KeyboardAvoider } from './KeyboardAvoider';
import type { ThemeColors } from '../theme/palettes';

/**
 * Ilova bo'ylab YAGONA dialog-oyna: overlay + karta + sarlavha + (ixtiyoriy
 * izoh) + kontent + "Bekor qilish / Tasdiqlash" qatori.
 *
 * NEGA: bu shakl qo'lda 7 marta takrorlangan edi (ReasonModal, BasisDecree,
 * ConfirmRegistration, DetailModals×2, TripMovements, SupportDetail) va
 * nusxalar bir-biridan FARQ qilardi — radius 16/18, padding 18/20,
 * gap 8/10/12, tugma radiusi 10/12, "Bekor" foni `c.cardBorder` yoki
 * `c.bg`+ramka. Foydalanuvchi buni bir ilovada turlicha ko'rinadigan
 * oynalar sifatida sezardi.
 *
 * ⚠️ Bundan tashqari ikkita nusxa mavzu tokenini chetlab o'tib overlay'ni
 * `rgba(0,0,0,0.6)` deb QATTIQ yozgan edi — bu `palettes.ts` dagi QORONG'I
 * mavzuning qiymati. Ya'ni yorug' mavzuda ular noto'g'ri (juda to'q) fon
 * ko'rsatardi. Bu yerda faqat `c.overlay` ishlatiladi.
 *
 * Bu komponent SOF PREZENTATSION: mutatsiya, validatsiya va tarjima
 * (sarlavha/tugma matni) chaqiruvchida qoladi. Faqat "Bekor qilish"
 * `common.cancel` dan olinadi, chunki u hamma joyda bir xil.
 */
export function ModalCard({
  visible,
  title,
  hint,
  children,
  confirmLabel,
  cancelLabel,
  disabled = false,
  busy = false,
  destructive = false,
  onClose,
  onSubmit,
  testID,
}: {
  visible: boolean;
  title: string;
  /** Sarlavha ostidagi kichik tushuntirish matni. */
  hint?: string;
  children?: ReactNode;
  confirmLabel: string;
  /** Standart — `common.cancel`. */
  cancelLabel?: string;
  /** Tasdiqlash o'chirilgan (masalan majburiy maydon bo'sh). */
  disabled?: boolean;
  /** So'rov ketmoqda — tugmada spinner, bosish bloklangan. */
  busy?: boolean;
  /** Buzuvchi amal (o'chirish/bekor qilish) — tugma qizil. */
  destructive?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const blocked = disabled || busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Bu oynalarning KO'PIDA matn maydoni bor (kelishuv izohi, rad etish
          sababi, devonxona raqami, safar harakati). Modal ota-ekrandagi
          KeyboardAvoidingView ni MEROS OLMAYDI — shu sababli klaviatura
          kartani ham, "Bekor / Tasdiqlash" tugmalarini ham yopib qo'yardi.
          Bitta o'rash 7 ta dialogni birdan tuzatadi. */}
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!!hint && <Text style={styles.hint}>{hint}</Text>}
          {children}
          <View style={styles.btns}>
            <TouchableOpacity
              style={styles.cancel}
              onPress={onClose}
              activeOpacity={0.8}
              testID={testID ? `${testID}-cancel` : undefined}
            >
              <Text style={styles.cancelText}>{cancelLabel ?? t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submit, destructive && styles.submitDestructive, blocked && styles.submitDisabled]}
              onPress={onSubmit}
              disabled={blocked}
              activeOpacity={0.8}
              testID={testID}
            >
              {busy
                ? <ActivityIndicator size="small" color={colors.onPrimary} />
                : <Text style={styles.submitText}>{confirmLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

// Yagona qiymatlar to'plami. Avvalgi 7 nusxadan eng ko'p uchraydigani
// tanlandi: radius 18 / padding 20 (4 nusxada), gap 10 (3 nusxada),
// paddingHorizontal 24, tugma radiusi 12.
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 24 },
    card: {
      backgroundColor: c.card, borderRadius: 18, padding: 20, gap: 10,
      borderWidth: 1, borderColor: c.cardBorder,
    },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    hint: { fontSize: 12, color: c.textMuted },
    btns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancel: {
      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    cancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
    submit: {
      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primary,
    },
    submitDestructive: { backgroundColor: c.error },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
