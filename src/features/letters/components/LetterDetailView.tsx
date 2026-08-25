import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { confirm } from '@/lib/confirm';
import { getApiErrorMessage } from '@/api/errors';
import { branchRegions } from '@/utils/tripRegions';
import {
  letterStatusMeta, letterTypeLabel, canSignLetter, getSigningTimeline, statusColor,
  canSubmitReport, canResetReport, canChancelleryConfirmRegistration,
  getManagementSigners, normalizeLetterType, canEditLetter,
} from '@/utils/letterStatus';
import {
  canSubmitTrip, canApproveTripRegistration, canApproveReport,
  canApproveGuvohnoma, canRejectLetter,
  canReturnLetter, canDeleteLetter, canReturnTripReport, canCancelTrip,
  canExtendTrip, canDecideExtension, canSetBasisDecree,
} from '@/utils/tripStatus';
import { letterDetailQuery } from '../api/queries';
import { useLetterActions } from '../hooks/useLetterActions';
import {
  useResetReport,
  useSubmitTrip,
  useReturnLetter,
  useReturnReport,
  useCancelTrip,
  useDeleteLetter,
  useExtendTrip,
  useDecideExtension,
} from '../api/mutations';
import { DetailHeader, Section, KV, SignerRow } from './DetailParts';
import { LetterActionBar } from './LetterActionBar';
import { TripMovementsSection } from './TripMovementsSection';
import { AgreementSection } from './AgreementSection';
import { ConfirmRegistrationModal } from './ConfirmRegistrationModal';
import { ReasonModal } from './ReasonModal';
import { BasisDecreeModal } from './BasisDecreeModal';
import { DatePickerModal } from '@/components/DatePicker';

