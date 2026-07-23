import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, ErrorState } from '@/components/StateViews';
import { ScreenHeader } from '@/components/ScreenHeader';
import { confirm } from '@/lib/confirm';
import { getApiErrorMessage } from '@/api/errors';
import { ticketStatusKey, ticketPriorityKey, canRateTicket } from '@/utils/supportStatus';
import { ticketDetailQuery } from '../api/queries';
import { useRateTicket, useReopenTicket } from '../api/mutations';

export default function SupportDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = Number(id);
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: ticket, isLoading, isError, refetch } = useQuery(ticketDetailQuery(ticketId));
  const rateM = useRateTicket(ticketId);
  const reopenM = useReopenTicket(ticketId);

  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState('');

  if (isLoading) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScreenHeader title={t('support.detailTitle')} /><LoadingView /></SafeAreaView>;
  }
  if (isError || !ticket) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScreenHeader title={t('support.detailTitle')} /><ErrorState onRetry={refetch} /></SafeAreaView>;
  }

  const isCreator = ticket.created_by_id === employeeId;
  const canRate = canRateTicket(ticket, isCreator);

  const submitRate = () => {
    setRateOpen(false);
    rateM.mutate(
      { rating, note: note.trim() || null },
      {
        onSuccess: () => { setNote(''); Alert.alert(t('support.rateDone'), ''); refetch(); },
        onError: (e) => Alert.alert(t('support.actionError'), getApiErrorMessage(e, t('support.actionError'))),
      },
    );
  };

  const onReopen = async () => {
    const ok = await confirm({
      title: t('support.reopenConfirmTitle'),
      message: t('support.reopenConfirmMessage'),
      confirmLabel: t('support.reopen'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    reopenM.mutate(undefined, {
      onSuccess: () => { Alert.alert(t('support.reopenDone'), ''); refetch(); },
      onError: (e) => Alert.alert(t('support.actionError'), getApiErrorMessage(e, t('support.actionError'))),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={t('support.detailTitle')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.priority}>{t(ticketPriorityKey(ticket.priority))}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{t(ticketStatusKey(ticket.status))}</Text></View>
          </View>
          <Text style={styles.description}>{ticket.description}</Text>
        </View>

        <View style={styles.card}>
          {!!ticket.uge_number && <KV k={t('support.fieldUge')} v={ticket.uge_number} />}
          {!!ticket.room_number && <KV k={t('support.fieldRoom')} v={ticket.room_number} />}
          <KV k={t('support.fieldAssignee')} v={ticket.assignee?.legal_name || t('support.noAssignee')} />
          {!!ticket.created_at && <KV k={t('support.fieldCreated')} v={dayjs(ticket.created_at).format('DD.MM.YYYY HH:mm')} />}
          {ticket.rating != null && <KV k={t('support.ratingLabel')} v={`${ticket.rating} / 5`} />}
        </View>

        {!!ticket.attachments?.length && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('support.attachmentsTitle')}</Text>
            {ticket.attachments.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.fileRow}
                activeOpacity={0.7}
                onPress={() => a.file_url && Linking.openURL(a.file_url)}
              >
                <Icon name="doc" size={16} color={colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>{a.original_filename || t('support.attachmentsTitle')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {canRate && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, styles.rateBtn]} onPress={() => setRateOpen(true)} disabled={rateM.isPending} activeOpacity={0.85}>
              <Icon name="check" size={18} color={colors.onPrimary} />
              <Text style={styles.rateBtnText}>{t('support.rate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.reopenBtn]} onPress={onReopen} disabled={reopenM.isPending} activeOpacity={0.85}>
              <Text style={[styles.rateBtnText, { color: colors.text }]}>{t('support.reopen')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={rateOpen} transparent animationType="fade" onRequestClose={() => setRateOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('support.rateTitle')}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <Icon name={n <= rating ? 'check' : 'close'} size={26} color={n <= rating ? colors.success : colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={t('support.rateNotePlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRateOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitRate} activeOpacity={0.8}>
                <Text style={styles.modalSubmitText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.cardBorder },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    priority: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    badge: { backgroundColor: c.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700', color: c.primary },
    description: { fontSize: 15, color: c.text, lineHeight: 22 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 10 },
    kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    kvKey: { fontSize: 13, color: c.textMuted },
    kvVal: { fontSize: 13, color: c.text, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
    fileName: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
    rateBtn: { backgroundColor: c.primary },
    reopenBtn: { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    rateBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 24 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 20, gap: 12 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    stars: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
    input: { backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text, minHeight: 60 },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    modalCancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
    modalSubmit: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: c.primary },
    modalSubmitText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
