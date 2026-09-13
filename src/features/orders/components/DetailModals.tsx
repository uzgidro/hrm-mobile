import { TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { parseDdMmYyyy } from '@/lib/dateText';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ModalCard } from '@/components/ModalCard';

// The reject-reason and register (act-number) modals of the decree detail. Both
// are controlled by the screen; the input values live in the screen so the
// exact validate/close/submit flow of the original is preserved verbatim.
//
// Oyna korpusi (overlay/karta/tugmalar) — `@/components/ModalCard`.
export function RejectModal({
  visible, reason, onChangeReason, onClose, onSubmit,
}: {
  visible: boolean; reason: string; onChangeReason: (t: string) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  return (
    <ModalCard
      visible={visible}
      title={t('orders.rejectTitle')}
      confirmLabel={t('common.send')}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <TextInput
        style={styles.modalInput}
        placeholder={t('orders.rejectPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={reason}
        onChangeText={onChangeReason}
        multiline
      />
    </ModalCard>
  );
}

export function RegisterModal({
  visible, actNumber, onChangeActNumber, actDate, onChangeActDate, onClose, onSubmit,
}: {
  visible: boolean; actNumber: string; onChangeActNumber: (t: string) => void;
  /** DD.MM.YYYY as typed; the caller converts to ISO. Web stamp-modal parity. */
  actDate: string; onChangeActDate: (t: string) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const dateValid = actDate.trim() === '' || parseDdMmYyyy(actDate) !== null;
  return (
    <ModalCard
      visible={visible}
      title={t('orders.registerTitle')}
      hint={t('orders.registerHint')}
      confirmLabel={t('common.confirm')}
      disabled={!dateValid}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <TextInput
        style={styles.modalInput}
        placeholder={t('orders.registerPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={actNumber}
        onChangeText={onChangeActNumber}
        // Raqam MATN bo'lishi mumkin ("125/2026-QQ") — sonli klaviatura EMAS.
        autoCapitalize="characters"
      />
      <TextInput
        style={[styles.modalInput, !dateValid && styles.modalInputError]}
        placeholder={t('orders.registerDatePlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={actDate}
        onChangeText={onChangeActDate}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel={t('orders.registerDateLabel')}
      />
    </ModalCard>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    // Qiymatlar ASL holicha (faqat `marginBottom` ketdi — endi oralarni
    // `ModalCard` ning `gap` i beradi).
    modalInput: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      padding: 12, fontSize: 15, color: c.text, minHeight: 48, textAlignVertical: 'top',
    },
    modalInputError: { borderColor: c.error },
  });
