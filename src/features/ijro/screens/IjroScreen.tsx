// v3 Ijro intizomi — web v2 `IjroPage` porti: holatlar bo'yicha (soni bilan),
// qidiruv, ro'yxat (raqam · ijrochi, mazmun, muddat/kechikish). Bosish —
// tafsilot; yozish (yaratish, bajarildi, qayta ochish, tahrir, o'chirish) faqat
// `user.is_ijro_manager` (v2).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  ListRow,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { ijroSummaryQuery, ijroTasksQuery } from '../api/queries';
import { IJRO_STATUSES, daysLeft, delayDays, statusOf, type IjroStatus, type IjroTask } from '../utils/ijro';
import { TaskDetailSheet, TaskFormSheet } from '../components/TaskSheets';
import { STATUS_TONE } from '../components/statusTone';

type Filter = '' | IjroStatus;

export default function IjroScreen() {
  const { t } = useTranslation();
  const canWrite = !!useAuthStore((s) => s.user)?.is_ijro_manager;
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<Filter>('');
  const [viewing, setViewing] = useState<IjroTask | null>(null);
  const [editing, setEditing] = useState<IjroTask | null | undefined>(undefined);
  const list = useQuery(ijroTasksQuery({ search: debounced, status }));
  const summary = useQuery(ijroSummaryQuery(debounced));
  const today = dayjs().format('YYYY-MM-DD');
  const rows = list.data ?? [];
  const s = summary.data;

  const timing = (task: IjroTask) => {
    const st = statusOf(task, today);
    const late = delayDays(task, today);
    if (st === 'late') return t('ijro.daysLate', { count: late });
    if (st === 'late_done') return t('ijro.closedLate', { count: late });
    if (st === 'done') return t('ijro.closedOnTime');
    const left = daysLeft(task, today);
    return left === 0 ? t('ijro.dueToday') : t('ijro.daysLeft', { count: left });
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}>
        <View style={styles.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header" style={styles.flex}>
            {t('ijro.title')}
          </Text>
        </View>
        <View style={styles.filters}>
          <Segmented<Filter>
            options={[
              { value: '', label: t('ijro.filterAll'), count: s?.all },
              ...IJRO_STATUSES.map((k) => ({ value: k as Filter, label: t(`ijro.status_${k}`), count: s?.[k] })),
            ]}
            value={status}
            onChange={setStatus}
          />
          <SearchField value={search} onChangeText={setSearch} placeholder={t('ijro.searchPlaceholder')} />
        </View>
        <Card>
          {list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={200} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('ijro.empty')} message={t('ijro.emptyHint')} />
          ) : (
            rows.map((task) => {
              const st = statusOf(task, today);
              const name = task.employee?.legal_name ?? '—';
              return (
                <ListRow
                  key={task.id}
                  testID={`ijro-task-${task.id}`}
                  title={`${task.task_index || '—'} · ${name}`}
                  subtitle={task.description || undefined}
                  left={
                    <Avatar name={name} uri={task.employee?.photo_path} thumb={task.employee?.photo_thumb_path} size={36} />
                  }
                  right={
                    <View style={styles.right}>
                      <Badge label={t(`ijro.status_${st}`)} tone={STATUS_TONE[st]} />
                      <Text variant="caption" tone={st === 'late' ? 'danger' : 'subtle'}>
                        {timing(task)}
                      </Text>
                    </View>
                  }
                  onPress={() => setViewing(task)}
                />
              );
            })
          )}
        </Card>
        {/* FAB oxirgi qatorni yopmasin. */}
        <View style={{ height: 72 }} />
      </Screen>
      {canWrite && <Fab testID="ijro-add" accessibilityLabel={t('ijro.create')} onPress={() => setEditing(null)} />}
      <TaskDetailSheet
        task={viewing}
        canWrite={canWrite}
        onClose={() => setViewing(null)}
        onEdit={(task) => {
          setViewing(null);
          setEditing(task);
        }}
      />
      {canWrite && editing !== undefined && (
        <TaskFormSheet key={editing?.id ?? 'new'} task={editing} onClose={() => setEditing(undefined)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 8 },
  flex: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: 140 },
});
