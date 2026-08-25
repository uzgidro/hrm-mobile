import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

// Bir sababli amallar uchun umumiy oyna (web RejectReasonModal ekvivalenti):
// devonxona "Qaytarish" / "Hisobotni qaytarish" (sabab MAJBURIY) va KADR
// "Safarni bekor qilish" (sabab IXTIYORIY). `required` bo'lsa bo'sh matnda
// tasdiqlash tugmasi o'chirilgan bo'ladi — backend 400 `reason_required`
// qaytarmasin.
export function ReasonModal({
  visible,
  title,
  label,
  placeholder,
  reason,
  required = true,
  busy = false,
  confirmLabel,
  destructive = false,
  onChangeReason,
  onClose,
  onSubmit,
  testID,
}: {
  visible: boolean;
  title: string;
  label: string;
  placeholder?: string;
  reason: string;
  required?: boolean;
  busy?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  onChangeReason: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const blocked = busy || (required && reason.trim() === '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={onChangeReason}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            testID={testID ? `${testID}-input` : undefined}
          />
          <View style={styles.btns}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submit, destructive && styles.submitDestructive, blocked && styles.submitDisabled]}
              onPress={onSubmit}
              disabled={blocked}
              activeOpacity={0.8}
              testID={testID}
            >
              <Text style={styles.submitText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 18, gap: 10 },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    label: { fontSize: 12, color: c.textMuted },
    input: { minHeight: 90, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, padding: 12, color: c.text, fontSize: 14 },
    btns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.cardBorder },
    cancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
    submit: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.primary },
    submitDestructive: { backgroundColor: c.error },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
