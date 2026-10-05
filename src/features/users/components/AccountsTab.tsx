// Xodim hisoblari (v2 `AccountsTab`): server qidiruvi + sahifalash, hisob holati nishoni; qator →
// varaq: faollashtirish / faolsizlantirish (tasdiq bilan). Faolsizlantirish O'CHIRISH EMAS —
// kartochka va tarix qoladi, kirish va jonli seanslar to'xtaydi. Ommaviy amallar — web'da.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useBreakpoint } from '@/utils/responsive';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  Pager,
  SearchField,
  Sheet,
  Skeleton,
  Text,
  type Tone,
} from '@/ui';
import { accountsQuery } from '../api/queries';
import { useSetEmployeeActive } from '../api/mutations';
import { accountState, type AccountState, type EmployeeAccountRow } from '../utils/users';
import { Denied, KeyValue } from './UsersBits';

const STATE_TONE: Record<AccountState, Tone> = { none: 'neutral', active: 'success', inactive: 'danger' };
const STATE_KEY: Record<AccountState, string> = { none: 'noAccount', active: 'active', inactive: 'inactive' };

function StateBadge({ row }: { row: EmployeeAccountRow }) {
  const { t } = useTranslation();
  const s = accountState(row);
  return <Badge testID={`account-state-${row.id}`} label={t(`users.${STATE_KEY[s]}`)} tone={STATE_TONE[s]} />;
}

export function AccountsTab({ branchId }: { branchId: number | null }) {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  // Sahifa filial o'zgarsa 1 ga qaytadi (qidiruv saqlanadi).
  const [pg, setPg] = useState({ page: 1, branchId });
  const page = pg.branchId === branchId ? pg.page : 1;
  const setPage = (p: number) => setPg({ page: p, branchId });
  const [viewing, setViewing] = useState<{ row: EmployeeAccountRow; n: number } | null>(null);
  const list = useQuery(accountsQuery({ search: debounced, page, branchId }));

  if (list.isError && !list.data && isAxiosError(list.error) && list.error.response?.status === 403) {
    return <Denied hint={t('users.noAccessHint')} />;
  }

  const rows = list.data?.items ?? [];
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={240} />;
    if (!rows.length) {
      return debounced.trim() ? (
        <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
      ) : (
        <EmptyState title={t('users.emptyAccounts')} />
      );
    }
    return rows.map((r) => {
      const place = [r.department?.name, r.job_position?.name].filter(Boolean).join(' · ');
      return (
        <ListRow
          key={r.id}
          testID={`account-row-${r.id}`}
          left={<Avatar name={r.legal_name || '?'} uri={r.photo_thumb_path} size={36} />}
          title={r.legal_name || '—'}
          subtitle={place || r.email || '—'}
          below={
            compact ? (
              <View style={styles.below}>
                <StateBadge row={r} />
              </View>
            ) : undefined
          }
          right={compact ? undefined : <StateBadge row={r} />}
          onPress={() => setViewing({ row: r, n: Date.now() })}
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      <SearchField
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={t('users.searchPlaceholder')}
      />
      <Card>
        {!!list.data && (
          <Text variant="caption" tone="subtle" style={styles.total} testID="accounts-total">
            {t('users.total', { count: list.data.total })}
          </Text>
        )}
        {renderRows()}
        <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
      </Card>
      <Text variant="caption" tone="subtle">
        {t('users.bulkWebOnly')}
      </Text>
      {viewing && <AccountSheet key={viewing.n} row={viewing.row} onClose={() => setViewing(null)} />}
    </View>
  );
}

function AccountSheet({ row, onClose }: { row: EmployeeAccountRow; onClose: () => void }) {
  const { t } = useTranslation();
  const mut = useSetEmployeeActive();
  const state = accountState(row);
  const name = row.legal_name || '—';

  const run = async (active: boolean) => {
    const ok = await confirm(
      active
        ? {
            title: t('users.activate'),
            message: name,
            confirmLabel: t('users.activate'),
            cancelLabel: t('common.cancel'),
          }
        : {
            title: t('users.deactivateTitle'),
            message: t('users.deactivateHint', { name }),
            confirmLabel: t('users.deactivate'),
            cancelLabel: t('common.cancel'),
            destructive: true,
          },
    );
    if (!ok) return;
    try {
      await mut.mutateAsync({ id: row.id, active });
      toast.success(t(active ? 'users.activated' : 'users.deactivated'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <Avatar name={name} uri={row.photo_thumb_path} size={48} />
          <StateBadge row={row} />
        </View>
        <KeyValue label={t('users.colEmail')} value={row.email} />
        <KeyValue label={t('users.colDepartment')} value={row.department?.name} />
        <KeyValue label={t('users.colPosition')} value={row.job_position?.name} />
        {state === 'active' && (
          <Button
            testID="account-deactivate"
            label={t('users.deactivate')}
            variant="dangerGhost"
            icon="close"
            onPress={() => void run(false)}
            loading={mut.isPending}
            full
          />
        )}
        {state === 'inactive' && (
          <Button
            testID="account-activate"
            label={t('users.activate')}
            icon="check"
            onPress={() => void run(true)}
            loading={mut.isPending}
            full
          />
        )}
        {state === 'none' && (
          <Text variant="caption" tone="subtle">
            {t('users.noAccountHint')}
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  below: { marginTop: 4 },
  total: { marginBottom: 4 },
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
});
