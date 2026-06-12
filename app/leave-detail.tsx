import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Image,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { WORK_LEAVE_DETAIL, WORK_LEAVE_SIGN, WORK_LEAVE_REJECT } from '../src/api/urls';
import { COLORS } from '../src/constants';
import { WorkLeave, Employee } from '../src/types';

function isPending(status: string) {
  return status === 'pending' || status === 'yuborildi';
}
function isApproved(status: string) {
  return status === 'approved' || status === 'tasdiqlangan' || status === 'signed';
}
function isRejected(status: string) {
  return status === 'rejected' || status === 'rad_etilgan';
}

function getStatusMeta(status: string): { label: string; color: string } {
  if (isApproved(status)) return { label: 'Tasdiqlangan', color: COLORS.present };
  if (isRejected(status)) return { label: 'Rad etildi', color: '#E5536A' };
  return { label: 'Kutilmoqda', color: COLORS.warning };
}

function EmpAvatar({ emp, size = 40 }: { emp: Employee; size?: number }) {
  if (emp.photo_path) {
    return <Image source={{ uri: emp.photo_path }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: COLORS.primary + '33',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: COLORS.primaryLight }}>
        {(emp.legal_name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function RejectModal({ visible, onConfirm, onClose }: {
  visible: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={m.sheet}>
        <View style={m.handle} />
        <Text style={m.title}>Rad etish sababi</Text>
        <TextInput
          style={m.input}
          placeholder="Sababni yozing..."
          placeholderTextColor={COLORS.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <View style={m.btnRow}>
          <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
            <Text style={m.cancelBtnText}>Bekor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[m.confirmBtn, !reason.trim() && { opacity: 0.4 }]}
            disabled={!reason.trim()}
            onPress={() => { onConfirm(reason.trim()); setReason(''); }}
          >
            <Text style={m.confirmBtnText}>Rad etish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function LeaveDetailScreen() {
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const employeeId = user?.employee?.id;

  const [acting, setActing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data: leave, isLoading } = useQuery<WorkLeave>({
    queryKey: ['leave-detail', id],
    queryFn: () => apiClient.get<WorkLeave>(WORK_LEAVE_DETAIL(Number(id))).then((r) => r.data),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  const canApprove = !!(
    leave &&
    isPending(leave.status) &&
    employeeId &&
    leave.assigned_signers?.some((s) => s.id === employeeId) &&
    !leave.signers?.some((s) => s.id === employeeId)
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leave-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['work-leaves'] });
    queryClient.invalidateQueries({ queryKey: ['team-leaves-all'] });
  }, [queryClient, id]);

  const handleApprove = useCallback(async () => {
    setActing(true);
    try {
      await apiClient.post(WORK_LEAVE_SIGN(Number(id)));
      invalidate();
      Alert.alert('Muvaffaqiyat', 'So\'rov tasdiqlandi');
    } catch {
      Alert.alert('Xato', 'Tasdiqlashda xatolik yuz berdi');
    } finally {
      setActing(false);
    }
  }, [id, invalidate]);

  const handleReject = useCallback(async (reason: string) => {
    setShowRejectModal(false);
    setActing(true);
    try {
      await apiClient.post(WORK_LEAVE_REJECT(Number(id)), { rejection_reason: reason });
      invalidate();
      Alert.alert('Muvaffaqiyat', 'So\'rov rad etildi');
    } catch {
      Alert.alert('Xato', 'Rad etishda xatolik yuz berdi');
    } finally {
      setActing(false);
    }
  }, [id, invalidate]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>So'rov tafsiloti</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!leave) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>So'rov tafsiloti</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>Ma'lumot topilmadi</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stMeta = getStatusMeta(leave.status);
  const sameDay =
    dayjs(leave.start_date).format('DD.MM.YYYY') === dayjs(leave.end_date).format('DD.MM.YYYY');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>So'rov tafsiloti</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Employee + Status */}
        {leave.employee && (
          <View style={s.empCard}>
            <EmpAvatar emp={leave.employee} size={56} />
            <View style={s.empInfo}>
              <Text style={s.empName}>{leave.employee.legal_name}</Text>
              <Text style={s.empSub} numberOfLines={1}>
                {leave.employee.job_position?.name ?? leave.employee.department?.name ?? '—'}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: stMeta.color + '22' }]}>
              <Text style={[s.badgeText, { color: stMeta.color }]}>{stMeta.label}</Text>
            </View>
          </View>
        )}

        {/* Leave info card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>So'rov turi</Text>
            <Text style={s.infoValue}>{leave.type ?? "So'rov"}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Boshlanish</Text>
            <Text style={s.infoValue}>{dayjs(leave.start_date).format('DD.MM.YYYY HH:mm')}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Tugash</Text>
            <Text style={s.infoValue}>{dayjs(leave.end_date).format(sameDay ? 'HH:mm' : 'DD.MM.YYYY HH:mm')}</Text>
          </View>
          {leave.description ? (
            <>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Izoh</Text>
                <Text style={[s.infoValue, { flex: 2, textAlign: 'right' }]}>{leave.description}</Text>
              </View>
            </>
          ) : null}
          {leave.created_at ? (
            <>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Yuborilgan</Text>
                <Text style={s.infoValue}>{dayjs(leave.created_at).format('DD.MM.YYYY HH:mm')}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Rejection reason */}
        {isRejected(leave.status) && leave.rejection_reason ? (
          <View style={s.rejectionCard}>
            <Text style={s.rejectionLabel}>Rad etish sababi</Text>
            <Text style={s.rejectionText}>{leave.rejection_reason}</Text>
          </View>
        ) : null}

        {/* Signers chronology */}
        {(leave.assigned_signers?.length ?? 0) > 0 && (
          <View style={s.signersCard}>
            <Text style={s.signersTitle}>Tasdiqlovchilar</Text>
            {leave.assigned_signers!.map((signer) => {
              const hasSigned = leave.signers?.some((s) => s.id === signer.id);
              return (
                <View key={signer.id} style={s.signerRow}>
                  <EmpAvatar emp={signer} size={40} />
                  <View style={s.signerInfo}>
                    <Text style={s.signerName}>{signer.legal_name}</Text>
                    <Text style={s.signerSub} numberOfLines={1}>
                      {signer.job_position?.name ?? signer.department?.name ?? '—'}
                    </Text>
                  </View>
                  <View style={[s.signerStatus, { backgroundColor: (hasSigned ? COLORS.present : COLORS.warning) + '22' }]}>
                    <Text style={[s.signerStatusText, { color: hasSigned ? COLORS.present : COLORS.warning }]}>
                      {hasSigned ? '✓ Tasdiqladi' : '⏳ Kutilmoqda'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Approve / Reject buttons */}
        {canApprove && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.rejectBtn, acting && { opacity: 0.5 }]}
              disabled={acting}
              onPress={() => setShowRejectModal(true)}
            >
              {acting ? <ActivityIndicator color="#E5536A" size="small" /> : <Text style={s.rejectBtnText}>Rad etish</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.approveBtn, acting && { opacity: 0.5 }]}
              disabled={acting}
              onPress={handleApprove}
            >
              {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.approveBtnText}>Tasdiqlash</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <RejectModal
        visible={showRejectModal}
        onConfirm={handleReject}
        onClose={() => setShowRejectModal(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, paddingLeft: 4 },

  content: { paddingHorizontal: 16, paddingTop: 16 },

  empCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 14, marginBottom: 10,
  },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  empSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  infoCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 16, paddingVertical: 4, marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 13, gap: 12,
  },
  infoLabel: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1.5, textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.cardBorder },

  rejectionCard: {
    backgroundColor: '#E5536A11', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5536A44',
    padding: 14, marginBottom: 10,
  },
  rejectionLabel: { fontSize: 12, fontWeight: '600', color: '#E5536A', marginBottom: 6 },
  rejectionText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  signersCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, marginBottom: 10,
  },
  signersTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12 },
  signerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 12, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  signerInfo: { flex: 1 },
  signerName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  signerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  signerStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  signerStatusText: { fontSize: 11, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  rejectBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5536A',
  },
  rejectBtnText: { color: '#E5536A', fontSize: 15, fontWeight: '700' },
  approveBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.present,
  },
  approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.cardBorder,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  input: {
    backgroundColor: COLORS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 14, minHeight: 100,
    marginBottom: 16,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#E5536A',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
