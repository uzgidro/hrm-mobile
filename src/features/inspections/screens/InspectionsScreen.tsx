// v3 Auditlar — web v2 `InspectionsPage` porti: xodim, bo'lim yoki jarayon
// bo'yicha ichki tekshiruvlar; holat/obyekt filtri, qidiruv, tafsilot (topilmalar,
// boshlash/yakunlash/bekor, topilma qo'shish va tuzatish). Huquqlar server qatoridan.
// Auditorlarni tanlash va o'chirish — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Fab,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Skeleton,
} from '@/ui';
import { inspectionsQuery } from '../api/queries';
import { InspectionDetailSheet, STATUS_TONE } from '../components/InspectionDetailSheet';
import { InspectionFormSheet } from '../components/InspectionFormSheet';
import { INSPECTION_OBJECTS, INSPECTION_STATUSES, canCreateInspection } from '../utils/inspections';

export default function InspectionsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [objectType, setObjectType] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const [creating, setCreating] = useState<number | null>(null);
  const list = useQuery(inspectionsQuery({ search: debounced, status, objectType, page }));
  const canCreate = canCreateInspection(user, list.data?.items ?? []);
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
        <PageHeader title={t('inspections.title')} subtitle={t('inspections.subtitle')} />
        <View style={styles.filters}>
          <SearchField
            value={search}
            onChangeText={(v) => reset(() => setSearch(v))}
            placeholder={t('inspections.searchPlaceholder')}
          />
          <View style={styles.chips}>
            {INSPECTION_STATUSES.map((s) => (
              <Chip
                key={s}
                testID={`inspection-status-${s}`}
                label={t(`inspections.status_${s}`)}
                selected={status === s}
                onPress={() => reset(() => setStatus(status === s ? '' : s))}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {INSPECTION_OBJECTS.map((o) => (
              <Chip
                key={o}
                testID={`inspection-object-${o}`}
                label={t(`inspections.object_${o}`)}
                selected={objectType === o}
                onPress={() => reset(() => setObjectType(objectType === o ? '' : o))}
              />
            ))}
          </View>
        </View>
        <Card>
          {list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={220} />
          ) : (list.data?.items.length ?? 0) === 0 ? (
            <EmptyState title={t('inspections.empty')} message={canCreate ? t('inspections.emptyHint') : undefined} />
          ) : (
            list.data!.items.map((r) => (
              <ListRow
                key={r.id}
                testID={`inspection-${r.id}`}
                title={r.title}
                subtitle={[t(`inspections.object_${r.object_type}`, { defaultValue: r.object_type }), r.object_label]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <View style={styles.right}>
                    <Badge
                      label={t(`inspections.status_${r.status}`, { defaultValue: r.status })}
                      tone={STATUS_TONE[r.status] ?? 'neutral'}
                    />
                    {!!r.findings_open && (
                      <Badge label={t('inspections.openFindings', { count: r.findings_open })} tone="warning" />
                    )}
                  </View>
                }
                onPress={() => setViewing(r.id)}
              />
            ))
          )}
          <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
        </Card>
        <View style={styles.fabSpace} />
      </Screen>
      {canCreate && (
        <Fab
          testID="inspection-add"
          accessibilityLabel={t('inspections.add')}
          onPress={() => setCreating(Date.now())}
        />
      )}
      {viewing !== null && <InspectionDetailSheet key={viewing} id={viewing} onClose={() => setViewing(null)} />}
      {canCreate && creating !== null && (
        <InspectionFormSheet
          key={creating}
          branchId={resolveEmployeeBranchId(user?.employee)}
          onClose={() => setCreating(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  right: { alignItems: 'flex-end', gap: 4 },
  fabSpace: { height: 72 },
});
