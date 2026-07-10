import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { statusMeta, statusColor, decreePermissions } from '@/utils/orderStatus';
import { orderDetailQuery } from '../api/queries';
import { useDecreeActions } from '../hooks/useDecreeActions';
import { DetailHeader, Section, KV } from '../components/DetailParts';
import { DetailSections } from '../components/DetailSections';
import { DecreeActionBar } from '../components/DecreeActionBar';
import { RejectModal, RegisterModal } from '../components/DetailModals';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [actNumber, setActNumber] = useState('');

  const { data: order, isLoading, refetch } = useQuery(orderDetailQuery(orderId));

  const { busy, approve, reject, resubmit, forward, acknowledge, register } =
    useDecreeActions(orderId, refetch);

  const onReject = async () => {
    // Blank reason: keep the modal open and let reject() show the original
    // "Sababni kiriting" Alert (matches the pre-decomposition behavior).
    if (!rejectReason.trim()) {
      await reject(rejectReason);
      return;
    }
    setRejectOpen(false);
    await reject(rejectReason);
    setRejectReason('');
  };

  const onRegister = async () => {
    setRegisterOpen(false);
    await register(actNumber);
    setActNumber('');
  };

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <DetailHeader />
        <LoadingView />
      </SafeAreaView>
    );
  }

  const meta = statusMeta(order.status);
  const sc = statusColor(meta.kind, colors);
  const perms = decreePermissions(order, employeeId);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DetailHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status + title */}
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
          </View>
          <Text style={styles.bigTitle}>
            {order.category_rel?.name || t('orders.fallbackTitle')}{order.act_number ? `  №${order.act_number}` : ''}
          </Text>
          {!!order.act_date && (
            <Text style={styles.subMeta}>{t('orders.dateLabel')}: {dayjs(order.act_date).format('DD.MM.YYYY')}</Text>
          )}
          {!!order.document && (
            <TouchableOpacity
              style={styles.docBtn}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/order-document',
                  params: { id: String(orderId), mode: perms.canEditDoc ? 'edit' : 'view' },
                })
              }
            >
              <Icon name="doc" size={16} color={colors.primary} />
              <Text style={styles.docBtnText}>{t('orders.openDocument')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {!!order.description && (
          <Section title={t('orders.sectionDescription')}><Text style={styles.bodyText}>{order.description}</Text></Section>
        )}
        {!!order.summary && (
          <Section title={t('orders.sectionSummary')}><Text style={styles.bodyText}>{order.summary}</Text></Section>
        )}
        {!!order.plans && (
          <Section title={t('orders.sectionPlans')}><Text style={styles.bodyText}>{order.plans}</Text></Section>
        )}

        {/* People */}
        <Section title={t('orders.sectionInfo')}>
          {!!order.employee?.legal_name && <KV k={t('orders.kvEmployee')} v={order.employee.legal_name} />}
          {!!order.submitter?.legal_name && <KV k={t('orders.kvSubmitter')} v={order.submitter.legal_name} />}
          {!!order.created_by?.legal_name && <KV k={t('orders.kvCreatedBy')} v={order.created_by.legal_name} />}
          {!!order.planned_arrival_date && <KV k={t('orders.kvArrival')} v={dayjs(order.planned_arrival_date).format('DD.MM.YYYY')} />}
          {!!order.planned_departure_date && <KV k={t('orders.kvDeparture')} v={dayjs(order.planned_departure_date).format('DD.MM.YYYY')} />}
        </Section>

        <DetailSections order={order} />

        {!!order.rejection_reason && (
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>{t('orders.changeReasonTitle')}</Text>
            <Text style={styles.rejectText}>{order.rejection_reason}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <DecreeActionBar
        perms={perms}
        busy={busy}
        onApprove={approve}
        onReject={() => setRejectOpen(true)}
        onResubmit={resubmit}
        onForward={forward}
        onAcknowledge={acknowledge}
        onRegister={() => setRegisterOpen(true)}
      />

      <RejectModal
        visible={rejectOpen}
        reason={rejectReason}
        onChangeReason={setRejectReason}
        onClose={() => setRejectOpen(false)}
        onSubmit={onReject}
      />
      <RegisterModal
        visible={registerOpen}
        actNumber={actNumber}
        onChangeActNumber={setActNumber}
        onClose={() => setRegisterOpen(false)}
        onSubmit={onRegister}
      />
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
  });
