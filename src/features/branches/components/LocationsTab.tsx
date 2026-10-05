// Manzillar tabi (v2 `LocationsTab`): filial ichidagi joylar — turniket aynan manzilga biriktiriladi.
// Ro'yxat (filial · manzil; bir so'rovda keladi, lekin 50 tadan chiziladi — «Yana ko'rsatish»), qator → varaq (tafsilot, tahrir, o'chirish — tasdiq bilan), yangi manzil.
// Server `require_system_admin`: AKT xodimi faqat o'z filiali manzillarini ko'radi va o'zgartiradi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Button, Card, EmptyState, ErrorState, ListRow, Sheet, Skeleton, Text } from '@/ui';
import { locationsQuery } from '../api/queries';
import { useDeleteLocation } from '../api/mutations';
import { locationBranchId, locationSubtitle, type LocationRow } from '../utils/branches';
import { KeyValue, useBranchNames } from './BranchesBits';
import { LocationFormSheet } from './LocationFormSheet';

type Open = { kind: 'view'; row: LocationRow; n: number } | { kind: 'form'; row: LocationRow | null; n: number } | null;

/** Bir martada chiziladigan manzillar soni — yuzlab qator ScrollView ichida birdan chizilmasin. */
export const LOCATIONS_STEP = 50;

export function LocationsTab() {
  const { t } = useTranslation();
  const list = useQuery(locationsQuery());
  const { nameOf } = useBranchNames();
  const [open, setOpen] = useState<Open>(null);
  const [limit, setLimit] = useState(LOCATIONS_STEP);

  const rows = list.data ?? [];
  // Ro'yxat qisqarsa (o'chirish) — `slice` o'zi chegaralaydi; tugma faqat yashiringan qator bo'lsa.
  const visible = rows.slice(0, limit);
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={220} />;
    if (!rows.length)
      return <EmptyState title={t('branches.locationsEmpty')} message={t('branches.locationsEmptyHint')} />;
    return (
      <>
        {visible.map((l) => (
          <ListRow
            key={l.id}
            testID={`location-row-${l.id}`}
            title={l.name || `#${l.id}`}
            subtitle={locationSubtitle(l, nameOf)}
            chevron
            onPress={() => setOpen({ kind: 'view', row: l, n: Date.now() })}
          />
        ))}
        {rows.length > visible.length && (
          <Button
            testID="locations-more"
            label={`${t('branches.showMore')} (${rows.length - visible.length})`}
            variant="link"
            size="sm"
            onPress={() => setLimit((n) => n + LOCATIONS_STEP)}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Text variant="caption" tone="subtle" style={styles.flex}>
          {t('branches.locationsHint')}
        </Text>
        <Button
          testID="location-new"
          label={t('branches.addLocation')}
          icon="plus"
          size="sm"
          onPress={() => setOpen({ kind: 'form', row: null, n: Date.now() })}
        />
      </View>
      <Card>{renderRows()}</Card>
      {open?.kind === 'view' && (
        <LocationSheet
          key={open.n}
          row={open.row}
          branch={locationBranchId(open.row) != null ? nameOf(locationBranchId(open.row)!) : null}
          onEdit={() => setOpen({ kind: 'form', row: open.row, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'form' && <LocationFormSheet key={open.n} row={open.row} onClose={() => setOpen(null)} />}
    </View>
  );
}

function LocationSheet({
  row,
  branch,
  onEdit,
  onClose,
}: {
  row: LocationRow;
  branch: string | null;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteLocation();
  const name = row.name || `#${row.id}`;
  const coords = row.latitude != null && row.longitude != null ? `${row.latitude}, ${row.longitude}` : null;

  const del = async () => {
    const ok = await confirm({
      title: t('branches.removeLocationTitle'),
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
      toast.error(getApiErrorMessage(e, t('branches.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <KeyValue label={t('branches.fieldBranch')} value={branch} testID="location-branch" />
        <KeyValue label={t('branches.fieldAddress')} value={row.address} />
        <KeyValue label={t('branches.coordinates')} value={coords} />
        <Button testID="location-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
        <Button
          testID="location-delete"
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
});
