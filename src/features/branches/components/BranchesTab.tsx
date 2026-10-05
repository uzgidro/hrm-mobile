// Filiallar tabi (v2 `BranchesTab`): nom bo'yicha qidiruv (mijozda), son, qator → varaq (tafsilot,
// «Hik'ga yuborish», tahrir, o'chirish). Filial QO'SHISH va O'CHIRISH — faqat sayt master-admini va admin
// hisobi (`canManageBranches`, server `require_roles`); AKT xodimiga bu tugmalar chizilmaydi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Card, EmptyState, ErrorState, ListRow, SearchField, Sheet, Skeleton, Text } from '@/ui';
import { branchesQuery } from '../api/queries';
import { useDeleteBranch, useSyncBranchToHik } from '../api/mutations';
import {
  branchName,
  branchRegions,
  branchSubtitle,
  canManageBranches,
  filterBranches,
  isSyncQueued,
  type BranchRow,
} from '../utils/branches';
import { BranchFormSheet } from './BranchFormSheet';
import { KeyValue, branchActionError } from './BranchesBits';

type Open = { kind: 'view'; row: BranchRow; n: number } | { kind: 'form'; row: BranchRow | null; n: number } | null;

export function BranchesTab({
  queuedAt,
  onQueued,
}: {
  /** Navbatga qo'yilgan vaqt (id → ms) — ekranda saqlanadi: «Manzillar» tabiga o'tib qaytilsa ham yo'qolmaydi. */
  queuedAt: Record<number, number>;
  onQueued: (id: number) => void;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canManage = canManageBranches(user);
  const list = useQuery(branchesQuery());
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Open>(null);

  const rows = filterBranches(list.data ?? [], search);
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={260} />;
    if (!rows.length) {
      return search.trim() ? (
        <EmptyState
          title={t('common.noMatch')}
          message={t('common.noMatchHint')}
          action={{ label: t('common.clearFilters'), onPress: () => setSearch('') }}
        />
      ) : (
        <EmptyState title={t('branches.empty')} />
      );
    }
    return rows.map((b) => (
      <ListRow
        key={b.id}
        testID={`branch-row-${b.id}`}
        title={branchName(b)}
        subtitle={branchSubtitle(b)}
        chevron
        onPress={() => setOpen({ kind: 'view', row: b, n: Date.now() })}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <SearchField value={search} onChangeText={setSearch} placeholder={t('branches.searchPlaceholder')} />
      <View style={styles.bar}>
        <Text variant="caption" tone="subtle" style={styles.flex} testID="branches-count">
          {list.data ? t('branches.count', { count: rows.length }) : ''}
        </Text>
        {canManage && (
          <Button
            testID="branch-new"
            label={t('branches.add')}
            icon="plus"
            size="sm"
            onPress={() => setOpen({ kind: 'form', row: null, n: Date.now() })}
          />
        )}
      </View>
      <Card>{renderRows()}</Card>
      {open?.kind === 'view' && (
        <BranchSheet
          key={open.n}
          row={open.row}
          canManage={canManage}
          // `n` — varaq ochilgan payt (render ichida Date.now() chaqirilmaydi).
          queued={isSyncQueued(queuedAt, open.row.id, open.n)}
          onQueued={() => onQueued(open.row.id)}
          onEdit={() => setOpen({ kind: 'form', row: open.row, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'form' && (
        <BranchFormSheet key={open.n} row={open.row} branches={list.data ?? []} onClose={() => setOpen(null)} />
      )}
    </View>
  );
}

function BranchSheet({
  row,
  canManage,
  queued,
  onQueued,
  onEdit,
  onClose,
}: {
  row: BranchRow;
  canManage: boolean;
  queued: boolean;
  onQueued: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sync = useSyncBranchToHik();
  const remove = useDeleteBranch();
  const name = branchName(row);
  const coords = row.latitude != null && row.longitude != null ? `${row.latitude}, ${row.longitude}` : null;

  // Filialning barcha xodimlarini uning turniketlariga qayta yuboradi — tasdiq bilan (v2).
  const runSync = async () => {
    const ok = await confirm({
      title: t('branches.sync'),
      message: name,
      confirmLabel: t('branches.sync'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await sync.mutateAsync(row.id);
      onQueued();
      toast.success(t('branches.syncQueued'));
    } catch (e) {
      toast.error(branchActionError(e, t));
    }
  };

  const del = async () => {
    const ok = await confirm({
      title: t('branches.removeTitle'),
      message: t('branches.removeConfirm', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('branches.deleted'));
      onClose();
    } catch (e) {
      toast.error(branchActionError(e, t));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {(row.is_head_office || row.is_medical_center) && (
          <View style={styles.badges}>
            {!!row.is_head_office && <Badge label={t('branches.isHeadOffice')} tone="brand" />}
            {!!row.is_medical_center && <Badge label={t('branches.isMedicalCenter')} tone="info" />}
          </View>
        )}
        <KeyValue label={t('branches.fieldRegions')} value={branchRegions(row).join(', ')} testID="branch-regions" />
        <KeyValue label={t('branches.fieldAddress')} value={row.address} />
        <KeyValue label={t('branches.coordinates')} value={coords} />
        <KeyValue label={t('branches.terminalGroup')} value={row.terminal_group} />
        <KeyValue label={t('branches.departments')} value={String(row.department_count ?? 0)} />
        <KeyValue label={t('branches.employees')} value={String(row.employee_count ?? 0)} />
        <KeyValue label={t('branches.turnstiles')} value={String(row.turnstile_count ?? 0)} />
        <Button testID="branch-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
        <Button
          testID="branch-sync"
          label={t('branches.sync')}
          icon="refresh"
          variant="soft"
          onPress={() => void runSync()}
          loading={sync.isPending}
          disabled={queued}
          full
        />
        {queued && (
          <Text variant="caption" tone="subtle" testID="branch-sync-queued">
            {t('branches.syncQueued')}
          </Text>
        )}
        {canManage && (
          <Button
            testID="branch-delete"
            label={t('common.delete')}
            icon="trash"
            variant="dangerGhost"
            onPress={() => void del()}
            loading={remove.isPending}
            full
          />
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 120 },
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
