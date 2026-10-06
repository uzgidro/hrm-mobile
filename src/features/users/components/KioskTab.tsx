// Kiosk hisoblari (v2 `KioskUsersTab`): monitoring/turniket kiosklari va KPP postlari kiradigan loginlar.
// Qator → varaq: tahrirlash, parol xati (server parolni POCHTAGA yuboradi, javobda parol yo'q),
// o'chirish (tasdiq bilan). JShShIR ro'yxatda ko'rsatilmaydi — faqat tahrir formasida (v2).
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useBreakpoint } from '@/utils/responsive';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, ListRow, Sheet, Skeleton, Text } from '@/ui';
import { kioskUsersQuery } from '../api/queries';
import { useDeleteKiosk, useSendKioskPassword } from '../api/mutations';
import { isForbidden, kioskRoleKey, type KioskUser } from '../utils/users';
import { KioskFormSheet } from './KioskFormSheet';
import { Denied, KeyValue, useBranchName } from './UsersBits';

type Kiosk = KioskUser & { id: number };
type Open = { kind: 'view'; row: Kiosk; n: number } | { kind: 'form'; row: Kiosk | null; n: number } | null;

export function KioskTab({ branchId }: { branchId: number | null }) {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const list = useQuery(kioskUsersQuery(branchId));
  const { nameOf } = useBranchName();
  const [open, setOpen] = useState<Open>(null);

  // «Ruxsat yo'q» faqat 403 da (admin/master-admin darvozasi); boshqa xato — qayta urinish bilan.
  if (list.isError && !list.data && isForbidden(list.error)) return <Denied hint={t('users.kioskDeniedHint')} />;

  const branchesLabel = (r: KioskUser) =>
    r.organization_branch_ids?.length ? r.organization_branch_ids.map(nameOf).join(', ') : t('users.kioskAllBranches');
  const roleBadge = (r: KioskUser) => (
    <Badge testID={`kiosk-role-${r.id}`} label={t(`users.kioskRole_${kioskRoleKey(r.role)}`)} tone="neutral" />
  );
  const rows = (list.data ?? []) as Kiosk[];

  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={200} />;
    if (!rows.length) return <EmptyState title={t('users.kioskEmpty')} message={t('users.kioskEmptyHint')} />;
    return rows.map((r) => (
      <ListRow
        key={r.id}
        testID={`kiosk-row-${r.id}`}
        left={<Avatar name={r.legal_name || r.username || '?'} uri={r.photo_path} thumb={r.photo_thumb_path} size={36} />}
        title={r.legal_name || r.username || '—'}
        subtitle={[r.username, branchesLabel(r)].filter(Boolean).join(' · ')}
        below={compact ? <View style={styles.below}>{roleBadge(r)}</View> : undefined}
        right={compact ? undefined : roleBadge(r)}
        onPress={() => setOpen({ kind: 'view', row: r, n: Date.now() })}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Text variant="caption" tone="subtle" style={styles.flex}>
          {t('users.kioskHint')}
        </Text>
        <Button
          testID="kiosk-new"
          label={t('users.kioskAdd')}
          icon="plus"
          size="sm"
          onPress={() => setOpen({ kind: 'form', row: null, n: Date.now() })}
        />
      </View>
      <Card>{renderRows()}</Card>
      {open?.kind === 'view' && (
        <KioskSheet
          key={open.n}
          row={open.row}
          branches={branchesLabel(open.row)}
          onEdit={() => setOpen({ kind: 'form', row: open.row, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'form' && <KioskFormSheet key={open.n} row={open.row} onClose={() => setOpen(null)} />}
    </View>
  );
}

function KioskSheet({
  row,
  branches,
  onEdit,
  onClose,
}: {
  row: Kiosk;
  branches: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const send = useSendKioskPassword();
  const remove = useDeleteKiosk();
  const title = row.legal_name || row.username || '—';

  const sendPassword = async () => {
    const ok = await confirm({
      title: t('users.kioskSendPassword'),
      message: title,
      confirmLabel: t('users.kioskSendPassword'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await send.mutateAsync(row.id);
      toast.success(t('users.kioskPasswordSent'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  const del = async () => {
    const ok = await confirm({
      title: t('users.kioskDeleteTitle'),
      message: row.username ?? title,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('users.kioskDeleted'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={title}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <KeyValue label={t('users.kioskUsername')} value={row.username} />
        <KeyValue label={t('users.kioskName')} value={row.legal_name} />
        <KeyValue label={t('users.kioskRole')} value={t(`users.kioskRole_${kioskRoleKey(row.role)}`)} />
        <KeyValue label={t('users.kioskBranches')} value={branches} testID="kiosk-branches" />
        <Button testID="kiosk-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
        <Button
          testID="kiosk-send-password"
          label={t('users.kioskSendPassword')}
          icon="mail"
          variant="soft"
          onPress={() => void sendPassword()}
          loading={send.isPending}
          full
        />
        <Button
          testID="kiosk-delete"
          label={t('common.delete')}
          icon="trash"
          variant="dangerGhost"
          onPress={() => void del()}
          loading={remove.isPending}
          full
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 180 },
  below: { marginTop: 4 },
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
});
