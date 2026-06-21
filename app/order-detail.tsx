import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import {
  ORDER_ACT_DETAIL, ORDER_ACT_DECREE_APPROVE, ORDER_ACT_DECREE_REJECT,
  ORDER_ACT_DECREE_RESUBMIT, ORDER_ACT_DECREE_FORWARD, ORDER_ACT_DECREE_REGISTER,
  ORDER_ACT_DECREE_ACKNOWLEDGE,
} from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { OrderAct } from '../src/types';
import { statusMeta, statusColor, currentStageType } from '../src/utils/orderStatus';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [actNumber, setActNumber] = useState('');

  const { data: order, isLoading, refetch } = useQuery<OrderAct>({
    queryKey: ['order-detail', orderId],
    queryFn: () => apiClient.get(ORDER_ACT_DETAIL(orderId)).then((r) => r.data),
    enabled: !!orderId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    queryClient.invalidateQueries({ queryKey: ['order-acts'] });
    refetch();
  };

  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      invalidate();
      Alert.alert('Bajarildi', successMsg);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Amalni bajarishda xatolik');
      Alert.alert('Xatolik', typeof msg === 'string' ? msg : 'Amalni bajarishda xatolik');
    } finally {
      setBusy(false);
    }
  };

  const onApprove = () =>
    runAction(() => apiClient.post(ORDER_ACT_DECREE_APPROVE(orderId), {}), 'Buyruq tasdiqlandi');

  const onReject = async () => {
    if (!rejectReason.trim()) { Alert.alert('Xato', 'Sababni kiriting'); return; }
    setRejectOpen(false);
    await runAction(
      () => apiClient.post(ORDER_ACT_DECREE_REJECT(orderId), { comment: rejectReason.trim() }),
      "O'zgartirish so'raldi"
    );
    setRejectReason('');
  };

  const onResubmit = () =>
    runAction(() => apiClient.post(ORDER_ACT_DECREE_RESUBMIT(orderId)), 'Qayta yuborildi');

  const onForward = () =>
    runAction(() => apiClient.post(ORDER_ACT_DECREE_FORWARD(orderId)), 'Rahbariyatga yuborildi');

  const onAcknowledge = () =>
    runAction(() => apiClient.post(ORDER_ACT_DECREE_ACKNOWLEDGE(orderId)), 'Tanishildi');

  const onRegister = async () => {
    setRegisterOpen(false);
    await runAction(
      () => apiClient.post(ORDER_ACT_DECREE_REGISTER(orderId),
        actNumber.trim() ? { act_number: Number(actNumber.trim()) } : {}),
      "Ro'yxatga olindi"
    );
    setActNumber('');
  };

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header styles={styles} />
        <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
      </SafeAreaView>
    );
  }

  const meta = statusMeta(order.status);
  const sc = statusColor(meta.kind, colors);
  const stage = currentStageType(order);

  const stageSigners = (order.assigned_signers ?? []).filter((s) => s.signer_type === stage);
  const iAmStageSigner = !!stage && stageSigners.some((s) => (s.employee_id ?? s.employee?.id) === employeeId);
  const iSigned = (order.signers ?? []).some((s) => (s.employee_id ?? s.employee?.id) === employeeId);
  const canApprove = iAmStageSigner && !iSigned;

  const isCreator = order.created_by_id === employeeId || order.submitter_id === employeeId;
  const canResubmit = order.status === 'changes_requested' && isCreator;
  const canForward = order.status === 'approved' && isCreator;
  const canRegister = order.status === 'pending_chancellery' && isCreator;

  const myFam = (order.familiarizers ?? []).find((f) => (f.employee_id ?? f.employee?.id) === employeeId);
  const canAcknowledge = !!myFam && !myFam.acknowledged && (order.status === 'confirmed' || order.status === 'applied');

  const hasActions = canApprove || canResubmit || canForward || canRegister || canAcknowledge;

  // The document is editable while it is still moving through approval and the
  // viewer is the creator or an assigned approver at the active stage. Once it
  // is confirmed/applied it opens read-only. Backend permissions are the final
  // authority — this just picks the requested mode.
  const docLocked = order.status === 'confirmed' || order.status === 'applied' || order.status === 'rejected';
  const canEditDoc = !docLocked && (isCreator || canApprove);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header styles={styles} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status + title */}
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
          </View>
          <Text style={styles.bigTitle}>
            {order.category_rel?.name || 'Buyruq'}{order.act_number ? `  №${order.act_number}` : ''}
          </Text>
          {!!order.act_date && (
            <Text style={styles.subMeta}>Sana: {dayjs(order.act_date).format('DD.MM.YYYY')}</Text>
          )}
          {!!order.document && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/order-document',
                  params: { id: orderId, mode: canEditDoc ? 'edit' : 'view' },
                } as any)
              }
            >
              <Text style={styles.docBtnText}>📄  Hujjatni ochish</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {!!order.description && (
          <Section styles={styles} title="Mazmuni">
            <Text style={styles.bodyText}>{order.description}</Text>
          </Section>
        )}
        {!!order.summary && (
          <Section styles={styles} title="Qisqacha">
            <Text style={styles.bodyText}>{order.summary}</Text>
          </Section>
        )}
        {!!order.plans && (
          <Section styles={styles} title="Rejalar">
            <Text style={styles.bodyText}>{order.plans}</Text>
          </Section>
        )}

        {/* People */}
        <Section styles={styles} title="Ma'lumot">
          {!!order.employee?.legal_name && <KV styles={styles} k="Xodim" v={order.employee.legal_name} />}
          {!!order.submitter?.legal_name && <KV styles={styles} k="Yuboruvchi" v={order.submitter.legal_name} />}
          {!!order.created_by?.legal_name && <KV styles={styles} k="Yaratdi" v={order.created_by.legal_name} />}
          {!!order.planned_arrival_date && <KV styles={styles} k="Borish" v={dayjs(order.planned_arrival_date).format('DD.MM.YYYY')} />}
          {!!order.planned_departure_date && <KV styles={styles} k="Qaytish" v={dayjs(order.planned_departure_date).format('DD.MM.YYYY')} />}
        </Section>

        {/* Signers */}
        {(order.assigned_signers?.length ?? 0) > 0 && (
          <Section styles={styles} title="Imzolovchilar">
            {order.assigned_signers!.map((s, i) => {
              const sid = s.employee_id ?? s.employee?.id;
              const signed = (order.signers ?? []).some((x) => (x.employee_id ?? x.employee?.id) === sid);
              return (
                <View key={s.id ?? i} style={styles.signerRow}>
                  <View style={[styles.signerDot, { backgroundColor: signed ? colors.success : colors.cardBorder }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signerName}>{s.employee?.legal_name || 'Xodim'}</Text>
                    <Text style={styles.signerType}>
                      {s.signer_type === 'leadership' ? 'Rahbariyat' : 'Kelishuvchi'}
                    </Text>
                  </View>
                  <Text style={[styles.signerStatus, { color: signed ? colors.success : colors.textMuted }]}>
                    {signed ? '✓ Imzolandi' : 'Kutilmoqda'}
                  </Text>
                </View>
              );
            })}
          </Section>
        )}

        {/* Familiarizers */}
        {(order.familiarizers?.length ?? 0) > 0 && (
          <Section styles={styles} title="Tanishuvchilar">
            {order.familiarizers!.map((f, i) => (
              <View key={f.id ?? i} style={styles.signerRow}>
                <View style={[styles.signerDot, { backgroundColor: f.acknowledged ? colors.success : colors.cardBorder }]} />
                <Text style={[styles.signerName, { flex: 1 }]}>{f.employee?.legal_name || 'Xodim'}</Text>
                <Text style={[styles.signerStatus, { color: f.acknowledged ? colors.success : colors.textMuted }]}>
                  {f.acknowledged ? '✓ Tanishdi' : 'Kutilmoqda'}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* Comments / history */}
        {(order.comments?.length ?? 0) > 0 && (
          <Section styles={styles} title="Tarix">
            {order.comments!.map((cm, i) => (
              <View key={cm.id ?? i} style={styles.commentRow}>
                <Text style={styles.commentAuthor}>{cm.employee?.legal_name || 'Xodim'}</Text>
                {!!cm.text && <Text style={styles.commentText}>{cm.text}</Text>}
                {!!cm.created_at && <Text style={styles.commentDate}>{dayjs(cm.created_at).format('DD.MM.YYYY HH:mm')}</Text>}
              </View>
            ))}
          </Section>
        )}

        {!!order.rejection_reason && (
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>O'zgartirish sababi</Text>
            <Text style={styles.rejectText}>{order.rejection_reason}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action bar */}
      {hasActions && (
        <View style={styles.actionBar}>
          {canApprove && (
            <>
              <TouchableOpacity style={[styles.actBtn, styles.actReject]} disabled={busy} onPress={() => setRejectOpen(true)} activeOpacity={0.85}>
                <Text style={styles.actRejectText}>O'zgartirish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onApprove} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>Tasdiqlash</Text>}
              </TouchableOpacity>
            </>
          )}
          {canResubmit && (
            <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onResubmit} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>Qayta yuborish</Text>}
            </TouchableOpacity>
          )}
          {canForward && (
            <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onForward} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>Rahbariyatga yuborish</Text>}
            </TouchableOpacity>
          )}
          {canRegister && (
            <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={() => setRegisterOpen(true)} activeOpacity={0.85}>
              <Text style={styles.actApproveText}>Ro'yxatga olish</Text>
            </TouchableOpacity>
          )}
          {canAcknowledge && (
            <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onAcknowledge} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>Tanishdim</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reject modal */}
      <Modal visible={rejectOpen} transparent animationType="fade" onRequestClose={() => setRejectOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>O'zgartirish so'rash</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Sababni yozing..."
              placeholderTextColor={colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setRejectOpen(false)}>
                <Text style={styles.modalCancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={onReject}>
                <Text style={styles.modalConfirmText}>Yuborish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Register modal */}
      <Modal visible={registerOpen} transparent animationType="fade" onRequestClose={() => setRegisterOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ro'yxatga olish</Text>
            <Text style={styles.modalHint}>Buyruq raqamini kiriting (ixtiyoriy)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Buyruq raqami"
              placeholderTextColor={colors.textMuted}
              value={actNumber}
              onChangeText={setActNumber}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setRegisterOpen(false)}>
                <Text style={styles.modalCancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={onRegister}>
                <Text style={styles.modalConfirmText}>Tasdiqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ styles }: { styles: any }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backArrow}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Buyruq</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function Section({ styles, title, children }: { styles: any; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KV({ styles, k, v }: { styles: any; k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },

    content: { paddingHorizontal: 16, paddingTop: 14 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    bigTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    subMeta: { fontSize: 13, color: c.textMuted },
    docBtn: { marginTop: 6, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    docBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },

    section: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    bodyText: { fontSize: 14, color: c.text, lineHeight: 21 },

    kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
    kvKey: { fontSize: 13, color: c.textMuted, flex: 1 },
    kvVal: { fontSize: 13, color: c.text, fontWeight: '600', flex: 2, textAlign: 'right' },

    signerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    signerDot: { width: 10, height: 10, borderRadius: 5 },
    signerName: { fontSize: 14, color: c.text, fontWeight: '600' },
    signerType: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    signerStatus: { fontSize: 12, fontWeight: '600' },

    commentRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.cardBorder, gap: 3 },
    commentAuthor: { fontSize: 13, fontWeight: '700', color: c.text },
    commentText: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    commentDate: { fontSize: 11, color: c.textMuted },

    rejectCard: { backgroundColor: c.errorSoft, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.error },
    rejectTitle: { fontSize: 13, fontWeight: '700', color: c.error, marginBottom: 4 },
    rejectText: { fontSize: 13, color: c.text, lineHeight: 19 },

    actionBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
      backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.cardBorder,
    },
    actBtn: { flex: 1, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
    actApprove: { backgroundColor: c.primary },
    actApproveText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
    actReject: { backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error },
    actRejectText: { color: c.error, fontSize: 15, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 28 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: c.cardBorder },
    modalTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 8 },
    modalHint: { fontSize: 13, color: c.textMuted, marginBottom: 10 },
    modalInput: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      padding: 12, fontSize: 15, color: c.text, minHeight: 48, textAlignVertical: 'top', marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
    modalCancel: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    modalCancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '700' },
    modalConfirm: { backgroundColor: c.primary },
    modalConfirmText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
