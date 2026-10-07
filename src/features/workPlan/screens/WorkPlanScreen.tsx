// v3 Ish rejasi — web v2 `WorkPlanPage` porti: davriy rejalar, holat filtri
// (sonlar bilan, «muddati o'tgan» ham), qidiruv. Yozish (yaratish, bajarildi,
// tahrir, o'chirish) — `canWriteWorkPlan`. KPI ko'rsatkichi va ommaviy amallar — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canWriteWorkPlan } from '@/utils/roles';
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
import { workPlanSummaryQuery, workPlansQuery, type WorkPlan } from '../api/queries';
import { STATUS_TONE, WorkPlanDetailSheet } from '../components/WorkPlanDetailSheet';
import { WorkPlanFormSheet } from '../components/WorkPlanFormSheet';
import { FILTER_STATUSES, isPlanOverdue } from '../utils/workPlan';
import { useActiveBranchId } from '@/lib/useActiveBranch';

export default function WorkPlanScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useActiveBranchId();
  const canWrite = canWriteWorkPlan(user);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<WorkPlan | null>(null);
  const [editing, setEditing] = useState<{ plan: WorkPlan | null; n: number } | null>(null);
  const list = useQuery(workPlansQuery({ status, search: debounced, page }));
  const summary = useQuery(workPlanSummaryQuery(debounced));
  const counts = summary.data ?? {};
  const today = dayjs().format('YYYY-MM-DD');
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}>
        <PageHeader title={t('workPlan.title')} subtitle={t('workPlan.subtitle')} />
        <View style={styles.filters}>
          <SearchField
            value={search}
            onChangeText={(v) => reset(() => setSearch(v))}
            placeholder={t('workPlan.searchPlaceholder')}
          />
          <View style={styles.chips}>
            <Chip
              label={t('workPlan.filterAll')}
              count={counts.all}
              selected={!status}
              onPress={() => reset(() => setStatus(''))}
            />
            {FILTER_STATUSES.map((s) => (
              <Chip
                key={s}
                testID={`workplan-status-${s}`}
                label={t(s === 'overdue' ? 'workPlan.overdue' : `workPlan.status_${s}`)}
                count={counts[s]}
                tone={s === 'overdue' ? 'danger' : undefined}
                selected={status === s}
                onPress={() => reset(() => setStatus(status === s ? '' : s))}
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
            <EmptyState title={t('workPlan.empty')} message={canWrite ? t('workPlan.emptyHint') : undefined} />
          ) : (
            list.data!.items.map((p) => {
              const st = p.status ?? 'planned';
              return (
                <ListRow
                  key={p.id}
                  testID={`workplan-${p.id}`}
                  title={p.title ?? '—'}
                  subtitle={p.employee_name ?? p.department_name ?? undefined}
                  right={
                    <Badge
                      label={
                        isPlanOverdue(p, today)
                          ? t('workPlan.overdue')
                          : t(`workPlan.status_${st}`, { defaultValue: st })
                      }
                      tone={isPlanOverdue(p, today) ? 'danger' : (STATUS_TONE[st] ?? 'neutral')}
                    />
                  }
                  onPress={() => setViewing(p)}
                />
              );
            })
          )}
          <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
        </Card>
        <View style={styles.fabSpace} />
      </Screen>
      {canWrite && (
        <Fab
          testID="workplan-add"
          accessibilityLabel={t('workPlan.create')}
          onPress={() => setEditing({ plan: null, n: Date.now() })}
        />
      )}
      {viewing && (
        <WorkPlanDetailSheet
          key={viewing.id}
          plan={viewing}
          canWrite={canWrite}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing({ plan: viewing, n: Date.now() });
            setViewing(null);
          }}
        />
      )}
      {canWrite && editing && (
        <WorkPlanFormSheet
          key={editing.n}
          plan={editing.plan}
          branchId={activeBranchId}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fabSpace: { height: 72 },
});
