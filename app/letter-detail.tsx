import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { LETTER_DETAIL, LETTER_SIGN, LETTER_REJECT } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import type { Letter } from '../src/types';
import { statusColor } from '../src/utils/orderStatus';
import {
  letterStatusMeta, letterTypeLabel, canSignLetter, getSigningTimeline,
} from '../src/utils/letterStatus';
import { Icon } from '../src/components/Icon';

export default function LetterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const letterId = Number(id);
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [busy, setBusy] = useState(false);

  const { data: letter, isLoading, refetch } = useQuery<Letter>({
    queryKey: ['letter-detail', letterId],
    queryFn: () => apiClient.get(LETTER_DETAIL(letterId)).then((r) => r.data),
    enabled: !!letterId,
    // Approval state must reflect the server on every open (another signer may
    // have acted). Override the global staleTime so it always revalidates.
    refetchOnMount: 'always',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['letter-detail', letterId] });
    qc.invalidateQueries({ queryKey: ['letters'] });
    refetch();
  };

  const run = async (fn: () => Promise<any>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      invalidate();
      Alert.alert('Bajarildi', msg);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const m = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Xatolik');
      Alert.alert('Xatolik', typeof m === 'string' ? m : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const onSign = () => run(() => apiClient.post(LETTER_SIGN(letterId)), 'Imzolandi');
  const onReject = () => {
    Alert.alert('Rad etish', 'Xatni rad etishni tasdiqlaysizmi?', [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Rad etish', style: 'destructive', onPress: () => run(() => apiClient.post(LETTER_REJECT(letterId)), 'Rad etildi') },
    ]);
  };

  if (isLoading || !letter) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header styles={styles} colors={colors} />
        <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
      </SafeAreaView>
    );
  }

  const meta = letterStatusMeta(letter);
  const sc = statusColor(meta.kind, colors);
  const timeline = getSigningTimeline(letter);
  const canAct = canSignLetter(letter, employeeId);
  const hasDoc = !!letter.generated_document_path;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header styles={styles} colors={colors} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
          </View>
          <Text style={styles.bigTitle}>
            {letterTypeLabel(letter.letter_type)}{letter.letter_number ? `  №${letter.letter_number}` : ''}
          </Text>
          {!!letter.letter_date && <Text style={styles.subMeta}>Sana: {dayjs(letter.letter_date).format('DD.MM.YYYY')}</Text>}
          {hasDoc && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/letter-document', params: { id: String(letterId) } })}
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>Hujjatni ochish</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!letter.description && (
          <Section styles={styles} title="Mazmuni"><Text style={styles.bodyText}>{letter.description}</Text></Section>
        )}

        <Section styles={styles} title="Ma'lumot">
          {!!(letter.employee?.legal_name || letter.submitter?.legal_name) &&
            <KV styles={styles} k="Muallif" v={(letter.employee?.legal_name || letter.submitter?.legal_name)!} />}
          {!!letter.departure_date && <KV styles={styles} k="Ketish" v={dayjs(letter.departure_date).format('DD.MM.YYYY')} />}
          {!!letter.arrival_date && <KV styles={styles} k="Qaytish" v={dayjs(letter.arrival_date).format('DD.MM.YYYY')} />}
        </Section>

        {timeline.length > 0 && (
          <Section styles={styles} title="Imzolovchilar">
            {timeline.map((t) => {
              const tc = t.status === 'signed' ? colors.success : t.status === 'rejected' ? colors.error : colors.textMuted;
              return (
                <View key={t.key} style={styles.signerRow}>
                  <View style={[styles.signerDot, { backgroundColor: tc }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signerName}>{t.name}</Text>
                    <Text style={styles.signerType}>{t.role}</Text>
                  </View>
                  <Text style={[styles.signerStatus, { color: tc }]}>{t.statusText}</Text>
                </View>
              );
            })}
          </Section>
        )}

        {!!letter.rejection_reason && (
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>Rad etish sababi</Text>
            <Text style={styles.rejectText}>{letter.rejection_reason}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {canAct && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={[styles.actBtn, styles.actReject]} disabled={busy} onPress={onReject} activeOpacity={0.85}>
            <Text style={styles.actRejectText}>Rad etish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onSign} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>Imzolash</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Header({ styles, colors }: { styles: any; colors: ThemeColors }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Icon name="chevronLeft" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Xat</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}
function Section({ styles, title, children }: { styles: any; title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function KV({ styles, k, v }: { styles: any; k: string; v: string }) {
  return <View style={styles.kvRow}><Text style={styles.kvKey}>{k}</Text><Text style={styles.kvVal}>{v}</Text></View>;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    content: { paddingHorizontal: 16, paddingTop: 14 },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    bigTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    subMeta: { fontSize: 13, color: c.textMuted },
    docBtn: { marginTop: 6, backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
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
    rejectCard: { backgroundColor: c.errorSoft, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.error },
    rejectTitle: { fontSize: 13, fontWeight: '700', color: c.error, marginBottom: 4 },
    rejectText: { fontSize: 13, color: c.text, lineHeight: 19 },
    actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.cardBorder },
    actBtn: { flex: 1, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
    actApprove: { backgroundColor: c.primary },
    actApproveText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
    actReject: { backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error },
    actRejectText: { color: c.error, fontSize: 15, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 28 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: c.cardBorder },
    modalTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 8 },
    modalInput: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, minHeight: 48, textAlignVertical: 'top', marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
    modalCancel: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    modalCancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '700' },
    modalConfirm: { backgroundColor: c.primary },
    modalConfirmText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
