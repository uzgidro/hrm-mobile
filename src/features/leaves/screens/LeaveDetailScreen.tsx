import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Employee } from '@/types';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { getApiErrorMessage } from '@/api/errors';
import { isHR } from '@/utils/roles';
import { leaveDetailQuery } from '../api/queries';
import { useSignLeave, useRejectLeave } from '../api/mutations';
import { canActOnLeave } from '../utils';
import { leaveTypeLabel } from '../components/LeaveTypeSheet';

function isApproved(status: string) { return status === 'approved' || status === 'tasdiqlangan' || status === 'signed'; }
function isRejected(status: string) { return status === 'rejected' || status === 'rad_etilgan'; }

function getStatusMeta(status: string, c: ThemeColors, t: TFunction) {
  if (isApproved(status)) return { label: t('leaves.statusApproved'), fg: c.success, bg: c.successSoft };
  if (isRejected(status)) return { label: t('leaves.statusRejected'), fg: c.error, bg: c.errorSoft };
  return { label: t('leaves.statusPending'), fg: c.warning, bg: c.warningSoft };
}

function EmpAvatar({ emp, size = 40, c }: { emp: Employee; size?: number; c: ThemeColors }) {
  if (emp.photo_path) {
    return <Image source={{ uri: emp.photo_path }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: c.primaryLight }}>{(emp.legal_name || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function RejectModal({ visible, onConfirm, onClose, styles, colors }: {
  visible: boolean; onConfirm: (reason: string) => void; onClose: () => void; styles: any; colors: ThemeColors;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>{t('leaves.rejectReasonTitle')}</Text>
        <TextInput
          style={styles.sheetInput}
          placeholder={t('leaves.rejectReasonPlaceholder')}
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
          <TouchableOpacity style={[styles.confirmBtn, !reason.trim() && { opacity: 0.4 }]} disabled={!reason.trim()} onPress={() => { onConfirm(reason.trim()); setReason(''); }}>
            <Text style={styles.confirmBtnText}>{t('leaves.reject')}</Text>
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

  const { data: leave, isLoading } = useQuery(leaveDetailQuery(leaveId));

  const signMutation = useSignLeave(leaveId);
  const rejectMutation = useRejectLeave(leaveId);

  // Web parity: HR is view-only (never signs/rejects). canActOnLeave mirrors the
  // web's canActOnWorkLeave — the sign/reject buttons appear only for a
  // non-HR assigned signer on a pending request they haven't signed yet.
  const { canSign, canReject } = canActOnLeave(leave, employeeId, { isHR: isHR(user) });
  const canApprove = canSign || canReject;

  const handleApprove = useCallback(async () => {
    setActing(true);
    try {
      await signMutation.mutateAsync();
      Alert.alert(t('common.success'), t('leaves.approvedSuccess'));
    } catch (e) {
      Alert.alert(t('leaves.errorTitle'), getApiErrorMessage(e, t('leaves.approveError')));
    } finally { setActing(false); }
  }, [signMutation, t]);

  const handleReject = useCallback(async (reason: string) => {
    setShowRejectModal(false);
    setActing(true);
    try {
      await rejectMutation.mutateAsync(reason);
      Alert.alert(t('common.success'), t('leaves.rejectedSuccess'));
    } catch (e) {
      Alert.alert(t('leaves.errorTitle'), getApiErrorMessage(e, t('leaves.rejectError')));
    } finally { setActing(false); }
  }, [rejectMutation, t]);

  const headerBar = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Icon name="chevronLeft" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{t('leaves.detailTitle')}</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {headerBar}
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (!leave) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {headerBar}
        <EmptyState title={t('leaves.notFound')} />
      </SafeAreaView>
    );
  }

  const stMeta = getStatusMeta(leave.status, colors, t);
  const sameDay = dayjs(leave.start_date).format('DD.MM.YYYY') === dayjs(leave.end_date).format('DD.MM.YYYY');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {headerBar}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {leave.employee && (
          <View style={s.empCard}>
            <EmpAvatar emp={leave.employee} size={56} c={colors} />
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

        {(leave.assigned_signers?.length ?? 0) > 0 && (
          <View style={s.signersCard}>
            <Text style={s.signersTitle}>{t('leaves.signersTitle')}</Text>
            {leave.assigned_signers!.map((signer) => {
              const hasSigned = leave.signers?.some((sg) => sg.id === signer.id);
              return (
                <View key={signer.id} style={s.signerRow}>
                  <EmpAvatar emp={signer} size={40} c={colors} />
                  <View style={s.signerInfo}>
                    <Text style={s.signerName}>{signer.legal_name}</Text>
                    <Text style={s.signerSub} numberOfLines={1}>{signer.job_position?.name ?? signer.department?.name ?? '—'}</Text>
                  </View>
                  <View style={[s.signerStatus, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: (hasSigned ? colors.success : colors.warning) === colors.success ? colors.successSoft : colors.warningSoft }]}>
                    <Icon name={hasSigned ? 'check' : 'clock'} size={13} color={hasSigned ? colors.success : colors.warning} />
                    <Text style={[s.signerStatusText, { color: hasSigned ? colors.success : colors.warning }]}>{hasSigned ? t('leaves.signerSigned') : t('leaves.statusPending')}</Text>
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
              {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.approveBtnText}>{t('leaves.approve')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <RejectModal visible={showRejectModal} onConfirm={handleReject} onClose={() => setShowRejectModal(false)} styles={s} colors={colors} />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },

    content: { paddingHorizontal: 16, paddingTop: 16 },

    empCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 14, marginBottom: 10 },
    empInfo: { flex: 1 },
    empName: { fontSize: 15, fontWeight: '700', color: c.text },
    empSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },

    infoCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 10 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 13, gap: 12 },
    infoLabel: { fontSize: 13, color: c.textMuted, flex: 1 },
    infoValue: { fontSize: 13, fontWeight: '600', color: c.text, flex: 1.5, textAlign: 'right' },
    divider: { height: 1, backgroundColor: c.cardBorder },

    rejectionCard: { backgroundColor: c.errorSoft, borderRadius: 14, borderWidth: 1, borderColor: c.error, padding: 14, marginBottom: 10 },
    rejectionLabel: { fontSize: 12, fontWeight: '600', color: c.error, marginBottom: 6 },
    rejectionText: { fontSize: 14, color: c.text, lineHeight: 20 },

    signersCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, marginBottom: 10 },
    signersTitle: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 12 },
    signerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    signerInfo: { flex: 1 },
    signerName: { fontSize: 13, fontWeight: '600', color: c.text },
    signerSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    signerStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    signerStatusText: { fontSize: 11, fontWeight: '700' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    rejectBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.error },
    rejectBtnText: { color: c.error, fontSize: 15, fontWeight: '700' },
    approveBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.success },
    approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 32 },
    handle: { width: 40, height: 4, backgroundColor: c.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12 },
    sheetInput: { backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 14, minHeight: 100, marginBottom: 16 },
    btnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.cardBorder },
    cancelBtnText: { color: c.textMuted, fontSize: 15, fontWeight: '600' },
    confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: c.error },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
