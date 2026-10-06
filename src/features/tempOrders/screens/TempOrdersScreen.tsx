// v3 Vaqtinchalik buyruqlar — web v2 `TempOrdersPage` porti. Faqat kadr / master
// admin (v2 RequireRole). Oy bo'yicha guruhlangan ro'yxat, qidiruv, tur filtri,
// sahifalash; qatorni bosish — tahrir/o'chirish, FAB — yangi buyruq.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { isHR, isMasterAdmin } from '@/utils/roles';
import { monthName } from '@/i18n/dates';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PickerModal } from '@/components/PickerModal';
import {
  Avatar,
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
  SelectField,
  Skeleton,
  Text,
} from '@/ui';
import { tempOrdersQuery, type TempOrder } from '../api/queries';
import { TEMP_ORDER_TYPES, tempOrderRange } from '../utils/tempOrder';
import { TempOrderSheet } from '../components/TempOrderSheet';

export default function TempOrdersScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = isHR(user) || isMasterAdmin(user);
  const branchId = resolveEmployeeBranchId(user?.employee) ?? undefined;

  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [type, setType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [typePicker, setTypePicker] = useState(false);
  const [editing, setEditing] = useState<TempOrder | null | undefined>(undefined); // undefined — yopiq

  const q = useQuery({ ...tempOrdersQuery({ search: debounced, type, page, branchId }), enabled: allowed });
  const rows = useMemo(() => q.data?.items ?? [], [q.data]);
  const pages = q.data?.pages ?? 1;

  const header = (
    <View style={styles.header}>
      <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <Text variant="title" accessibilityRole="header" style={styles.flex}>
        {t('tempOrders.title')}
      </Text>
    </View>
  );

  if (!allowed) {
    return (
      <Screen scroll={false}>
        {header}
        <EmptyState title={t('tempOrders.noAccess')} pose="sad" />
      </Screen>
    );
  }

  const typeOptions = TEMP_ORDER_TYPES.map((code, i) => ({ value: i, label: t(`tempOrders.type_${code}`) }));

  return (
    <View style={styles.root}>
      <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
        {header}
        <View style={styles.filters}>
          <SearchField
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={t('tempOrders.searchPlaceholder')}
          />
          <SelectField
            label={t('tempOrders.type')}
            value={type ? t(`tempOrders.type_${type}`) : t('tempOrders.allTypes')}
            onPress={() => setTypePicker(true)}
          />
        </View>
        <Card padded>
          {q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : q.isPending ? (
            <Skeleton height={200} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('tempOrders.empty')} message={t('tempOrders.emptyHint')} />
          ) : (
            rows.map((r, i) => {
              const month = r.start_date ? dayjs(r.start_date).format('YYYY-MM') : '';
              const prevMonth = i > 0 && rows[i - 1].start_date ? dayjs(rows[i - 1].start_date!).format('YYYY-MM') : '';
              // Ochiq muddat (server 2099-12-31) — faqat boshlanish, kunlar soni yo'q.
              const range = tempOrderRange(r);
              const name = r.employee?.legal_name ?? '—';
              return (
                <View key={r.id}>
                  {month && month !== prevMonth && (
                    <Text variant="caption" tone="subtle" style={styles.month}>
                      {`${monthName(dayjs(r.start_date!).month())} ${dayjs(r.start_date!).year()}`}
                    </Text>
                  )}
                  <ListRow
                    testID={`temp-order-${r.id}`}
                    title={name}
                    subtitle={
                      range.days
                        ? `${range.text} · ${t('tempOrders.daysCount', { count: range.days })}`
                        : range.open
                          ? `${range.text} – ${t('tempOrders.openEnded')}`
                          : range.text
                    }
                    left={<Avatar name={name} uri={r.employee?.photo_path} thumb={r.employee?.photo_thumb_path} size={36} />}
                    right={
                      <Badge
                        label={r.type ? t(`tempOrders.type_${r.type}`, { defaultValue: r.type }) : '—'}
                        tone="brand"
                      />
                    }
                    onPress={() => setEditing(r)}
                  />
                </View>
              );
            })
          )}
          {pages > 1 && (
            <View style={styles.pager}>
              <Button label="‹" variant="soft" size="sm" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
              <Text variant="label" tone="muted">{`${page} / ${pages}`}</Text>
              <Button
                label="›"
                variant="soft"
                size="sm"
                disabled={page >= pages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          )}
        </Card>
        {/* FAB oxirgi qatorni yopmasin. */}
        <View style={{ height: 72 }} />
      </Screen>

      <Fab testID="temp-order-add" accessibilityLabel={t('tempOrders.add')} onPress={() => setEditing(null)} />

      <PickerModal
        visible={typePicker}
        title={t('tempOrders.type')}
        avatars={false}
        options={[{ value: -1, label: t('tempOrders.allTypes') }, ...typeOptions]}
        selected={type ? TEMP_ORDER_TYPES.indexOf(type as (typeof TEMP_ORDER_TYPES)[number]) : -1}
        onClose={() => setTypePicker(false)}
        onSelect={(i) => {
          setType(i < 0 ? null : TEMP_ORDER_TYPES[i]);
          setPage(1);
          setTypePicker(false);
        }}
      />
      {editing !== undefined && (
        <TempOrderSheet
          key={editing?.id ?? 'new'}
          visible
          row={editing}
          branchId={branchId}
          onClose={() => setEditing(undefined)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 8 },
  flex: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  month: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 2 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 },
});