// The body of the letter detail — extracted so it can render either as the
// pushed route's content (phone / push-notification deep links, `embedded`
// falsy) or embedded inside the tablet split-view's right pane (`embedded`
// truthy). Embedded mode drops the safe-area root (the split pane already
// sits inside the list screen's own safe area) and hides the header's back
// button (there's nothing to "back" to inside a split pane). Mirrors
// OrderDetailView (T13) 1:1.
export function LetterDetailView({ id, embedded = false }: { id: number; embedded?: boolean }) {
  const { t } = useTranslation();
  const letterId = id;
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: letter, isLoading, refetch } = useQuery(letterDetailQuery(letterId));
  const { busy, sign, reject, approve } = useLetterActions(letterId, refetch);
  const resetReportM = useResetReport(letterId);
  const submitTripM = useSubmitTrip(letterId);
  const [confirmRegOpen, setConfirmRegOpen] = useState(false);
  // Devonxona / KADR amallari (web LetterDetailModal bilan bir xil).
  const returnLetterM = useReturnLetter(letterId);
  const returnReportM = useReturnReport(letterId);
  const cancelTripM = useCancelTrip(letterId);
  const deleteLetterM = useDeleteLetter(letterId);
  const [reasonModal, setReasonModal] = useState<null | 'return' | 'returnReport' | 'cancelTrip'>(null);
  const [reasonText, setReasonText] = useState('');
  // Safarni uzaytirish: KADR yangi qaytish sanasini tanlaydi.
  const extendM = useExtendTrip(letterId);
  const decideExtM = useDecideExtension(letterId);
  const [extendPickerOpen, setExtendPickerOpen] = useState(false);
  // Asos buyruq (guvohnomadagi "Asos:" qatori) — KADR kiritadi/tuzatadi.
  const [basisOpen, setBasisOpen] = useState(false);

  // Embedded (split-view pane): no safe-area root — the outer list screen's
  // Screen/SafeAreaView already owns the insets. Routed (pushed screen): the
  // same top/bottom safe-area root as before. A plain function (not a
  // component defined during render) so children keep their identity/state
  // across re-renders instead of being torn down and remounted.
  const renderRoot = (children: ReactNode) =>
    embedded ? (
      <View style={styles.embeddedRoot}>{children}</View>
    ) : (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    );

  if (isLoading || !letter) {
    return renderRoot(
      <>
        <DetailHeader embedded={embedded} />
        <LoadingView />
      </>,
    );
  }

  const meta = letterStatusMeta(letter);
  const sc = statusColor(meta.kind, colors);
  const timeline = getSigningTimeline(letter);
  // Sign is a client gate (web-parity); reject is a server flag (a trip signer
  // may reject without being able to sign). The bar shows each independently.
  const canSign = canSignLetter(letter, employeeId);
  const canReject = canRejectLetter(letter);
  const hasDoc = !!letter.generated_document_path;

  // ── Tafsilot maydonlari (web LetterDetailModal parity) ──
  const isTrip = normalizeLetterType(letter.letter_type) === 'business_trip';
  // Safarda muallif = creator_employee (web "Yuboriluvchi (xodim)").
  const authorName =
    letter.creator_employee?.legal_name
    || letter.employee?.legal_name
    || letter.submitter?.legal_name
    || '';
  const managementNames = getManagementSigners(letter)
    .map((sgn) => sgn.employee?.legal_name)
    .filter(Boolean)
    .join(', ');
  const addresseeName =
    (letter.assigned_signers ?? []).find((sgn) => sgn.signer_type === 'addressee' || sgn.signer_type === 'main')
      ?.employee?.legal_name ?? '';
  const destinationNames = (letter.destination_branches ?? [])
    .map((b) => b?.name)
    .filter(Boolean)
    .join(', ');
  // Viloyat: hujjatga yozilgan TANLOV birinchi manba; eski (tanlovsiz)
  // hujjatlarda filialning viloyatlaridan hosil qilinadi — web bilan bir xil.
  // Web `displayNumber`: safarda AVVAL "Bildirgi raqami" (decree_number).
  const displayNumber = isTrip ? (letter.decree_number || letter.letter_number) : letter.letter_number;
  const regionNames = (
    letter.destination_regions?.length
      ? letter.destination_regions
      : Array.from(new Set((letter.destination_branches ?? []).flatMap(branchRegions)))
  ).filter(Boolean).join(', ');

  // ── Trip leadership approvals (server flags; mutually-exclusive statuses) ──
  // `registration` — devonxona ro'yxatidan keyingi RAHBAR tasdig'i: buning uchun
  // server bayrog'i YO'Q, shu bois mijoz web bilan bir xil qoidani qo'llaydi.
  const approveTripKind = canApproveTripRegistration(letter, user, employeeId)
    ? 'registration'
    : canApproveReport(letter)
      ? 'report'
      : canApproveGuvohnoma(letter)
        ? 'guvohnoma'
        : null;

  // ── Trip report (xizmat safari, OLD flow) ──
  const canReport = canSubmitReport(letter, employeeId);
  const canReset = canResetReport(letter, employeeId);
  // The employee sends a trip draft into the flow (server flag, detail-only).
  const canSend = canSubmitTrip(letter);
  // Devonxona "Tasdiqlash": a stamped bildirgi/ariza/trip at pending_registration
  // awaits the chancellery's confirmation (auto number editable).
  const canConfirmReg = canChancelleryConfirmRegistration(letter, user);
  // Devonxona: hujjatni qaytarish / hisobotni qaytarish / o'chirish.
  // KADR: safarni bekor qilish. Hech biri mobilда yo'q edi.
  const showReturn = canReturnLetter(letter, user);
  const showReturnReport = canReturnTripReport(letter, user);
  const showCancelTrip = canCancelTrip(letter, user);
  const showDelete = canDeleteLetter(letter, user, employeeId);
  const showExtend = canExtendTrip(letter, user);
  const showDecideExtension = canDecideExtension(letter, user, employeeId);
  const showBasisDecree = canSetBasisDecree(letter, user);
  // Tahrirlash — backend `update_letter` qoidasi bilan 1:1 (mobilда yo'q edi:
  // qaytarilgan hujjatni telefondan tuzatib bo'lmasdi).
  const showEdit = canEditLetter(letter, employeeId, user);

  // Xatning istalgan hujjatini OnlyOffice ko'ruvchisida ochish. Ruxsat va
  // ko'rish/tahrir rejimini SERVER hal qiladi.
  const openDoc = (kind: 'main' | 'report' | 'guvohnoma' | 'attachment') =>
    router.push({ pathname: '/letter-document', params: { id: String(letterId), kind } });

  const closeReason = () => { setReasonModal(null); setReasonText(''); };
  const runReason = () => {
    const reason = reasonText.trim();
    const onError = (e: unknown) =>
      Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError')));
    const opts = { onSuccess: () => { closeReason(); refetch(); }, onError };
    if (reasonModal === 'return') returnLetterM.mutate(reason, opts);
    else if (reasonModal === 'returnReport') returnReportM.mutate(reason, opts);
    else if (reasonModal === 'cancelTrip') cancelTripM.mutate(reason, opts);
  };
  const onExtendConfirm = (iso: string) => {
    extendM.mutate({ arrivalDate: iso }, {
      onSuccess: () => refetch(),
      onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
    });
  };
  const onDecideExtension = async (approve: boolean) => {
    const ok = await confirm({
      title: approve ? t('letters.extensionApprove') : t('letters.extensionReject'),
      message: t('letters.extensionDecideConfirm'),
      confirmLabel: approve ? t('letters.extensionApprove') : t('letters.extensionReject'),
      cancelLabel: t('common.cancel'),
      icon: approve ? 'check' : 'close',
      destructive: !approve,
    });
    if (!ok) return;
    decideExtM.mutate(approve, {
      onSuccess: () => refetch(),
      onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
    });
  };
  const onDeleteLetter = async () => {
    const ok = await confirm({
      title: t('letters.deleteConfirmTitle'),
      message: t('letters.deleteConfirmMessage'),
      confirmLabel: t('letters.deleteAction'),
      cancelLabel: t('common.cancel'),
      icon: 'close',
      destructive: true,
    });
    if (!ok) return;
    deleteLetterM.mutate(undefined, {
      // Hujjat endi yo'q — ro'yxatga qaytamiz (tafsilot 404 bo'lib qolmasin).
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.actionError'))),
    });
  };
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

  return renderRoot(
    <>
      <DetailHeader embedded={embedded} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {letter.document_out_of_sync && (
          <View style={styles.warnCard} testID="letter-out-of-sync-warning">
            <Text style={styles.warnText}>{t('letters.docOutOfSyncWarning')}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
          </View>
          <Text style={styles.bigTitle}>
            {letterTypeLabel(letter.letter_type)}{displayNumber ? `  №${displayNumber}` : ''}
          </Text>
          {!!letter.letter_date && <Text style={styles.subMeta}>{t('letters.fieldDate')}: {dayjs(letter.letter_date).format('DD.MM.YYYY')}</Text>}
          {hasDoc && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() => openDoc('main')}
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>{t('letters.openDocument')}</Text>
            </TouchableOpacity>
          )}
          {/* GUVOHNOMA (safar varaqasi) — mobilда umuman ochib bo'lmasdi. */}
          {!!letter.guvohnoma_path && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() => openDoc('guvohnoma')}
              testID="letter-open-guvohnoma"
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>{t('letters.openGuvohnoma')}</Text>
            </TouchableOpacity>
          )}
          {/* Muallif biriktirgan ILOVA. */}
          {!!letter.attachment_path && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() => openDoc('attachment')}
              testID="letter-open-attachment"
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>{t('letters.openAttachment')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!letter.description && (
          <Section title={t('letters.sectionContent')}><Text style={styles.bodyText}>{letter.description}</Text></Section>
        )}

        {/* Web LetterDetailModal bilan bir xil maydonlar. Avval bu bo'limda
            FAQAT muallif + ikkita sana bor edi: borish filiali, viloyat, reja,
            yuboruvchi, rahbariyat, devonxona raqami, kelgan sana va asos buyruq
            mobilда UMUMAN ko'rinmasdi (webda ko'rinadi). */}
        <Section title={t('letters.sectionInfo')}>
          {!!authorName && <KV k={t('letters.fieldAuthor')} v={authorName} />}
          {isTrip && !!letter.submitter?.legal_name && (
            <KV k={t('letters.fieldSubmitter')} v={letter.submitter.legal_name} />
          )}
          {isTrip && !!managementNames && <KV k={t('letters.detailLeadership')} v={managementNames} />}
          {!isTrip && !!addresseeName && <KV k={t('letters.fieldAddressee')} v={addresseeName} />}
          {isTrip && !!destinationNames && (
            <KV k={t('letters.fieldDestinations')} v={destinationNames} />
          )}
          {isTrip && !!regionNames && <KV k={t('letters.fieldRegions')} v={regionNames} />}
          {!!letter.departure_date && <KV k={t('letters.fieldDeparture')} v={dayjs(letter.departure_date).format('DD.MM.YYYY')} />}
          {!!letter.arrival_date && <KV k={t('letters.fieldReturn')} v={dayjs(letter.arrival_date).format('DD.MM.YYYY')} />}
          {!!letter.actual_return_date && (
            <KV k={t('letters.fieldActualReturn')} v={dayjs(letter.actual_return_date).format('DD.MM.YYYY')} />
          )}
          {(!!letter.basis_decree_number || showBasisDecree) && (
            <KV
              k={t('letters.fieldBasisDecree')}
              v={letter.basis_decree_number
                ? letter.basis_decree_number
                  + (letter.basis_decree_date ? ` — ${dayjs(letter.basis_decree_date).format('DD.MM.YYYY')}` : '')
                : '—'}
            />
          )}
          {showBasisDecree && (
            <TouchableOpacity
              style={styles.inlineBtn}
              activeOpacity={0.8}
              onPress={() => setBasisOpen(true)}
              testID="letter-basis-decree"
            >
              <Text style={styles.inlineBtnText}>
                {letter.basis_decree_number ? t('letters.editAction') : t('letters.basisDecreeSet')}
              </Text>
            </TouchableOpacity>
          )}
          {!!letter.guvohnoma_number && (
            <KV k={t('letters.fieldGuvohnomaNumber')} v={letter.guvohnoma_number} />
          )}
          <KV
            k={t('letters.fieldRegistry')}
            v={letter.registered_number
              ? `${letter.registered_number}${letter.registered_date ? ` — ${dayjs(letter.registered_date).format('DD.MM.YYYY')}` : ''}`
              : t('letters.registryNotRegistered')}
          />
        </Section>

        {/* Safar REJASI (maqsad/vazifa) — webda alohida bo'lim, mobilда yo'q edi. */}
        {!!letter.work_plan && (
          <Section title={t('letters.sectionWorkPlan')}>
            <Text style={styles.bodyText}>{letter.work_plan}</Text>
          </Section>
        )}

        {/* Uzaytirish so'rovi rahbariyat tasdig'ini kutmoqda. */}
        {letter.status === 'extension_review' && !!letter.extension_requested_date && (
          <View style={styles.warnCard}>
            <Text style={styles.warnText}>
              {t('letters.extensionPending', {
                date: dayjs(letter.extension_requested_date).format('DD.MM.YYYY'),
              })}
              {letter.extension_note ? `\n${letter.extension_note}` : ''}
            </Text>
          </View>
        )}

        <TripMovementsSection letter={letter} user={user} onChanged={refetch} />

        {/* Bildirgi/ariza kelishuvi — kelishuvchilar holati va amallar. */}
        <AgreementSection letter={letter} employeeId={employeeId} onChanged={refetch} />

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
            {/* Hisobot DOCX'i — web ham uni ko'ruvchida ochadi (yuklamaydi). */}
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() => openDoc('report')}
              testID="letter-open-report-doc"
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>{t('letters.openReportDocument')}</Text>
            </TouchableOpacity>
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

        {approveTripKind && (
          <TouchableOpacity
            style={styles.approveBtn}
            activeOpacity={0.85}
            onPress={() => approve(approveTripKind)}
            disabled={busy}
          >
            <Icon name="check" size={16} color={colors.onPrimary} />
            <Text style={styles.approveText}>
              {approveTripKind === 'registration'
                ? t('letters.approve_registration_action')
                : t('letters.tripApprove')}
            </Text>
          </TouchableOpacity>
        )}

        {canConfirmReg && (
          <TouchableOpacity
            style={styles.approveBtn}
            activeOpacity={0.85}
            onPress={() => setConfirmRegOpen(true)}
          >
            <Icon name="check" size={16} color={colors.onPrimary} />
            <Text style={styles.approveText}>{t('letters.confirmRegistrationAction')}</Text>
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

        {showEdit && (
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/create-letter', params: { id: String(letterId) } })}
            testID="letter-edit"
          >
            <Icon name="edit" size={16} color={colors.primary} />
            <Text style={styles.editBtnText}>{t('letters.editAction')}</Text>
          </TouchableOpacity>
        )}

        {/* Rahbariyat uzaytirish so'rovini hal qiladi. */}
        {showDecideExtension && (
          <View style={styles.reportActions}>
            <TouchableOpacity
              style={[styles.reportBtn, styles.reportResetBtn]}
              activeOpacity={0.85}
              onPress={() => onDecideExtension(false)}
              disabled={decideExtM.isPending}
              testID="letter-extension-reject"
            >
              <Text style={[styles.reportBtnText, { color: colors.error }]}>{t('letters.extensionReject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reportBtn}
              activeOpacity={0.85}
              onPress={() => onDecideExtension(true)}
              disabled={decideExtM.isPending}
              testID="letter-extension-approve"
            >
              <Icon name="check" size={16} color={colors.onPrimary} />
              <Text style={styles.reportBtnText}>{t('letters.extensionApprove')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* KADR safar muddatini uzaytiradi. */}
        {showExtend && (
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.85}
            onPress={() => setExtendPickerOpen(true)}
            disabled={extendM.isPending}
            testID="letter-extend-trip"
          >
            <Icon name="calendar" size={16} color={colors.primary} />
            <Text style={styles.editBtnText}>{t('letters.extendTripAction')}</Text>
          </TouchableOpacity>
        )}

        {/* ── DEVONXONA / KADR amallari ── */}
        {showReturnReport && (
          <TouchableOpacity
            style={styles.warnBtn}
            activeOpacity={0.85}
            onPress={() => { setReasonText(''); setReasonModal('returnReport'); }}
            testID="letter-return-report"
          >
            <Icon name="arrowDown" size={16} color={colors.warning} />
            <Text style={styles.warnBtnText}>{t('letters.returnReportAction')}</Text>
          </TouchableOpacity>
        )}

        {showReturn && (
          <TouchableOpacity
            style={styles.warnBtn}
            activeOpacity={0.85}
            onPress={() => { setReasonText(''); setReasonModal('return'); }}
            testID="letter-return"
          >
            <Icon name="arrowDown" size={16} color={colors.warning} />
            <Text style={styles.warnBtnText}>{t('letters.returnAction')}</Text>
          </TouchableOpacity>
        )}

        {showCancelTrip && (
          <TouchableOpacity
            style={styles.dangerBtn}
            activeOpacity={0.85}
            onPress={() => { setReasonText(''); setReasonModal('cancelTrip'); }}
            testID="letter-cancel-trip"
          >
            <Icon name="close" size={16} color={colors.error} />
            <Text style={styles.dangerBtnText}>{t('letters.cancelTripAction')}</Text>
          </TouchableOpacity>
        )}

        {showDelete && (
          <TouchableOpacity
            style={styles.dangerBtn}
            activeOpacity={0.85}
            onPress={onDeleteLetter}
            disabled={deleteLetterM.isPending}
            testID="letter-delete"
          >
            <Icon name="trash" size={16} color={colors.error} />
            <Text style={styles.dangerBtnText}>{t('letters.deleteAction')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {(canSign || canReject) && (
        <LetterActionBar
          busy={busy}
          onSign={canSign ? sign : undefined}
          onReject={canReject ? reject : undefined}
        />
      )}

      <BasisDecreeModal
        letterId={letterId}
        visible={basisOpen}
        initialNumber={letter.basis_decree_number}
        initialDate={letter.basis_decree_date}
        onClose={() => setBasisOpen(false)}
        onSaved={refetch}
      />

      <DatePickerModal
        visible={extendPickerOpen}
        value={letter.arrival_date ?? null}
        title={t('letters.extendTripAction')}
        onConfirm={onExtendConfirm}
        onClose={() => setExtendPickerOpen(false)}
      />

      <ReasonModal
        visible={reasonModal !== null}
        title={
          reasonModal === 'cancelTrip' ? t('letters.cancelTripAction')
            : reasonModal === 'returnReport' ? t('letters.returnReportAction')
              : t('letters.returnAction')
        }
        label={reasonModal === 'cancelTrip' ? t('letters.reasonOptionalLabel') : t('letters.reasonRequiredLabel')}
        placeholder={t('letters.reasonPlaceholder')}
        reason={reasonText}
        // Qaytarishda sabab MAJBURIY (backend min_length=1); bekor qilishda ixtiyoriy.
        required={reasonModal !== 'cancelTrip'}
        busy={returnLetterM.isPending || returnReportM.isPending || cancelTripM.isPending}
        confirmLabel={t('common.confirm')}
        destructive={reasonModal === 'cancelTrip'}
        onChangeReason={setReasonText}
        onClose={closeReason}
        onSubmit={runReason}
        testID="letter-reason-submit"
      />

      {canConfirmReg && (
        <ConfirmRegistrationModal
          letter={letter}
          visible={confirmRegOpen}
          onClose={() => setConfirmRegOpen(false)}
          onConfirmed={refetch}
        />
      )}
    </>,
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    embeddedRoot: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 14 },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    bigTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    subMeta: { fontSize: 13, color: c.textMuted },
    docBtn: { marginTop: 6, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    docBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },
    bodyText: { fontSize: 14, color: c.text, lineHeight: 21 },
    warnCard: { backgroundColor: c.warningSoft, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.warning },
    warnText: { fontSize: 13, color: c.text, lineHeight: 19 },
    rejectCard: { backgroundColor: c.errorSoft, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.error },
    rejectTitle: { fontSize: 13, fontWeight: '700', color: c.error, marginBottom: 4 },
    rejectText: { fontSize: 13, color: c.text, lineHeight: 19 },

    submitTripBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    submitTripText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    approveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.success, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    approveText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    reportBody: { marginTop: 8 },
    reportBodyLabel: { fontSize: 12, color: c.textMuted, marginBottom: 4 },
    reportActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    reportBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14,
    },
    reportResetBtn: { flex: 0, paddingHorizontal: 18, backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error },
    reportBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },

    warnBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.warningSoft, borderWidth: 1, borderColor: c.warning,
      borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    warnBtnText: { color: c.warning, fontSize: 14, fontWeight: '700' },
    dangerBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error,
      borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    dangerBtnText: { color: c.error, fontSize: 14, fontWeight: '700' },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    editBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },
    inlineBtn: {
      alignSelf: 'flex-end', marginTop: 4, backgroundColor: c.primarySoft,
      borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7,
    },
    inlineBtnText: { color: c.primary, fontSize: 12, fontWeight: '700' },

  });
