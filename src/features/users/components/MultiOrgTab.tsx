// ROL VAKILLARI (v2 `MultiOrgTab`): filiallar bo'ylab rol egalari — kim qaysi filialda kadr, qaysi
// o'rinbosar qaysi stansiyalarni qamraydi. Mobil'da ko'rish: rol, KPI administratori, biriktirilgan
// filiallar, yaratilgan sana. Rol vakilini qo'shish/tahrirlash/arxivlash xodim kartochkasining to'liq
// formasi orqali — web'da.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useBreakpoint } from '@/utils/responsive';
import { formatTashkentDate } from '@/utils/tashkentTime';
import { Avatar, Badge, Card, EmptyState, ErrorState, ListRow, Pager, SearchField, Sheet, Skeleton, Text } from '@/ui';
import { multiOrgQuery } from '../api/queries';
import { multiOrgBranchNames, primaryMultiOrgRole, type MultiOrgRow } from '../utils/users';
import { KeyValue, useBranchName } from './UsersBits';

function RoleBadges({ row }: { row: MultiOrgRow }) {
  const { t } = useTranslation();
  const role = primaryMultiOrgRole(row);
  return (
    <View style={styles.badges}>
      {role ? (
        <Badge
          testID={`multiorg-role-${row.id}`}
          label={t(`users.role_${role}`, { defaultValue: role })}
          tone="brand"
        />
      ) : null}
      {!!row.is_kpi_admin && <Badge label={t('users.kpiAdmin')} tone="neutral" />}
    </View>
  );
}

export function MultiOrgTab({ branchId }: { branchId: number | null }) {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  // Sahifa filial o'zgarsa 1 ga qaytadi (qidiruv saqlanadi).
  const [pg, setPg] = useState({ page: 1, branchId });
  const page = pg.branchId === branchId ? pg.page : 1;
  const setPage = (p: number) => setPg({ page: p, branchId });
  const [viewing, setViewing] = useState<{ row: MultiOrgRow; n: number } | null>(null);
  const list = useQuery(multiOrgQuery({ search: debounced, page, branchId }));
  const { nameOf } = useBranchName();

  const rows = list.data?.items ?? [];
  const summary = (r: MultiOrgRow) => {
    const names = multiOrgBranchNames(r, nameOf);
    if (!names.length) return r.email || '—';
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
  };

  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={240} />;
    if (!rows.length) {
      return debounced.trim() ? (
        <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
      ) : (
        <EmptyState title={t('users.emptyMultiOrg')} />
      );
    }
    return rows.map((r) => (
      <ListRow
        key={r.id}
        testID={`multiorg-row-${r.id}`}
        left={<Avatar name={r.legal_name || '?'} uri={r.photo_thumb_path} size={36} />}
        title={r.legal_name || '—'}
        subtitle={summary(r)}
        below={compact ? <RoleBadges row={r} /> : undefined}
        right={compact ? undefined : <RoleBadges row={r} />}
        onPress={() => setViewing({ row: r, n: Date.now() })}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <SearchField
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder={t('users.searchMultiOrg')}
      />
      <Card>
        {!!list.data && (
          <Text variant="caption" tone="subtle" style={styles.total}>
            {t('users.total', { count: list.data.total })}
          </Text>
        )}
        {renderRows()}
        <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
      </Card>
      <Text variant="caption" tone="subtle">
        {t('users.multiOrgWebOnly')}
      </Text>
      {viewing && (
        <Sheet key={viewing.n} visible onClose={() => setViewing(null)} title={viewing.row.legal_name || '—'}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            <RoleBadges row={viewing.row} />
            <KeyValue label={t('users.colEmail')} value={viewing.row.email} />
            <KeyValue
              label={t('users.colAssignedBranches')}
              value={multiOrgBranchNames(viewing.row, nameOf).join(', ')}
              testID="multiorg-branches"
            />
            <KeyValue
              label={t('users.colCreated')}
              value={viewing.row.created_at ? formatTashkentDate(viewing.row.created_at) : null}
            />
          </ScrollView>
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  total: { marginBottom: 4 },
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
});
