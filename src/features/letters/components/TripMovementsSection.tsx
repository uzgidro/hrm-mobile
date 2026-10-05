import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { ModalCard } from '@/components/ModalCard';
import type { Letter, BusinessTripMovement, User } from '@/types';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { isSiteMasterAdmin, isBranchHr } from '@/utils/roles';
import { normalizeLetterType, canConfirmTripReturn } from '@/utils/letterStatus';
import { canFixReturnDate } from '@/utils/tripStatus';
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
  /*
   * ⚠️ A FINALIZED TRIP IS CLOSED TO EVERYONE. The backend refuses with 400
   * `trip_finalized` once the report is approved or the trip was rejected or
   * cancelled — so the certificate cannot be rewritten after the fact. Mobile
   * had no such check and drew the buttons anyway; the web does check.
   */
  const finalized = ['report_approved', 'rejected', 'cancelled'].includes(letter.status ?? '');
  // (The return-date link is gated by `canFixReturnDate` — server flag first —
  // which deliberately has NO finalized check: the endpoint allows fixing the
  // date after approval too.)
  // Stage gate: the backend blocks confirm-return with 400 trip_not_registered
  // until the chancellery registers the trip (it's in the pre-registration set).
  // A site master-admin bypasses the stage, matching the backend. Without this a
  // branch HR would see "Keldi" on a pending_registration trip and hit the 400.
  const stageAllowsReturn = isSiteMasterAdmin(user) || canConfirmTripReturn(letter);
  /*
   * ⚠️ CONFIRMING THE RETURN IS THE HOME BRANCH'S CALL ALONE. Trip-scoped HR
   * (destination branches) may fix the date, but the server answers 403
   * `not_home_branch_hr` to a destination-branch KADR here — so sharing one
   * flag drew "Keldi" for people it refuses.
   */
  const canConfirmReturn =
    !finalized &&
    (isSiteMasterAdmin(user) || isBranchHr(user, letter.organization_branch_id)) &&
    !letter.is_trip_confirmed &&
    stageAllowsReturn;

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
  // Bir necha kun turniketdan o'tgan bo'lsa (27-da qaytib, 28-da yakunlash
  // bosilsa) — qaysi kuni qaytganini xodim TANLAYDI; ilgari OXIRGI o'tish
  // yozilardi (foydalanuvchi hisoboti 2026-08-27).
  const selfFinishOptions = letter.available_actions?.self_finish_date_options ?? [];

  // Ilova ichidagi tasdiq/oyna + toast — OS `Alert` web'da hech narsa
  // ko'rsatmasdi (kun tanlash ham, tasdiq ham, xato ham).
  const askSelfFinish = async () => {
    // Bir nechta o'tish kuni bor — xodim qaysi kuni qaytganini tanlaydi
    // (oyna kunlar ro'yxati bilan ochiladi; standart — server taklif qilgani).
    if (selfFinishDate && selfFinishOptions.length > 1) {
      setEditMode(false);
      setSelfMode(true);
      setPickDay(true);
      setDateError(null);
      setReturnDate(dayjs(selfFinishDate).format('YYYY-MM-DD'));
      setModalOpen(true);
      return;
    }
    // Turniket sanasi YO'Q — sanani xodim tanlaydi (modal ochiladi).
    if (!selfFinishDate) {
      setEditMode(false);
      setSelfMode(true);
      setPickDay(false);
      setDateError(null);
      setReturnDate(dayjs().format('YYYY-MM-DD'));
      setModalOpen(true);
      return;
    }
    const ok = await confirm({
      title: t('letters.selfFinishTitle'),
      message: t('letters.selfFinishConfirm', { date: dayjs(selfFinishDate).format('DD.MM.YYYY') }),
      confirmLabel: t('letters.selfFinishYes'),
      cancelLabel: t('common.cancel'),
      icon: 'check',
    });
    if (!ok) return;
    selfFinishM.mutate(undefined, {
      onSuccess: () => onChanged(),
      onError: (e) => toast.error(getApiErrorMessage(e, t('letters.actionError'))),
    });
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
  // Bir necha o'tish kuni — sana maydoni o'rniga kunlar ro'yxati ko'rsatiladi.
  const [pickDay, setPickDay] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState('');

  if (!isTrip) return null;

  const submitConfirm = () => {
    if (!returnDate.trim()) {
      setDateError(t('letters.confirmReturnDateLabel'));
      return;
    }
    setDateError(null);
    setModalOpen(false);
    if (selfMode) {
      setSelfMode(false);
      setPickDay(false);
      selfFinishM.mutate(returnDate.trim(), {
        onSuccess: () => onChanged(),
        onError: (e) =>
          toast.error(getApiErrorMessage(e, t('letters.actionError'))),
      });
      return;
    }
    if (editMode) {
      editDateM.mutate(returnDate.trim(), {
        onSuccess: () => onChanged(),
        onError: (e) =>
          toast.error(getApiErrorMessage(e, t('letters.actionError'))),
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
        onError: (e) => toast.error(getApiErrorMessage(e, t('letters.actionError'))),
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
          {canFixReturnDate(letter, user, tripBranchIds) && (
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
            {selfFinishDate && selfFinishOptions.length > 1
              ? t('letters.selfFinishHintPickDay', { date: dayjs(selfFinishDate).format('DD.MM.YYYY') })
              : selfFinishDate
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
        hint={pickDay ? t('letters.selfFinishPickDay') : t('letters.confirmReturnDateLabel')}
        confirmLabel={pickDay ? t('letters.selfFinishYes') : t('common.confirm')}
        onClose={() => { setModalOpen(false); setSelfMode(false); setPickDay(false); setDateError(null); }}
        onSubmit={submitConfirm}
        testID="trip-return-submit"
      >
        {pickDay ? (
          <View style={styles.dayList}>
            {selfFinishOptions.map((d) => {
              const iso = dayjs(d).format('YYYY-MM-DD');
              const on = iso === returnDate;
              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.dayOpt, on && styles.dayOptOn]}
                  onPress={() => setReturnDate(iso)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  testID={`self-finish-day-${iso}`}
                >
                  <Icon name={on ? 'check' : 'calendar'} size={15} color={on ? colors.primary : colors.textMuted} />
                  <Text style={[styles.dayOptText, on && styles.dayOptTextOn]}>{dayjs(d).format('DD.MM.YYYY')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TextInput
            style={[styles.input, dateError ? styles.inputError : null]}
            value={returnDate}
            onChangeText={(v) => { setReturnDate(v); if (dateError && v.trim()) setDateError(null); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        )}
        {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}
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
    selfFinishHint: { fontSize: 12, color: c.textMuted, marginTop: 10, lineHeight: 17, ...ff('700') },
    editDateLink: { fontSize: 12, ...ff('700'), color: c.primaryLight },
    editHint: { fontSize: 12, color: c.textMuted, lineHeight: 17, ...ff('700') },
    selfFinishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.success, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
    confirmedText: { fontSize: 13, color: c.success, ...ff('700') },
    empty: { color: c.textMuted, fontSize: 14, paddingVertical: 4, ...ff('700') },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 2, borderTopColor: c.cardBorder },
    dot: { width: 8, height: 8, borderRadius: 4 },
    rowTitle: { fontSize: 14, ...ff('700'), color: c.text },
    rowNote: { fontSize: 12, color: c.textMuted, marginTop: 2, ...ff('700') },
    rowDate: { fontSize: 12, color: c.textMuted, ...ff('700') },
    faceId: { fontSize: 11, color: c.primary, ...ff('800') },
    confirmBtn: { marginTop: 12, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 4, borderBottomColor: c.primaryShadow },
    confirmBtnText: { color: c.onPrimary, fontSize: 14, ...ff('800') },
    input: { backgroundColor: c.bg, borderRadius: 10, borderWidth: 2, borderColor: c.cardBorder, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text, ...ff('700') },
    inputError: { borderColor: c.error },
    errorText: { fontSize: 12, color: c.error, ...ff('700') },
    dayList: { gap: 8 },
    dayOpt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 2, borderColor: c.cardBorder, backgroundColor: c.bg, paddingHorizontal: 12, paddingVertical: 10 },
    dayOptOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
    dayOptText: { fontSize: 14, color: c.text, ...ff('700') },
    dayOptTextOn: { color: c.primary, ...ff('800') },
  });
