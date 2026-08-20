import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Letter, LetterSigner } from '@/types';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import {
  canAgreeLetter, canSendAgreementLetter, canSubmitAgreementDraft,
  getLetterAgreements, isAgreementLetter,
} from '@/utils/letterStatus';
import { Section } from './DetailParts';
import { useAgreeLetter, useSendToRegistry, useSubmitAgreement } from '../api/mutations';

// BILDIRGI/ARIZA kelishuv oqimi — mobilда umuman yo'q edi: kelishuvchi hujjatni
// kelisha olmasdi (mavjud "Imzolash" tugmasi esa backendда 400
// `use_agreement_flow` berardi), muallif esa qoralamani kelishuvga ham,
// kelishilganini devonxonaga ham yubora olmasdi — hujjat mobilда tiqilib qolardi.
//
// Qoidalar `utils/letterStatus` da (web helpers.js bilan 1:1), izoh MAJBURIY.
export function AgreementSection({
  letter,
  employeeId,
  onChanged,
}: {
  letter: Letter;
  employeeId?: number;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const agreeM = useAgreeLetter(letter.id);
  const submitM = useSubmitAgreement(letter.id);
  const sendM = useSendToRegistry(letter.id);

  const [modal, setModal] = useState<null | 'agree' | 'disagree'>(null);
  const [comment, setComment] = useState('');

  if (!isAgreementLetter(letter)) return null;

  const rows = getLetterAgreements(letter);
  const canAct = canAgreeLetter(letter, employeeId);
  const canSubmitDraft = canSubmitAgreementDraft(letter, employeeId);
  const canSend = canSendAgreementLetter(letter, employeeId);
  if (rows.length === 0 && !canSubmitDraft && !canSend) return null;

  const rowState = (r: LetterSigner) =>
    r.agreed === true ? 'agreed' : r.agreed === false ? 'declined' : 'pending';

  const submitDecision = () => {
    const text = comment.trim();
    if (!text) {
      Alert.alert(t('letters.actionError'), t('letters.agreementCommentRequired'));
      return;
    }
    const agreed = modal === 'agree';
    setModal(null);
    agreeM.mutate(
      { agreed, comment: text },
      {
        onSuccess: () => { setComment(''); onChanged(); },
        onError: (e) =>
          Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
      },
    );
  };

  const run = (m: { mutate: (v: undefined, o: object) => void }) =>
    m.mutate(undefined, {
      onSuccess: () => onChanged(),
      onError: (e: unknown) =>
        Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
    });

  const busy = agreeM.isPending || submitM.isPending || sendM.isPending;

  return (
    <Section title={t('letters.sectionAgreement')}>
      {rows.map((r) => {
        const state = rowState(r);
        const color =
          state === 'agreed' ? colors.success : state === 'declined' ? colors.error : colors.textMuted;
        return (
          <View key={r.id ?? r.employee_id} style={styles.row}>
            <Icon
              name={state === 'agreed' ? 'check' : state === 'declined' ? 'close' : 'clock'}
              size={15}
              color={color}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.employee?.legal_name ?? '—'}</Text>
              {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
            </View>
            <Text style={[styles.state, { color }]}>
              {t(`letters.agreementState.${state}`)}
              {r.acted_at ? `  ·  ${dayjs(r.acted_at).format('DD.MM.YYYY')}` : ''}
            </Text>
          </View>
        );
      })}

      {canAct && (
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnDecline]}
            disabled={busy}
            onPress={() => { setComment(''); setModal('disagree'); }}
            activeOpacity={0.85}
            testID="letter-disagree"
          >
            <Text style={styles.btnDeclineText}>{t('letters.disagree')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnAgree]}
            disabled={busy}
            onPress={() => { setComment(''); setModal('agree'); }}
            activeOpacity={0.85}
            testID="letter-agree"
          >
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnAgreeText}>{t('letters.agree')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {canSubmitDraft && (
        <TouchableOpacity
          style={[styles.btn, styles.btnAgree, styles.btnWide]}
          disabled={busy}
          onPress={() => run(submitM)}
          activeOpacity={0.85}
          testID="letter-submit-agreement"
        >
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnAgreeText}>{t('letters.submitAgreement')}</Text>}
        </TouchableOpacity>
      )}

      {canSend && (
        <TouchableOpacity
          style={[styles.btn, styles.btnAgree, styles.btnWide]}
          disabled={busy}
          onPress={() => run(sendM)}
          activeOpacity={0.85}
          testID="letter-send-registry"
        >
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnAgreeText}>{t('letters.sendToRegistry')}</Text>}
        </TouchableOpacity>
      )}

      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.modalTitle}>
              {modal === 'agree' ? t('letters.agree') : t('letters.disagree')}
            </Text>
            {/* Izoh MAJBURIY — backend `comment` min_length=1 talab qiladi. */}
            <Text style={styles.modalLabel}>{t('letters.agreementCommentLabel')}</Text>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder={t('letters.agreementCommentPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(null)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitDecision} activeOpacity={0.8} testID="agreement-submit">
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
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.cardBorder },
    name: { fontSize: 14, fontWeight: '600', color: c.text },
    comment: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    state: { fontSize: 12, fontWeight: '600' },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    btnWide: { marginTop: 10 },
    btnAgree: { backgroundColor: c.primary },
    btnAgreeText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    btnDecline: { backgroundColor: c.errorSoft },
    btnDeclineText: { color: c.error, fontSize: 14, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 18, gap: 10 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    modalLabel: { fontSize: 12, color: c.textMuted },
    input: { minHeight: 90, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, padding: 12, color: c.text, fontSize: 14 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.cardBorder },
    modalCancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
    modalSubmit: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.primary },
    modalSubmitText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
