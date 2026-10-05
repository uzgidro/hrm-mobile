// v3 Buyruq turlari — web v2 `OrderTypesPage` porti: qidiruv, oqim filtri
// (xodim / kadr), ro'yxat. Yozish (qo'shish/tahrir/o'chirish) faqat
// `canManageOrderTypes` (v2 canManage) bo'lsa.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canManageOrderTypes } from '@/utils/roles';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { FormInput } from '@/components/FormInput';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  ListRow,
  Screen,
  SearchField,
  Segmented,
  Sheet,
  Skeleton,
  Text,
} from '@/ui';
import { orderTypesQuery, validateOrderType, type OrderType } from '../api/queries';
import { useDeleteOrderType, useSaveOrderType } from '../api/mutations';

type Flow = '' | 'employee' | 'hr';

function OrderTypeSheet({ row, onClose }: { row: OrderType | null | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const visible = row !== undefined;
  const [name, setName] = useState('');
  const [flow, setFlow] = useState<Flow>('');
  const [error, setError] = useState<string | null>(null);
  const save = useSaveOrderType();
  const remove = useDeleteOrderType();

  useEffect(() => {
    if (visible) {
      setName(row?.name ?? '');
      setFlow((row?.creator_role as Flow) ?? '');
      setError(null);
    }
  }, [visible, row]);

  const submit = async () => {
    const err = validateOrderType(name, flow);
    if (err) return setError(t(`orderTypes.${err}`));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: { name: name.trim(), creator_role: flow } });
      toast.success(t(row ? 'orderTypes.updated' : 'orderTypes.created'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  // Ilova ichidagi tasdiq (`confirm`) — OS `Alert` web'da hech narsa ko'rsatmasdi.
  const confirmDelete = async () => {
    if (!row) return;
    const ok = await confirm({
      title: t('orderTypes.remove'),
      message: t('orderTypes.removeConfirm', { name: row.name ?? '' }),
      confirmLabel: t('orderTypes.remove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('orderTypes.removed'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={row ? t('orderTypes.editTitle') : t('orderTypes.createTitle')}>
      <View style={styles.form}>
        <FormInput
          label={t('orderTypes.fieldName')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          required
        />
        <Text variant="label" tone="muted">
          {t('orderTypes.fieldFlow')}
        </Text>
        <Segmented<Flow>
          options={[
            { value: 'employee', label: t('orderTypes.flowEmployee') },
            { value: 'hr', label: t('orderTypes.flowHr') },
          ]}
          value={flow}
          onChange={(v) => {
            setFlow(v);
            setError(null);
          }}
        />
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="order-type-save"
          label={t('common.save')}
          onPress={submit}
          loading={save.isPending}
          full
          size="lg"
        />
        {row && (
          <Button
            testID="order-type-delete"
            label={t('orderTypes.remove')}
            variant="ghost"
            onPress={() => void confirmDelete()}
            full
          />
        )}
      </View>
    </Sheet>
  );
}

export default function OrderTypesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canWrite = canManageOrderTypes(user);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [flow, setFlow] = useState<Flow>('');
  const [editing, setEditing] = useState<OrderType | null | undefined>(undefined);
  const q = useQuery(orderTypesQuery({ search: debounced, creatorRole: flow }));
  const rows = q.data ?? [];

  return (
    <View style={styles.root}>
      <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
        <View style={styles.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header" style={styles.flex}>
            {t('orderTypes.title')}
          </Text>
        </View>
        <View style={styles.filters}>
          <SearchField value={search} onChangeText={setSearch} placeholder={t('orderTypes.searchPlaceholder')} />
          <Segmented<Flow>
            options={[
              { value: '', label: t('orderTypes.allFlows') },
              { value: 'employee', label: t('orderTypes.flowEmployee') },
              { value: 'hr', label: t('orderTypes.flowHr') },
            ]}
            value={flow}
            onChange={setFlow}
          />
        </View>
        <Card>
          {q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : q.isPending ? (
            <Skeleton height={180} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('orderTypes.empty')} message={t('orderTypes.emptyHint')} />
          ) : (
            rows.map((r) => (
              <ListRow
                key={r.id}
                testID={`order-type-${r.id}`}
                title={r.name ?? '—'}
                right={
                  <Badge
                    label={r.creator_role === 'hr' ? t('orderTypes.flowHr') : t('orderTypes.flowEmployee')}
                    tone={r.creator_role === 'hr' ? 'brand' : 'neutral'}
                  />
                }
                onPress={canWrite ? () => setEditing(r) : undefined}
              />
            ))
          )}
        </Card>
        {/* FAB oxirgi qatorni yopmasin. */}
        <View style={{ height: 72 }} />
      </Screen>
      {canWrite && (
        <Fab testID="order-type-add" accessibilityLabel={t('orderTypes.create')} onPress={() => setEditing(null)} />
      )}
      {canWrite && editing !== undefined && (
        <OrderTypeSheet key={editing?.id ?? 'new'} row={editing} onClose={() => setEditing(undefined)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 8 },
  flex: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  form: { gap: 12, paddingBottom: 8 },
});
