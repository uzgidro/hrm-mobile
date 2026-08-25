import { StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ModalCard } from '@/components/ModalCard';

// Bir sababli amallar uchun umumiy oyna (web RejectReasonModal ekvivalenti):
// devonxona "Qaytarish" / "Hisobotni qaytarish" (sabab MAJBURIY) va KADR
// "Safarni bekor qilish" (sabab IXTIYORIY). `required` bo'lsa bo'sh matnda
// tasdiqlash tugmasi o'chirilgan bo'ladi — backend 400 `reason_required`
// qaytarmasin.
//
// Oyna korpusi (overlay/karta/tugmalar) `@/components/ModalCard` da — ilgari
// bu yerda o'z nusxasi bor edi va overlay `rgba(0,0,0,0.6)` deb qattiq
// yozilgandi (QORONG'I mavzu qiymati), ya'ni yorug' mavzuda noto'g'ri edi.
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

  return (
    <ModalCard
      visible={visible}
      title={title}
      hint={label}
      confirmLabel={confirmLabel}
      cancelLabel={t('common.cancel')}
      disabled={required && reason.trim() === ''}
      busy={busy}
      destructive={destructive}
      onClose={onClose}
      onSubmit={onSubmit}
      testID={testID}
    >
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
    </ModalCard>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    input: {
      minHeight: 88, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14,
    },
  });
