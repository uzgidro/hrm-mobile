import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { confirm } from '@/lib/confirm';
import { getApiErrorMessage } from '@/api/errors';
import {
  letterStatusMeta, letterTypeLabel, canSignLetter, getSigningTimeline, statusColor,
  canSubmitReport, canResetReport,
} from '@/utils/letterStatus';
import { canSubmitTrip } from '@/utils/tripStatus';
import { letterDetailQuery } from '../api/queries';
import { useLetterActions } from '../hooks/useLetterActions';
import { useResetReport, useSubmitTrip } from '../api/mutations';
import { DetailHeader, Section, KV, SignerRow } from '../components/DetailParts';
import { LetterActionBar } from '../components/LetterActionBar';
import { TripMovementsSection } from '../components/TripMovementsSection';

export default function LetterDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const letterId = Number(id);
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: letter, isLoading, refetch } = useQuery(letterDetailQuery(letterId));
  const { busy, sign, reject } = useLetterActions(letterId, refetch);
  const resetReportM = useResetReport(letterId);
  const submitTripM = useSubmitTrip(letterId);

  if (isLoading || !letter) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <DetailHeader />
        <LoadingView />
      </SafeAreaView>
    );
  }

  const meta = letterStatusMeta(letter);
  const sc = statusColor(meta.kind, colors);
  const timeline = getSigningTimeline(letter);
  const canAct = canSignLetter(letter, employeeId);
  const hasDoc = !!letter.generated_document_path;

  // ── Trip report (xizmat safari, OLD flow) ──
  const canReport = canSubmitReport(letter, employeeId);
  const canReset = canResetReport(letter, employeeId);
  // The employee sends a trip draft into the flow (server flag, detail-only).
  const canSend = canSubmitTrip(letter);
  const onSubmitTrip = async () => {
    const ok = await confirm({
      title: t('letters.tripSubmitConfirmTitle'),
      message: t('letters.tripSubmitConfirmMessage'),
      confirmLabel: t('letters.tripSubmit'),
      cancelLabel: t('common.cancel'),
      icon: 'arrowUp',
    });
    if (!ok) return;
    submitTripM.mutate(undefined, {
      onSuccess: () => refetch(),
      onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
    });
  };
  const hasReport = !!(letter.report_content || letter.report_summary || letter.report_task);
  const openReportForm = () => router.push({ pathname: '/submit-report', params: { id: String(letterId) } });
  const onResetReport = async () => {
    const ok = await confirm({
      title: t('letters.reportResetConfirmTitle'),
      message: t('letters.reportResetConfirmMessage'),
      confirmLabel: t('letters.reportReset'),
      cancelLabel: t('common.cancel'),
      icon: 'edit',
      destructive: true,
    });
    if (!ok) return;
    resetReportM.mutate(undefined, {
      onSuccess: () => refetch(),
      onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DetailHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
          </View>
          <Text style={styles.bigTitle}>
            {letterTypeLabel(letter.letter_type)}{letter.letter_number ? `  №${letter.letter_number}` : ''}
          </Text>
          {!!letter.letter_date && <Text style={styles.subMeta}>{t('letters.fieldDate')}: {dayjs(letter.letter_date).format('DD.MM.YYYY')}</Text>}
          {hasDoc && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/letter-document', params: { id: String(letterId) } })}
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>{t('letters.openDocument')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!letter.description && (
          <Section title={t('letters.sectionContent')}><Text style={styles.bodyText}>{letter.description}</Text></Section>
        )}

        <Section title={t('letters.sectionInfo')}>
          {!!(letter.employee?.legal_name || letter.submitter?.legal_name) &&
            <KV k={t('letters.fieldAuthor')} v={(letter.employee?.legal_name || letter.submitter?.legal_name)!} />}
          {!!letter.departure_date && <KV k={t('letters.fieldDeparture')} v={dayjs(letter.departure_date).format('DD.MM.YYYY')} />}
          {!!letter.arrival_date && <KV k={t('letters.fieldReturn')} v={dayjs(letter.arrival_date).format('DD.MM.YYYY')} />}
        </Section>

        <TripMovementsSection letter={letter} user={user} onChanged={refetch} />

        {timeline.length > 0 && (
          <Section title={t('letters.sectionSigners')}>
            {timeline.map((entry) => <SignerRow key={entry.key} item={entry} />)}
          </Section>
        )}

        {/* ── Trip report section (xizmat safari, OLD flow) ── */}
        {letter.status === 'report_returned' && !!letter.return_reason && (
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>{t('letters.reportReturnedReason')}</Text>
            <Text style={styles.rejectText}>{letter.return_reason}</Text>
          </View>
        )}

        {hasReport && (
          <Section title={t('letters.sectionReport')}>
            {!!letter.report_number && <KV k={t('letters.reportNumber')} v={letter.report_number} />}
            {!!letter.report_date && <KV k={t('letters.reportDate')} v={dayjs(letter.report_date).format('DD.MM.YYYY')} />}
            {!!letter.report_summary && <KV k={t('letters.reportSummary')} v={letter.report_summary} />}
            {!!letter.report_task && <KV k={t('letters.reportTask')} v={letter.report_task} />}
            {!!letter.report_content && (
              <View style={styles.reportBody}>
                <Text style={styles.reportBodyLabel}>{t('letters.reportContent')}</Text>
                <Text style={styles.bodyText}>{letter.report_content}</Text>
              </View>
            )}
          </Section>
        )}

        {canSend && (
          <TouchableOpacity
            style={styles.submitTripBtn}
            activeOpacity={0.85}
            onPress={onSubmitTrip}
            disabled={submitTripM.isPending}
          >
            <Icon name="arrowUp" size={16} color={colors.onPrimary} />
            <Text style={styles.submitTripText}>{t('letters.tripSubmit')}</Text>
          </TouchableOpacity>
        )}

        {(canReport || canReset) && (
          <View style={styles.reportActions}>
            {canReport && (
              <TouchableOpacity style={styles.reportBtn} activeOpacity={0.85} onPress={openReportForm}>
                <Icon name="edit" size={16} color={colors.onPrimary} />
                <Text style={styles.reportBtnText}>{hasReport ? t('letters.reportEdit') : t('letters.reportSubmit')}</Text>
              </TouchableOpacity>
            )}
            {canReset && (
              <TouchableOpacity
                style={[styles.reportBtn, styles.reportResetBtn]}
                activeOpacity={0.85}
                onPress={onResetReport}
                disabled={resetReportM.isPending}
              >
                <Text style={[styles.reportBtnText, { color: colors.error }]}>{t('letters.reportReset')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!letter.rejection_reason && (
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>{t('letters.rejectionReason')}</Text>
            <Text style={styles.rejectText}>{letter.rejection_reason}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {canAct && <LetterActionBar busy={busy} onSign={sign} onReject={reject} />}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 14 },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    bigTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    subMeta: { fontSize: 13, color: c.textMuted },
    docBtn: { marginTop: 6, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    docBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },
    bodyText: { fontSize: 14, color: c.text, lineHeight: 21 },
    rejectCard: { backgroundColor: c.errorSoft, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.error },
    rejectTitle: { fontSize: 13, fontWeight: '700', color: c.error, marginBottom: 4 },
    rejectText: { fontSize: 13, color: c.text, lineHeight: 19 },

    submitTripBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    submitTripText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    reportBody: { marginTop: 8 },
    reportBodyLabel: { fontSize: 12, color: c.textMuted, marginBottom: 4 },
    reportActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    reportBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14,
    },
    reportResetBtn: { flex: 0, paddingHorizontal: 18, backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error },
    reportBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
