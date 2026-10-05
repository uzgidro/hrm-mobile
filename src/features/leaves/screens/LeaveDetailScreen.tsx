import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';
import type { WorkLeave } from '@/types';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { isPendingCode, leaveStatusGroup, leaveStatusKind } from '@/utils/leaveStatus';
import { statusColor } from '@/utils/orderStatus';
import { leaveDetailQuery } from '../api/queries';
import { useSignLeave, useRejectLeave, useDeleteLeave, useReopenLeave } from '../api/mutations';
import { canActOnLeave, canDeleteLeave, canReopenLeave, REOPEN_REASON_MIN } from '../utils';
import { leaveTypeLabel } from '../components/LeaveTypeSheet';

function isApproved(status: string) { return leaveStatusGroup(status) === 'approved'; }
function isRejected(status: string) { return leaveStatusGroup(status) === 'rejected'; }

function getStatusMeta(status: string, c: ThemeColors, t: TFunction) {
  const { fg, bg } = statusColor(leaveStatusKind(status), c);
  if (isApproved(status)) return { label: t('leaves.statusApproved'), fg, bg };
  if (isRejected(status)) return { label: t('leaves.statusRejected'), fg, bg };
  return { label: t('leaves.statusPending'), fg, bg };
}

/** A reason prompt — rejecting or reopening (v2 `RejectLeaveModal`). */
function ReasonModal({ visible, title, hint, placeholder, confirmLabel, minLength = 1, danger = true, testID, onConfirm, onClose, styles, colors }: {
  visible: boolean; title: string; hint?: string; placeholder: string; confirmLabel: string; minLength?: number;
  danger?: boolean; testID?: string; onConfirm: (reason: string) => void; onClose: () => void; styles: any; colors: ThemeColors;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const ready = reason.trim().length >= minLength;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        {hint ? <Text style={styles.sheetHint}>{hint}</Text> : null}
        <TextInput
          testID={testID ? `${testID}-input` : undefined}
          style={styles.sheetInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={testID ? `${testID}-submit` : undefined}
            style={[styles.confirmBtn, !danger && { backgroundColor: colors.primary }, !ready && { opacity: 0.4 }]}
            disabled={!ready}
            onPress={() => { onConfirm(reason.trim()); setReason(''); }}
          >
            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function LeaveDetailScreen() {
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leaveId = Number(id);
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [acting, setActing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  const signMutation = useSignLeave(leaveId);
  const rejectMutation = useRejectLeave(leaveId);
  const deleteMutation = useDeleteLeave(leaveId);
  const reopenMutation = useReopenLeave(leaveId);

  // Once deleted, the record is gone: its query was dropped from the cache
  // (`afterLeaveDeleted`) and must not be re-created and refetched by this
  // still-mounted screen (404 → a second «not found» toast, QA 2026-10-05).
  // The last data stays on screen while the stack pops.
  const deleted = deleteMutation.isSuccess;
  const { data: leave, isLoading } = useQuery({
    ...leaveDetailQuery(leaveId),
    enabled: !!leaveId && !deleted,
    placeholderData: deleted ? (prev: WorkLeave | undefined) => prev : undefined,
  });

  // Web v2 parity (RequestPermissionPage `canActOn`): an assigned signer — or,
  // when NO signer is named (the default routing), the requester's supervisor,
  // else a head of their department, or HR / an admin.
  const { canSign, canReject } = canActOnLeave(leave, user);
  const canApprove = canSign || canReject;
  // v2 `canReopen`: a decided (signed / rejected) non-KADR request, by one of its deciders.
  const canReopen = canReopenLeave(leave, user);
  const reopenReason = (leave as { reopen_reason?: string | null } | undefined)?.reopen_reason;

  // Web parity: the author may withdraw (delete) their own request while it is
  // still pending and unsigned (mirrors the web's canDeleteWorkLeave, shown on
  // the "my" tab only — hence the ownership check inside canDeleteLeave).
  const canDelete = canDeleteLeave(leave, employeeId);

  const handleApprove = useCallback(async () => {
    setActing(true);
    try {
      await signMutation.mutateAsync();
      toast.success(t('leaves.approvedSuccess'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('leaves.approveError')));
    } finally { setActing(false); }
  }, [signMutation, t]);

  const handleReject = useCallback(async (reason: string) => {
    setShowRejectModal(false);
    setActing(true);
    try {
      await rejectMutation.mutateAsync(reason);
      toast.success(t('leaves.rejectedSuccess'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('leaves.rejectError')));
    } finally { setActing(false); }
  }, [rejectMutation, t]);

  const handleReopen = useCallback(async (reason: string) => {
    setShowReopenModal(false);
    setActing(true);
    try {
      await reopenMutation.mutateAsync(reason);
      toast.success(t('leaves.reopenedSuccess'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('leaves.reopenError')));
    } finally { setActing(false); }
  }, [reopenMutation, t]);

  // In-app confirm + toast — the OS `Alert` is a no-op on react-native-web.
  const handleDelete = useCallback(async () => {
    const ok = await confirm({
      title: t('leaves.deleteConfirmTitle'),
      message: t('leaves.deleteConfirmMessage'),
      confirmLabel: t('leaves.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setActing(true);
    try {
      await deleteMutation.mutateAsync();
      toast.success(t('leaves.deletedSuccess'));
      router.back();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('leaves.deleteError')));
    } finally { setActing(false); }
  }, [deleteMutation, t]);

  const headerBar = <ScreenHeader title={t('leaves.detailTitle')} />;

  if (isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        {headerBar}
        <LoadingView />
      </Screen>
    );
  }

  if (!leave) {
    return (
      <Screen edges={['top', 'bottom']}>
        {headerBar}
        <EmptyState title={t('leaves.notFound')} />
      </Screen>
    );
  }

  const stMeta = getStatusMeta(leave.status, colors, t);
  const sameDay = dayjs(leave.start_date).format('DD.MM.YYYY') === dayjs(leave.end_date).format('DD.MM.YYYY');

  return (
    <Screen edges={['top', 'bottom']}>
      {headerBar}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {leave.employee && (
          <View style={s.empCard}>
            <EmployeeAvatar emp={leave.employee} size={56} />
            <View style={s.empInfo}>
              <Text style={s.empName}>{leave.employee.legal_name}</Text>
              <Text style={s.empSub} numberOfLines={1}>{leave.employee.job_position?.name ?? leave.employee.department?.name ?? '—'}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: stMeta.bg }]}>
              <Text style={[s.badgeText, { color: stMeta.fg }]}>{stMeta.label}</Text>
            </View>
          </View>
        )}

        <View style={s.infoCard}>
          <View style={s.infoRow}><Text style={s.infoLabel}>{t('leaves.fieldType')}</Text><Text style={s.infoValue}>{leave.type ? leaveTypeLabel(t, leave.type) : t('leaves.typeFallback')}</Text></View>
          {leave.is_hr_order && (
            <View style={s.infoRow}><Text style={s.infoLabel}>{t('leaves.fieldOrigin')}</Text><Text style={s.infoValue}>{t('leaves.originHrOrder')}</Text></View>
          )}
          <View style={s.divider} />
          <View style={s.infoRow}><Text style={s.infoLabel}>{t('leaves.fieldStart')}</Text><Text style={s.infoValue}>{dayjs(leave.start_date).format('DD.MM.YYYY HH:mm')}</Text></View>
          <View style={s.divider} />
          <View style={s.infoRow}><Text style={s.infoLabel}>{t('leaves.fieldEnd')}</Text><Text style={s.infoValue}>{dayjs(leave.end_date).format(sameDay ? 'HH:mm' : 'DD.MM.YYYY HH:mm')}</Text></View>
          {leave.description ? (
            <>
              <View style={s.divider} />
              <View style={s.infoRow}><Text style={s.infoLabel}>{t('leaves.fieldComment')}</Text><Text style={[s.infoValue, { flex: 2 }]}>{leave.description}</Text></View>
            </>
          ) : null}
          {leave.created_at ? (
            <>
              <View style={s.divider} />
              <View style={s.infoRow}><Text style={s.infoLabel}>{t('leaves.fieldCreated')}</Text><Text style={s.infoValue}>{dayjs(leave.created_at).format('DD.MM.YYYY HH:mm')}</Text></View>
            </>
          ) : null}
        </View>

        {isRejected(leave.status) && leave.rejection_reason ? (
          <View style={s.rejectionCard}>
            <Text style={s.rejectionLabel}>{t('leaves.rejectReasonTitle')}</Text>
            <Text style={s.rejectionText}>{leave.rejection_reason}</Text>
          </View>
        ) : null}

        {isPendingCode(leave.status) && reopenReason ? (
          <View style={s.reopenCard} testID="leave-reopen-note">
            <Text style={s.reopenText}>{t('leaves.reopenedNote', { reason: reopenReason })}</Text>
          </View>
        ) : null}

        {(leave.assigned_signers?.length ?? 0) > 0 && (
          <View style={s.signersCard}>
            <Text style={s.signersTitle}>{t('leaves.signersTitle')}</Text>
            {leave.assigned_signers!.map((signer) => {
              const hasSigned = leave.signers?.some((sg) => sg.id === signer.id);
              // Web RequestPermissionPage:296 parity: the signer who rejected is marked red.
              const rejected = !hasSigned && (leave.reject_by_id ?? leave.rejected_by?.id) === signer.id;
              const tone = hasSigned ? colors.success : rejected ? colors.error : colors.warning;
              const bg = hasSigned ? colors.successSoft : rejected ? colors.errorSoft : colors.warningSoft;
              return (
                <View key={signer.id} style={s.signerRow}>
                  <EmployeeAvatar emp={signer} size={40} />
                  <View style={s.signerInfo}>
                    <Text style={s.signerName}>{signer.legal_name}</Text>
                    <Text style={s.signerSub} numberOfLines={1}>{signer.job_position?.name ?? signer.department?.name ?? '—'}</Text>
                  </View>
                  <View style={[s.signerStatus, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg }]}>
                    <Icon name={hasSigned ? 'check' : rejected ? 'close' : 'clock'} size={13} color={tone} />
                    <Text style={[s.signerStatusText, { color: tone }]}>
                      {hasSigned ? t('leaves.signerSigned') : rejected ? t('leaves.signerRejected') : t('leaves.statusPending')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {canApprove && (
          <View style={s.actionRow}>
            <TouchableOpacity style={[s.rejectBtn, acting && { opacity: 0.5 }]} disabled={acting} onPress={() => setShowRejectModal(true)}>
              {acting ? <ActivityIndicator color={colors.error} size="small" /> : <Text style={s.rejectBtnText}>{t('leaves.reject')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.approveBtn, acting && { opacity: 0.5 }]} disabled={acting} onPress={handleApprove}>
              {acting ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Text style={s.approveBtnText}>{t('leaves.approve')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {canReopen && (
          <TouchableOpacity testID="leave-reopen" style={[s.reopenBtn, acting && { opacity: 0.5 }]} disabled={acting} onPress={() => setShowReopenModal(true)}>
            <Icon name="refresh" size={16} color={colors.primary} />
            <Text style={s.reopenBtnText}>{t('leaves.reopen')}</Text>
          </TouchableOpacity>
        )}

        {canDelete && (
          <TouchableOpacity style={[s.deleteBtn, acting && { opacity: 0.5 }]} disabled={acting} onPress={handleDelete}>
            <Icon name="trash" size={16} color={colors.error} />
            <Text style={s.deleteBtnText}>{t('leaves.delete')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <ReasonModal
        visible={showRejectModal}
        title={t('leaves.rejectReasonTitle')}
        placeholder={t('leaves.rejectReasonPlaceholder')}
        confirmLabel={t('leaves.reject')}
        onConfirm={handleReject}
        onClose={() => setShowRejectModal(false)}
        styles={s}
        colors={colors}
      />
      <ReasonModal
        visible={showReopenModal}
        testID="leave-reopen-sheet"
        title={t('leaves.reopen')}
        hint={t('leaves.reopenHint')}
        placeholder={t('leaves.reopenReason')}
        confirmLabel={t('leaves.reopen')}
        minLength={REOPEN_REASON_MIN}
        danger={false}
        onConfirm={handleReopen}
        onClose={() => setShowReopenModal(false)}
        styles={s}
        colors={colors}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 16 },

    empCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, padding: 14, marginBottom: 10 },
    empInfo: { flex: 1 },
    empName: { fontSize: 15, ...ff('800'), color: c.text },
    empSub: { fontSize: 12, color: c.textMuted, marginTop: 2, ...ff('700') },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 12, ...ff('800') },

    infoCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 10 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 13, gap: 12 },
    infoLabel: { fontSize: 13, color: c.textMuted, flex: 1, ...ff('700') },
    infoValue: { fontSize: 13, ...ff('700'), color: c.text, flex: 1.5, textAlign: 'right' },
    divider: { height: 1, backgroundColor: c.cardBorder },

    rejectionCard: { backgroundColor: c.errorSoft, borderRadius: 14, borderWidth: 1, borderColor: c.error, padding: 14, marginBottom: 10 },
    rejectionLabel: { fontSize: 12, ...ff('700'), color: c.error, marginBottom: 6 },
    rejectionText: { fontSize: 14, color: c.text, lineHeight: 20, ...ff('700') },

    signersCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, marginBottom: 10 },
    signersTitle: { fontSize: 13, ...ff('800'), color: c.textSecondary, marginBottom: 12 },
    signerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 8, borderBottomWidth: 2, borderBottomColor: c.cardBorder },
    signerInfo: { flex: 1 },
    signerName: { fontSize: 13, ...ff('700'), color: c.text },
    signerSub: { fontSize: 11, color: c.textMuted, marginTop: 2, ...ff('700') },
    signerStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    signerStatusText: { fontSize: 11, ...ff('800') },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    rejectBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.error },
    rejectBtnText: { color: c.error, fontSize: 15, ...ff('800') },
    approveBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.success },
    approveBtnText: { color: c.onPrimary, fontSize: 15, ...ff('800') },

    reopenCard: { backgroundColor: c.warningSoft, borderRadius: 14, borderWidth: 1, borderColor: c.warning, padding: 12, marginBottom: 10 },
    reopenText: { fontSize: 13, color: c.text, lineHeight: 18, ...ff('700') },
    reopenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 10, borderWidth: 1.5, borderColor: c.primary },
    reopenBtnText: { color: c.primary, fontSize: 15, ...ff('800') },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 10, borderWidth: 1.5, borderColor: c.error },
    deleteBtnText: { color: c.error, fontSize: 15, ...ff('800') },

    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 32 },
    handle: { width: 40, height: 4, backgroundColor: c.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetHint: { fontSize: 13, color: c.textMuted, lineHeight: 18, marginBottom: 12, ...ff('600') },
    sheetTitle: { fontSize: 17, ...ff('800'), color: c.text, marginBottom: 12 },
    sheetInput: { backgroundColor: c.bg, borderRadius: 12, borderWidth: 2, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 14, minHeight: 100, marginBottom: 16, ...ff('700') },
    btnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: c.cardBorder },
    cancelBtnText: { color: c.textMuted, fontSize: 15, ...ff('700') },
    confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: c.error },
    confirmBtnText: { color: c.onPrimary, fontSize: 15, ...ff('800') },
  });
