import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Employee } from '@/types';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { PickerModal, type PickerOption } from '@/components/PickerModal';
import { statusMeta, statusColor, decreePermissions, decreeSubmitTarget } from '@/utils/orderStatus';
import { isHR, isSiteMasterAdmin, employeeSubLabel } from '@/utils/roles';
import { orderDetailQuery, orderEmployeesQuery } from '../api/queries';
import { useDecreeActions } from '../hooks/useDecreeActions';
import { useAssignFamiliarizers } from '../api/mutations';
import { DetailHeader, Section, KV } from './DetailParts';
import { DetailSections } from './DetailSections';
import { DecreeActionBar } from './DecreeActionBar';
import { RejectModal, RegisterModal } from './DetailModals';

// The body of the decree detail — extracted so it can render either as the
// pushed route's content (phone / push-notification deep links, `embedded`
// falsy) or embedded inside the tablet split-view's right pane (`embedded`
// truthy). Embedded mode drops the safe-area root (the split pane already
// sits inside the list screen's own safe area) and hides the header's back
// button (there's nothing to "back" to inside a split pane).
export function OrderDetailView({ id, embedded = false }: { id: number; embedded?: boolean }) {
  const orderId = id;
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [actNumber, setActNumber] = useState('');
  const [famOpen, setFamOpen] = useState(false);
  const [famIds, setFamIds] = useState<number[]>([]);

  const { data: order, isLoading, refetch } = useQuery(orderDetailQuery(orderId));

  const { busy, submit, approve, reject, resubmit, forward, confirmSubmission, acknowledge, register } =
    useDecreeActions(orderId, refetch);

  const assignFam = useAssignFamiliarizers(orderId);
  // Employees to pick from — scoped to the order's branch like the create form.
  const { data: empData, isLoading: empsLoading } = useQuery(
    orderEmployeesQuery(order?.organization_branch_id),
  );
  const empOptions = useMemo<PickerOption[]>(
    () =>
      (empData?.items ?? []).map((e: Employee) => ({
        value: e.id,
        label: e.legal_name || t('status.unknown'),
        subLabel: employeeSubLabel(e),
        photo: e.photo_path ?? null,
      })),
    [empData, t],
  );
  // Employees who already acknowledged can never be removed (backend keeps them),
  // so a toggle off is ignored for them and they always stay in the sent list.
  const ackedIds = useMemo(
    () =>
      (order?.familiarizers ?? [])
        .filter((f) => f.acknowledged)
        .map((f) => f.employee_id!)
        .filter(Boolean),
    [order],
  );
  const initialFamIds = useMemo(
    () => (order?.familiarizers ?? []).map((f) => f.employee_id!).filter(Boolean),
    [order],
  );
  const openFamPicker = () => {
    setFamIds(initialFamIds);
    setFamOpen(true);
  };
  const toggleFam = (id: number) => {
    if (ackedIds.includes(id)) return; // acknowledged → locked in
    setFamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  // The picker's "Done"/X/back all route here. Only send when the set actually
  // changed and is non-empty — closing without edits (or with nothing picked) is
  // a cancel, not a submit, matching the web's disabled-when-empty submit button.
  const sameSet = (a: number[], b: number[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  const closeFamPicker = () => {
    setFamOpen(false);
    if (famIds.length === 0 || sameSet(famIds, initialFamIds)) return;
    assignFam.mutate(famIds, { onSuccess: () => refetch() });
  };

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

  if (isLoading || !order) {
    return renderRoot(
      <>
        <DetailHeader embedded={embedded} />
        <LoadingView />
      </>,
    );
  }

  const meta = statusMeta(order.status);
  const sc = statusColor(meta.kind, colors);
  // `user` ham uzatiladi: ro'yxatga olish DEVONXONA huquqi (yaratuvchiniki emas)
  // va KADR buyrug'ida "Rahbariyatga yuborish" KADRга ham ochiq.
  const perms = decreePermissions(order, employeeId, user);
  const submitLabel = decreeSubmitTarget(order) === 'submitter'
    ? t('orders.actionSubmitToSubmitter')
    : t('orders.actionSubmitToApprovers');

  // Assigning familiarizers mirrors the web gate (OrderDetailModal): HR while the
  // decree is `confirmed`, or a site master-admin (strict `type === 'master-admin'`,
  // NOT ministr — the backend only grants this to the master-admin account, so
  // gating on isMasterAdmin would show ministr a button the backend rejects).
  const canAssignFamiliarizers =
    isSiteMasterAdmin(user) || (isHR(user) && order.status === 'confirmed');

  return renderRoot(
    <>
      <DetailHeader embedded={embedded} />

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

        {perms.canEdit && (
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/create-order', params: { id: String(orderId) } })}
            testID="decree-edit"
          >
            <Icon name="edit" size={16} color={colors.primary} />
            <Text style={styles.editBtnText}>{t('orders.editAction')}</Text>
          </TouchableOpacity>
        )}

        {canAssignFamiliarizers && (
          <TouchableOpacity
            style={styles.famBtn}
            activeOpacity={0.85}
            onPress={openFamPicker}
            disabled={assignFam.isPending}
          >
            {assignFam.isPending
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Icon name="users" size={16} color={colors.primary} />}
            <Text style={styles.famBtnText}>{t('orders.assignFamiliarizersTitle')}</Text>
          </TouchableOpacity>
        )}

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
        submitLabel={submitLabel}
        onSubmit={submit}
        onApprove={approve}
        onReject={() => setRejectOpen(true)}
        onResubmit={resubmit}
        onConfirmSubmission={confirmSubmission}
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
      <PickerModal
        visible={famOpen}
        title={t('orders.assignFamiliarizersTitle')}
        options={empOptions}
        loading={empsLoading}
        multiple
        selected={famIds}
        onClose={closeFamPicker}
        onSelect={() => {}}
        onToggle={toggleFam}
      />
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
    famBtn: { backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 13, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    famBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },

    bodyText: { fontSize: 14, color: c.text, lineHeight: 21 },

    rejectCard: { backgroundColor: c.errorSoft, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.error },
    rejectTitle: { fontSize: 13, fontWeight: '700', color: c.error, marginBottom: 4 },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primarySoft, borderRadius: 12, paddingVertical: 14, marginBottom: 12,
    },
    editBtnText: { color: c.primary, fontSize: 14, fontWeight: '700' },
    rejectText: { fontSize: 13, color: c.text, lineHeight: 19 },
  });
