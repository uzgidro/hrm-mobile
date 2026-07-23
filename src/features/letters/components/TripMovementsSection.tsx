import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Letter, BusinessTripMovement, User } from '@/types';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { isSiteMasterAdmin, isBranchHr } from '@/utils/roles';
import { normalizeLetterType } from '@/utils/letterStatus';
import { Section } from './DetailParts';
import { tripMovementsQuery } from '../api/queries';
import { useConfirmReturn } from '../api/mutations';

// The kelish/ketish movements of a business trip + the "confirm return" action.
// Renders only for business_trip letters. Confirming the return sets
// is_trip_confirmed on the backend, which unblocks the report stage — the exact
// blocker that stopped an employee from filing a trip report on mobile.
export function TripMovementsSection({
  letter,
  user,
  onChanged,
}: {
  letter: Letter;
  user: User | null | undefined;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const isTrip = normalizeLetterType(letter.letter_type) === 'business_trip';

  // Branches tied to the trip; managing movements is scoped to their HR (or a
  // site master-admin) — mirrors the web LetterDetailModal gate.
  const tripBranchIds = useMemo(
    () =>
      [
        letter.organization_branch_id,
        letter.destination_branch_id,
        ...(letter.destination_branches ?? []).map((b) => b?.id),
      ].filter((x): x is number => x != null),
    [letter],
  );
  const canManage =
    isSiteMasterAdmin(user) || tripBranchIds.some((bid) => isBranchHr(user, bid));
  const canConfirmReturn = canManage && !letter.is_trip_confirmed;

  const { data: movements = [], isLoading } = useQuery({
    ...tripMovementsQuery(letter.id),
    enabled: isTrip && !!letter.id,
  });
  const confirmM = useConfirmReturn(letter.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [returnDate, setReturnDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');

  if (!isTrip) return null;

  const submitConfirm = () => {
    if (!returnDate.trim()) {
      Alert.alert(t('letters.actionError'), t('letters.confirmReturnDateLabel'));
      return;
    }
    setModalOpen(false);
    confirmM.mutate(
      { return_date: returnDate.trim(), note: note.trim() || null },
      {
        onSuccess: () => {
          setNote('');
          onChanged();
        },
        onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
      },
    );
  };

  return (
    <Section title={t('letters.sectionMovements')}>
      {letter.is_trip_confirmed && !!letter.actual_return_date && (
        <View style={styles.confirmedBadge}>
          <Icon name="check" size={14} color={colors.success} />
          <Text style={styles.confirmedText}>
            {t('letters.returnConfirmedBadge', { date: dayjs(letter.actual_return_date).format('DD.MM.YYYY') })}
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primaryLight} />
      ) : movements.length === 0 ? (
        <Text style={styles.empty}>{t('letters.movementEmpty')}</Text>
      ) : (
        movements.map((m: BusinessTripMovement) => (
          <View key={m.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: m.event_type === 'arrived' ? colors.success : colors.primaryLight }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {m.event_type === 'arrived' ? t('letters.movementArrived') : t('letters.movementDeparted')}
                {m.branch?.name ? `  ·  ${m.branch.name}` : ''}
              </Text>
              {!!m.note && <Text style={styles.rowNote}>{m.note}</Text>}
            </View>
            {!!m.turnstile_event_id && <Text style={styles.faceId}>{t('letters.movementFaceId')}</Text>}
            <Text style={styles.rowDate}>{dayjs(m.event_date).format('DD.MM.YYYY')}</Text>
          </View>
        ))
      )}

      {canConfirmReturn && (
        <TouchableOpacity
          style={styles.confirmBtn}
          activeOpacity={0.85}
          onPress={() => setModalOpen(true)}
          disabled={confirmM.isPending}
        >
          {confirmM.isPending
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : <><Icon name="check" size={16} color={colors.onPrimary} /><Text style={styles.confirmBtnText}>{t('letters.confirmReturn')}</Text></>}
        </TouchableOpacity>
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('letters.confirmReturn')}</Text>
            <Text style={styles.modalLabel}>{t('letters.confirmReturnDateLabel')}</Text>
            <TextInput
              style={styles.input}
              value={returnDate}
              onChangeText={setReturnDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={note}
              onChangeText={setNote}
              placeholder={t('letters.movementNote')}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitConfirm} activeOpacity={0.8}>
                <Text style={styles.modalSubmitText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Section>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    confirmedText: { fontSize: 13, color: c.success, fontWeight: '600' },
    empty: { color: c.textMuted, fontSize: 14, paddingVertical: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.cardBorder },
    dot: { width: 8, height: 8, borderRadius: 4 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    rowNote: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    rowDate: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
    faceId: { fontSize: 11, color: c.primary, fontWeight: '700' },
    confirmBtn: { marginTop: 12, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    confirmBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 24 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 20, gap: 10 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    modalLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    input: { backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
    modalCancel: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    modalCancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
    modalSubmit: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: c.primary },
    modalSubmitText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
