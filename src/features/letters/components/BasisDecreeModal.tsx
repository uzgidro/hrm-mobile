import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { getApiErrorMessage } from '@/api/errors';
import { DatePickerModal } from '@/components/DatePicker';
import { useSetBasisDecree } from '../api/mutations';

// ASOS BUYRUQ oynasi — KADR safarga buyruq raqami va sanasini kiritadi
// (`utils/tripStatus.canSetBasisDecree` ruxsat bersa). Buyruq raqami ko'pincha
// safar YAKUNLANGACH ma'lum bo'ladi, shu bois backendда bosqich cheklovi yo'q.
//
// IKKALA maydon ham MAJBURIY: bo'sh sana bilan yuborilsa backend 422 beradi,
// shuning uchun tugma shu yergacha o'chirilgan turadi.
//
// Yonidagi `ReasonModal` / `ConfirmRegistrationModal` kabi ALOHIDA komponent:
// o'z holati (raqam/sana/pikcher) faqat shu oynaga tegishli va tashqarida
// kerak emas — `LetterDetailView` da ular 4 ta ortiqcha `useState` edi.
export function BasisDecreeModal({
  letterId,
  visible,
  initialNumber,
  initialDate,
  onClose,
  onSaved,
}: {
  letterId: number;
  visible: boolean;
  /** Mavjud qiymatlar — tahrirlashda oyna ular bilan ochiladi. */
  initialNumber?: string | null;
  initialDate?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const saveM = useSetBasisDecree(letterId);

  const [number, setNumber] = useState(initialNumber ?? '');
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Oyna har ochilganda joriy qiymatlardan boshlansin. `visible` false dan
  // true ga o'tgan payt qayta seed qilamiz — aks holda ikkinchi ochilishda
  // oldingi kiritilgan matn qolib ketardi.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setNumber(initialNumber ?? '');
      setDate(initialDate ?? null);
    }
  }

  const canSave = !!number.trim() && !!date && !saveM.isPending;

  const submit = () => {
    if (!canSave) return;
    saveM.mutate(
      { number, date: date! },
      {
        onSuccess: () => { onClose(); onSaved(); },
        onError: (e) =>
          Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
      },
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('letters.fieldBasisDecree')}</Text>

            <Text style={styles.label}>{t('letters.basisDecreeNumber')}</Text>
            <TextInput
              style={styles.input}
              value={number}
              onChangeText={setNumber}
              placeholder={t('letters.basisDecreeNumberPlaceholder')}
              placeholderTextColor={colors.textMuted}
              testID="basis-decree-number"
            />

            <Text style={styles.label}>{t('letters.basisDecreeDate')}</Text>
            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.8}
              onPress={() => setPickerOpen(true)}
              testID="basis-decree-date"
            >
              <Text style={date ? styles.inputText : styles.inputPlaceholder}>
                {date ? dayjs(date).format('DD.MM.YYYY') : t('letters.placeholderSelectDate')}
              </Text>
            </TouchableOpacity>

            <View style={styles.btns}>
              <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submit, !canSave && styles.submitDisabled]}
                disabled={!canSave}
                onPress={submit}
                activeOpacity={0.8}
                testID="basis-decree-submit"
              >
                <Text style={styles.submitText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={pickerOpen}
        value={date}
        title={t('letters.basisDecreeDate')}
        onConfirm={setDate}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 18, gap: 8 },
    title: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 2 },
    label: { fontSize: 12, color: c.textMuted },
    input: { borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: c.text, fontSize: 14, justifyContent: 'center' },
    inputText: { color: c.text, fontSize: 14 },
    inputPlaceholder: { color: c.textMuted, fontSize: 14 },
    btns: { flexDirection: 'row', gap: 10, marginTop: 6 },
    cancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.cardBorder },
    cancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
    submit: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.primary },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
