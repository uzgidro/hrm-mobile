// Administrator hisoblari (v2 `AdminsTab`): kartochkasiz, filialga biriktirilgan texnik hisoblar.
// Qator → varaq: tahrirlash, parol yuborish (server bir martalik parolni POCHTAGA jo'natadi —
// mobil hech qanday parol ko'rmaydi), o'chirish (tasdiq bilan). Yangi administrator — forma.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Avatar, Button, Card, EmptyState, ErrorState, ListRow, Sheet, Skeleton, Text } from '@/ui';
import { adminsQuery } from '../api/queries';
import { useDeleteAdmin, useSendAdminPassword } from '../api/mutations';
import { isForbidden, type AdminRow } from '../utils/users';
import { AdminFormSheet } from './AdminFormSheet';
import { Denied, KeyValue, useBranchName } from './UsersBits';

type Open = { kind: 'view'; row: AdminRow; n: number } | { kind: 'form'; row: AdminRow | null; n: number } | null;

export function AdminsTab() {
  const { t } = useTranslation();
  const list = useQuery(adminsQuery());
  const { nameOf } = useBranchName();
  const [open, setOpen] = useState<Open>(null);

  if (list.isError && !list.data && isForbidden(list.error)) {
    return <Denied hint={t('users.noAccessHint')} />;
  }

  const branchLabel = (id?: number | null) => (id ? nameOf(id) : t('users.allBranches'));
  const rows = list.data ?? [];
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={200} />;
    if (!rows.length) return <EmptyState title={t('users.emptyAdmins')} />;
    return rows.map((r) => (
      <ListRow
        key={r.id}
        testID={`admin-row-${r.id}`}
        left={<Avatar name={r.email || '?'} uri={r.photo_path} thumb={r.photo_thumb_path} size={36} />}
        title={r.email || '—'}
        subtitle={branchLabel(r.organization_branch_id)}
        onPress={() => setOpen({ kind: 'view', row: r, n: Date.now() })}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Text variant="caption" tone="subtle" style={styles.flex}>
          {t('users.adminsHint')}
        </Text>
        <Button
          testID="admin-new"
          label={t('users.newAdmin')}
          icon="plus"
          size="sm"
          onPress={() => setOpen({ kind: 'form', row: null, n: Date.now() })}
        />
      </View>
      <Card>{renderRows()}</Card>
      {open?.kind === 'view' && (
        <AdminSheet
          key={open.n}
          row={open.row}
          branch={branchLabel(open.row.organization_branch_id)}
          onEdit={() => setOpen({ kind: 'form', row: open.row, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'form' && <AdminFormSheet key={open.n} row={open.row} onClose={() => setOpen(null)} />}
    </View>
  );
}

function AdminSheet({
  row,
  branch,
  onEdit,
  onClose,
}: {
  row: AdminRow;
  branch: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const send = useSendAdminPassword();
  const remove = useDeleteAdmin();
  const email = row.email || '—';

  const sendPassword = async () => {
    const ok = await confirm({
      title: t('users.sendPassword'),
      message: email,
      confirmLabel: t('users.sendPassword'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await send.mutateAsync(row.id);
      toast.success(t('users.passwordSent'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  const del = async () => {
    const ok = await confirm({
      title: t('users.deleteAdminTitle'),
      message: email,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('users.adminDeleted'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={email}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <Avatar name={email} uri={row.photo_path} thumb={row.photo_thumb_path} size={48} />
        </View>
        <KeyValue label={t('users.colAdmin')} value={row.email} />
        <KeyValue label={t('users.colBranch')} value={branch} />
        <Button testID="admin-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
        <Button
          testID="admin-send-password"
          label={t('users.sendPassword')}
          icon="mail"
          variant="soft"
          onPress={() => void sendPassword()}
          loading={send.isPending}
          full
        />
        <Button
          testID="admin-delete"
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
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
});
