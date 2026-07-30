import { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { getApiErrorMessage } from '@/api/errors';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import type { Letter } from '@/types';
import { useConfirmRegistration } from '../api/mutations';
import { registeredNumberAvailabilityQuery } from '../api/queries';

// Devonxona "Tasdiqlash" dialog. The letter already has an auto-assigned
// registration number (it sits at pending_registration); the chancellery
// reviews it, may edit the number/date, and confirms. While the number differs
// from the auto value we live-check availability in the branch so the devonxona
// never confirms a duplicate. An empty number keeps the auto-assigned value.
export function ConfirmRegistrationModal({
  letter, visible, onClose, onConfirmed,
}: {
  letter: Letter;
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const confirmM = useConfirmRegistration(letter.id);

  const initialNumber = letter.registered_number ?? '';
  const [numberValue, setNumberValue] = useState(initialNumber);
  const [dateIso, setDateIso] = useState<string>(letter.registered_date ?? dayjs().toISOString());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Re-seed the fields each time the sheet opens (the letter may have changed).
  useEffect(() => {
    if (visible) {
      setNumberValue(letter.registered_number ?? '');
      setDateIso(letter.registered_date ?? dayjs().toISOString());
    }
  }, [visible, letter.registered_number, letter.registered_date]);

  // Debounce the number before hitting the availability endpoint.
  const [debounced, setDebounced] = useState(numberValue);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(numberValue), 400);
    return () => clearTimeout(id);
  }, [numberValue]);

  // Only check when the value actually changed from the auto-assigned one — the
  // letter already "owns" its own number, so re-checking the initial value would
  // needlessly report it as taken (exclude_id also guards this server-side).
  const checkEnabled = visible && debounced.trim() !== '' && debounced.trim() !== initialNumber.trim();
  const { data: availability, isFetching: checking } = useQuery(
    registeredNumberAvailabilityQuery(letter.organization_branch_id, debounced.trim(), letter.id, checkEnabled),
  );

  const taken = checkEnabled && !checking && availability?.available === false;
  const canConfirm = !confirmM.isPending && !checking && !taken;

  const availabilityLabel = useMemo(() => {
    if (!checkEnabled) return null;
    if (checking) return { text: t('letters.numberChecking'), color: colors.textMuted };
    if (availability?.available === false) return { text: t('letters.numberTaken'), color: colors.error };
    if (availability?.available === true) return { text: t('letters.numberFree'), color: colors.success };
    return null;
  }, [checkEnabled, checking, availability, t, colors]);

  const onSubmit = () => {
    confirmM.mutate(
      {
        registered_number: numberValue.trim() || null,
        registered_date: dayjs(dateIso).format('YYYY-MM-DD'),
      },
      {
        onSuccess: () => {
          onConfirmed();
          onClose();
        },
        onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('letters.confirmRegistrationTitle')}</Text>
          <Text style={styles.modalHint}>{t('letters.confirmRegistrationHint')}</Text>

          <Text style={styles.fieldLabel}>{t('letters.confirmRegistrationNumberLabel')}</Text>
          <View style={styles.numberRow}>
            <TextInput
              style={[styles.modalInput, styles.numberInput]}
              value={numberValue}
              onChangeText={setNumberValue}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            {availabilityLabel && (
              <View style={styles.availPill}>
                {checking && <ActivityIndicator size="small" color={colors.textMuted} />}
                <Text style={[styles.availText, { color: availabilityLabel.color }]}>{availabilityLabel.text}</Text>
              </View>
            )}
          </View>

          <Text style={styles.fieldLabel}>{t('letters.confirmRegistrationDateLabel')}</Text>
          <TouchableOpacity style={styles.dateField} onPress={() => setDatePickerOpen(true)} activeOpacity={0.7}>
            <Text style={styles.dateText}>{dayjs(dateIso).format('DD.MM.YYYY')}</Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onClose} disabled={confirmM.isPending}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalConfirm, !canConfirm && styles.modalConfirmDisabled]}
              onPress={onSubmit}
              disabled={!canConfirm}
            >
              {confirmM.isPending
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={styles.modalConfirmText}>{t('letters.confirmRegistrationSubmit')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DateTimePickerModal
        visible={datePickerOpen}
        value={dateIso}
        title={t('letters.confirmRegistrationDateLabel')}
        onConfirm={(iso) => { setDateIso(iso); setDatePickerOpen(false); }}
        onClose={() => setDatePickerOpen(false)}
      />
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 28 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: c.cardBorder },
    modalTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 8 },
    modalHint: { fontSize: 13, color: c.textMuted, marginBottom: 14, lineHeight: 18 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary, marginBottom: 6 },
    numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    modalInput: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: c.text, minHeight: 48,
    },
    numberInput: { flex: 1 },
    availPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    availText: { fontSize: 13, fontWeight: '700' },
    dateField: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 14, marginBottom: 18,
    },
    dateText: { fontSize: 15, color: c.text, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
    modalCancel: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    modalCancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '700' },
    modalConfirm: { backgroundColor: c.primary },
    modalConfirmDisabled: { opacity: 0.5 },
    modalConfirmText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
