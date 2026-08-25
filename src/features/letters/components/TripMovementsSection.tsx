import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ModalCard } from '@/components/ModalCard';
import type { Letter, BusinessTripMovement, User } from '@/types';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { isSiteMasterAdmin, isBranchHr } from '@/utils/roles';
import { normalizeLetterType, canConfirmTripReturn } from '@/utils/letterStatus';
import { Section } from './DetailParts';
import { tripMovementsQuery } from '../api/queries';
import { useConfirmReturn, useSelfConfirmReturn, useUpdateReturnDate } from '../api/mutations';

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
  // Stage gate: the backend blocks confirm-return with 400 trip_not_registered
  // until the chancellery registers the trip (it's in the pre-registration set).
  // A site master-admin bypasses the stage, matching the backend. Without this a
  // branch HR would see "Keldi" on a pending_registration trip and hit the 400.
  const stageAllowsReturn = isSiteMasterAdmin(user) || canConfirmTripReturn(letter);
  const canConfirmReturn = canManage && !letter.is_trip_confirmed && stageAllowsReturn;

  const { data: movements = [], isLoading } = useQuery({
    ...tripMovementsQuery(letter.id),
    enabled: isTrip && !!letter.id,
  });
  const confirmM = useConfirmReturn(letter.id);
  const selfFinishM = useSelfConfirmReturn(letter.id);

  // XODIMNING O'ZI safarni yakunlashi (backend 2026-08-19). Shartni SERVER
  // hisoblaydi: xodim o'z filiali turniketidan (Face ID) o'tgan bo'lishi va
  // undan keyin boshqa filialga ketmagan bo'lishi kerak; yakunlash sanasi ham
  // o'sha o'tish sanasi. Shu bois bu yerda status/rol qaytadan tekshirilmaydi —
  // aks holda tugma ko'rinib, bosganda `face_id_required` 400 bo'lardi.
  const canSelfFinish = !!letter.available_actions?.can_self_finish_trip;
  const selfFinishDate = letter.available_actions?.self_finish_date;

  const askSelfFinish = () => {
    // Turniket sanasi YO'Q — sanani xodim tanlaydi (modal ochiladi).
    if (!selfFinishDate) {
      setEditMode(false);
      setSelfMode(true);
      setReturnDate(dayjs().format('YYYY-MM-DD'));
      setModalOpen(true);
      return;
    }
    Alert.alert(
      t('letters.selfFinishTitle'),
      t('letters.selfFinishConfirm', {
        date: selfFinishDate ? dayjs(selfFinishDate).format('DD.MM.YYYY') : '—',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('letters.selfFinishYes'),
          onPress: () =>
            selfFinishM.mutate(undefined, {
              onSuccess: () => onChanged(),
              onError: (e) =>
                Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
            }),
        },
      ],
    );
  };

  const editDateM = useUpdateReturnDate(letter.id);
  // Modal ikki ish uchun: qaytishni TASDIQLASH va tasdiqlangan sanani TUZATISH
  // (backend 2026-08-19: PATCH /letters/{id}/return-date, har qanday bosqichda).
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  /* SODDALASHTIRILGAN tartib (rais va yordamchilari, backend 2026-08-21):
     turniketdan o'tish sharti qo'llanmaydi, shu bois `self_finish_date` bo'sh
     keladi va qaytgan sanani XODIMNING O'ZI belgilaydi (web bilan bir xil). */
  const [selfMode, setSelfMode] = useState(false);
  const [returnDate, setReturnDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');

  if (!isTrip) return null;

  const submitConfirm = () => {
    if (!returnDate.trim()) {
      Alert.alert(t('letters.actionError'), t('letters.confirmReturnDateLabel'));
      return;
    }
    setModalOpen(false);
    if (selfMode) {
      setSelfMode(false);
      selfFinishM.mutate(returnDate.trim(), {
        onSuccess: () => onChanged(),
        onError: (e) =>
          Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
      });
      return;
    }
    if (editMode) {
      editDateM.mutate(returnDate.trim(), {
        onSuccess: () => onChanged(),
        onError: (e) =>
          Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
      });
      return;
    }
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
          {/* Sana XATO kiritilgan bo'lsa KADR uni tuzatadi — yakunlangan
              safarda ham (backend 2026-08-19). */}
          {canManage && (
            <TouchableOpacity
              onPress={() => {
                setEditMode(true);
                setReturnDate(letter.actual_return_date ?? dayjs().format('YYYY-MM-DD'));
                setModalOpen(true);
              }}
              hitSlop={8}
              testID="edit-return-date"
            >
              <Text style={styles.editDateLink}>{t('letters.editReturnDate')}</Text>
            </TouchableOpacity>
          )}
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

      {canSelfFinish && (
        <>
          <Text style={styles.selfFinishHint}>
            {selfFinishDate
              ? t('letters.selfFinishHint', { date: dayjs(selfFinishDate).format('DD.MM.YYYY') })
              : t('letters.selfFinishHintPickDate')}
          </Text>
          <TouchableOpacity
            style={styles.selfFinishBtn}
            activeOpacity={0.85}
            onPress={askSelfFinish}
            disabled={selfFinishM.isPending}
          >
            {selfFinishM.isPending
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <><Icon name="check" size={16} color={colors.onPrimary} /><Text style={styles.confirmBtnText}>{t('letters.selfFinish')}</Text></>}
          </TouchableOpacity>
        </>
      )}

      {canConfirmReturn && (
        <TouchableOpacity
          style={styles.confirmBtn}
          activeOpacity={0.85}
          onPress={() => { setEditMode(false); setModalOpen(true); }}
          disabled={confirmM.isPending}
        >
          {confirmM.isPending
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : <><Icon name="check" size={16} color={colors.onPrimary} /><Text style={styles.confirmBtnText}>{t('letters.confirmReturn')}</Text></>}
        </TouchableOpacity>
      )}

      <ModalCard
        visible={modalOpen}
        title={editMode
          ? t('letters.editReturnDateTitle')
          : selfMode
            ? t('letters.selfFinishTitle')
            : t('letters.confirmReturn')}
        hint={t('letters.confirmReturnDateLabel')}
        confirmLabel={t('common.confirm')}
        onClose={() => { setModalOpen(false); setSelfMode(false); }}
        onSubmit={submitConfirm}
      >
        <TextInput
          style={styles.input}
          value={returnDate}
          onChangeText={setReturnDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
        />
        {!editMode && !selfMode && (
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={note}
            onChangeText={setNote}
            placeholder={t('letters.movementNote')}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        )}
        {editMode && <Text style={styles.editHint}>{t('letters.editReturnDateHint')}</Text>}
      </ModalCard>
    </Section>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    selfFinishHint: { fontSize: 12, color: c.textMuted, marginTop: 10, lineHeight: 17 },
    editDateLink: { fontSize: 12, fontWeight: '600', color: c.primaryLight },
    editHint: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
    selfFinishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.success, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
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
    input: { backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text },
  });
