import { TextInput, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  visible, actNumber, onChangeActNumber, actDate, onPickDate, onClose, onSubmit,
}: {
  visible: boolean; actNumber: string; onChangeActNumber: (t: string) => void;
  /** Ro'yxatga olish sanasi — web devonxonasi ham tanlaydi. Bo'sh bo'lsa
      backend bugungi sanani qo'yadi. */
  actDate?: string;
  onPickDate?: () => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  return (
    <ModalCard
      visible={visible}
      title={t('orders.registerTitle')}
      hint={t('orders.registerHint')}
      confirmLabel={t('common.confirm')}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <TextInput
        style={styles.modalInput}
        placeholder={t('orders.registerPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={actNumber}
        onChangeText={onChangeActNumber}
        keyboardType="number-pad"
      />
      {!!onPickDate && (
        <TouchableOpacity style={styles.pickRow} onPress={onPickDate} activeOpacity={0.8}>
          <Text style={styles.pickLabel}>{t('orders.registerDate')}</Text>
          <Text style={actDate ? styles.pickValue : styles.pickPlaceholder}>
            {actDate || t('orders.registerDateAuto')}
          </Text>
        </TouchableOpacity>
      )}
    </ModalCard>
  );
}


/**
 * QO'LLASH oynasi (KADR): buyruq `confirmed` bo'lgach ta'til / ko'chirish /
 * ishdan bo'shatish yozuvini yaratadi va buyruqni `applied` ga o'tkazadi.
 *
 * ⚠️ Mobilda bu qadam UMUMAN yo'q edi: buyruq `confirmed` da tiqilib qolar,
 * ta'til yozuvi yaratilmasdi va oqim faqat webda yakunlanardi.
 *
 * Web `OrderDetailModal` bilan bir xil qoida: ayrim turlarda (ko'chirish,
 * ishga qabul, bo'shatish, chaqirib olish) TUGASH SANASI shart emas va
 * "doimiy" belgisi bor.
 */
export function ApplyModal({
  visible, employeeLabel, onPickEmployee, startDate, endDate, needsEndDate,
  allowPermanent, isPermanent, onTogglePermanent, onPickStart, onPickEnd,
  busy, onClose, onSubmit,
}: {
  visible: boolean;
  employeeLabel: string | null;
  onPickEmployee: () => void;
  startDate: string;
  endDate: string;
  needsEndDate: boolean;
  allowPermanent: boolean;
  isPermanent: boolean;
  onTogglePermanent: () => void;
  onPickStart: () => void;
  onPickEnd: () => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const disabled = !employeeLabel || !startDate || (needsEndDate && !endDate);

  const Row = ({ label, value, onPress }: { label: string; value: string | null; onPress: () => void }) => (
    <TouchableOpacity style={styles.pickRow} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.pickLabel}>{label}</Text>
      <Text style={value ? styles.pickValue : styles.pickPlaceholder} numberOfLines={1}>
        {value || t('orders.selectPlaceholder')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ModalCard
      visible={visible}
      title={t('orders.applyTitle')}
      hint={t('orders.applyHint')}
      confirmLabel={t('orders.actionApply')}
      disabled={disabled}
      busy={busy}
      onClose={onClose}
      onSubmit={onSubmit}
      testID="decree-apply-modal"
    >
      <Row label={t('orders.applyEmployee')} value={employeeLabel} onPress={onPickEmployee} />
      <Row label={t('orders.applyStart')} value={startDate || null} onPress={onPickStart} />
      {needsEndDate && (
        <Row label={t('orders.applyEnd')} value={endDate || null} onPress={onPickEnd} />
      )}
      {allowPermanent && (
        <TouchableOpacity style={styles.permRow} onPress={onTogglePermanent} activeOpacity={0.8}>
          <View style={[styles.checkbox, isPermanent && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
          <Text style={styles.pickLabel}>{t('orders.applyPermanent')}</Text>
        </TouchableOpacity>
      )}
    </ModalCard>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pickRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    pickLabel: { fontSize: 13, color: c.textSecondary },
    pickValue: { fontSize: 14, color: c.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    pickPlaceholder: { fontSize: 14, color: c.textMuted, flexShrink: 1, textAlign: 'right' },
    permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    checkbox: {
      width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: c.cardBorder,
    },
    // Qiymatlar ASL holicha (faqat `marginBottom` ketdi — endi oralarni
    // `ModalCard` ning `gap` i beradi).
    modalInput: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      padding: 12, fontSize: 15, color: c.text, minHeight: 48, textAlignVertical: 'top',
    },
  });
