// v3 Malaka oshirish — web v2 `TrainingsPage` porti: kurs, attestatsiya, razryad
// va unvon yozuvlari reyestri; muddati yaqinlashgani rang bilan ajratiladi.
// Ko'rish hammaga; yozish — kadr, bosh admin va ministr (v2 canWrite). Guruh bilan
// ro'yxatga olish — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canWriteTrainings } from '@/utils/roles';
import { useBreakpoint } from '@/utils/responsive';
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
  StatTile,
} from '@/ui';
import { trainingSummaryQuery, trainingsQuery, type Training } from '../api/queries';
import { ExpiryBadge, STATUS_TONE, TrainingDetailSheet } from '../components/TrainingDetailSheet';
import { TrainingFormSheet } from '../components/TrainingFormSheet';
import { TRAINING_STATUSES, TRAINING_TYPES } from '../utils/trainings';

export default function TrainingsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canWrite = canWriteTrainings(user);
  const { sizeClass } = useBreakpoint();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Training | null>(null);
  const [editing, setEditing] = useState<{ row: Training | null; n: number } | null>(null);
  const list = useQuery(trainingsQuery({ search: debounced, type, status, expiringOnly, page }));
  const summary = useQuery(trainingSummaryQuery());
  const s = summary.data;
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const basis = sizeClass === 'compact' ? '47%' : '23%';

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}>
        <PageHeader title={t('trainings.title')} subtitle={t('trainings.subtitle')} />
        {/* Xulosa xato bersa — plitkalar chizilmaydi («0» lar emas). */}
        {!!s && (
          <View style={styles.tiles}>
            {(
              [
                { id: 'total', label: t('trainings.statTotal'), value: s.total, icon: 'graduation', tint: 'violet' },
                { id: 'hours', label: t('trainings.statHours'), value: s.total_hours, icon: 'clock', tint: 'drop' },
                {
                  id: 'cost',
                  label: t('trainings.statCost'),
                  value: s.total_cost.toLocaleString('ru-RU'),
                  icon: 'wallet',
                  tint: 'green',
                },
                {
                  id: 'expiring',
                  label: t('trainings.statExpiring'),
                  value: s.expiring_soon,
                  icon: 'bell',
                  tint: s.expiring_soon ? 'amber' : 'grey',
                },
              ] as const
            ).map((x) => (
              <View key={x.id} style={{ flexBasis: basis, flexGrow: 1 }}>
                <StatTile
                  testID={`training-stat-${x.id}`}
                  label={x.label}
                  value={x.value}
                  icon={x.icon}
                  tint={x.tint}
                />
              </View>
            ))}
          </View>
        )}
        <View style={styles.filters}>
          <SearchField
            value={search}
            onChangeText={(v) => reset(() => setSearch(v))}
            placeholder={t('trainings.searchPlaceholder')}
          />
          <View style={styles.chips}>
            <Chip
              testID="training-expiring"
              label={t('trainings.expiringOnly')}
              tone="warning"
              selected={expiringOnly}
              onPress={() => reset(() => setExpiringOnly((v) => !v))}
            />
            {TRAINING_STATUSES.map((x) => (
              <Chip
                key={x}
                label={t(`trainings.status_${x}`)}
                selected={status === x}
                onPress={() => reset(() => setStatus(status === x ? '' : x))}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {TRAINING_TYPES.map((x) => (
              <Chip
                key={x}
                testID={`training-type-${x}`}
                label={t(`trainings.type_${x}`)}
                selected={type === x}
                onPress={() => reset(() => setType(type === x ? '' : x))}
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
            <EmptyState title={t('trainings.empty')} message={canWrite ? t('trainings.emptyHint') : undefined} />
          ) : (
            list.data!.items.map((r) => (
              <ListRow
                key={r.id}
                testID={`training-${r.id}`}
                title={r.program_name}
                subtitle={[r.employee_name, t(`trainings.type_${r.training_type}`, { defaultValue: r.training_type })]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <View style={styles.right}>
                    <Badge
                      label={t(`trainings.status_${r.status}`, { defaultValue: r.status })}
                      tone={STATUS_TONE[r.status] ?? 'neutral'}
                    />
                    <ExpiryBadge expires={r.certificate_expires_at} />
                  </View>
                }
                onPress={() => setViewing(r)}
              />
            ))
          )}
          <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
        </Card>
        <View style={styles.fabSpace} />
      </Screen>
      {canWrite && (
        <Fab
          testID="training-add"
          accessibilityLabel={t('trainings.add')}
          onPress={() => setEditing({ row: null, n: Date.now() })}
        />
      )}
      {viewing && (
        <TrainingDetailSheet
          key={viewing.id}
          training={viewing}
          canWrite={canWrite}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ row: viewing, n: Date.now() });
            setViewing(null);
          }}
        />
      )}
      {canWrite && editing && (
        <TrainingFormSheet key={editing.n} training={editing.row} onClose={() => setEditing(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  right: { alignItems: 'flex-end', gap: 4 },
  fabSpace: { height: 72 },
});
