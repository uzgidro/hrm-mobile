// Topshiriqlar xronologiyasi — web v2 `TaskChronologyPage` porti: holat
// filtrlari (soni bilan), qidiruv, «Menga tegishli», ro'yxat va kalendar.
// Har qatorda kechikish sababi (qaysi ish, kim) — topshiriqni ochmasdan ko'rinadi.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs, { type Dayjs } from 'dayjs';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { ChipScroll } from '@/components/ChipScroll';
import { MonthNavigator } from '@/components/MonthNavigator';
import { weekdayNameShort } from '@/i18n/dates';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  ListRow,
  ProgressBar,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { chronoCalendarQuery, chronoSummaryQuery, chronoTasksQuery } from '../api/queries';
import { useDueText } from '../components/dueText';
import {
  TASK_BADGE,
  TASK_FILTERS,
  TONE_BADGE,
  type ChronoCalendarItem,
  type ChronoTaskRow,
  type TaskFilter,
} from '../utils/chrono';

type View_ = 'list' | 'calendar';

export default function ChronoListScreen() {
  const { t } = useTranslation();
  const [view, setView] = useState<View_>('list');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<TaskFilter>('');
  const [mine, setMine] = useState(false);
  const summary = useQuery(chronoSummaryQuery(debounced, mine));
  const list = useQuery({ ...chronoTasksQuery(debounced, status, mine), enabled: view === 'list' });
  const s = summary.data;
  const canManage = !!s?.can_manage;

  return (
    <View style={styles.root}>
      <Screen
        refreshing={list.isRefetching}
        onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}
      >
        <View style={styles.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <Text variant="title" accessibilityRole="header" style={styles.flex}>
            {t('chrono.title')}
          </Text>
        </View>
        <View style={styles.filters}>
          <Segmented<View_>
            options={[
              { value: 'list', label: t('chrono.viewList') },
              { value: 'calendar', label: t('chrono.viewCalendar') },
            ]}
            value={view}
            onChange={setView}
          />
          {view === 'list' && (
            <>
              <ChipScroll contentContainerStyle={styles.chips}>
                <Chip label={t('chrono.filterAll')} count={s?.all} selected={status === ''} onPress={() => setStatus('')} />
                {TASK_FILTERS.map((k) => (
                  <Chip
                    key={k}
                    testID={`chrono-filter-${k}`}
                    label={t(`chrono.filter_${k}`)}
                    count={s?.[k]}
                    tone={k === 'late' ? 'danger' : undefined}
                    selected={status === k}
                    onPress={() => setStatus(k)}
                  />
                ))}
              </ChipScroll>
              <SearchField value={search} onChangeText={setSearch} placeholder={t('chrono.searchPlaceholder')} />
            </>
          )}
          {/* Only the responsibles see every task; for anyone else «all» already IS «mine». */}
          {canManage && (
            <ChipScroll contentContainerStyle={styles.chips}>
              <Chip label={t('chrono.scopeAll')} selected={!mine} onPress={() => setMine(false)} />
              <Chip label={t('chrono.scopeMine')} selected={mine} onPress={() => setMine(true)} />
            </ChipScroll>
          )}
        </View>

        {view === 'calendar' ? (
          <ChronoCalendar mine={mine} />
        ) : (
          <Card>
            {list.isError ? (
              <ErrorState onRetry={() => list.refetch()} />
            ) : list.isPending ? (
              <Skeleton height={220} />
            ) : (list.data ?? []).length === 0 ? (
              <EmptyState title={t('chrono.empty')} message={canManage ? t('chrono.emptyHintManager') : t('chrono.emptyHint')} />
            ) : (
              (list.data ?? []).map((row) => <TaskRow key={row.id} row={row} />)
            )}
          </Card>
        )}
        {/* FAB oxirgi qatorni yopmasin. */}
        <View style={{ height: 72 }} />
      </Screen>
      {canManage && (
        <Fab testID="chrono-add" accessibilityLabel={t('chrono.create')} onPress={() => router.push('/topshiriq-form')} />
      )}
    </View>
  );
}

function TaskRow({ row }: { row: ChronoTaskRow }) {
  const { t } = useTranslation();
  const due = useDueText()(row);
  const cause = row.status !== 'done' ? row.causes[0] : undefined;
  const name = row.main_executor?.legal_name ?? '—';
  return (
    <ListRow
      testID={`chrono-task-${row.id}`}
      title={row.title}
      subtitle={`${name} · ${dayjs(row.deadline).format('DD.MM.YYYY')}`}
      left={<Avatar name={name} uri={row.main_executor?.photo_path} thumb={row.main_executor?.photo_thumb_path} size={36} />}
      right={
        <View style={styles.right}>
          <Badge label={t(`chrono.status_${row.status}`)} tone={TASK_BADGE[row.status]} />
          <Text variant="caption" tone={due.tone}>
            {due.text}
          </Text>
        </View>
      }
      below={
        <View style={styles.below}>
          <View style={styles.progressRow}>
            <View style={styles.flex}>
              <ProgressBar value={row.steps_total ? row.steps_done / row.steps_total : 0} />
            </View>
            <Text variant="caption" tone="subtle">
              {t('chrono.stepsDone', { done: row.steps_done, total: row.steps_total })}
            </Text>
          </View>
          {cause ? (
            <Text variant="caption" tone="danger" numberOfLines={1}>
              {t('chrono.causeLine', {
                title: cause.step_id == null ? t('chrono.mainJob') : cause.title,
                name: cause.assignee?.legal_name ?? '—',
                count: cause.own_late_days,
              })}
            </Text>
          ) : row.steps_review || row.pending_extensions ? (
            <Text variant="caption" tone="brand" numberOfLines={1}>
              {[
                row.steps_review ? t('chrono.reviewN', { count: row.steps_review }) : null,
                row.pending_extensions ? t('chrono.requestsN', { count: row.pending_extensions }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </View>
      }
      onPress={() => router.push(`/topshiriq?id=${row.id}`)}
    />
  );
}

/* ─────────────────────────── calendar ─────────────────────────── */

/**
 * A month grid (Monday first): every main job and job on the day it is due,
 * as coloured dots; tapping a day lists its entries, an entry opens the task
 * on that very job.
 */
function ChronoCalendar({ mine }: { mine: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [day, setDay] = useState(dayjs().format('YYYY-MM-DD'));
  const first = month.startOf('month');
  const lead = (first.day() + 6) % 7;
  const weeks = Math.ceil((lead + first.daysInMonth()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => first.subtract(lead, 'day').add(i, 'day'));
  const from = days[0].format('YYYY-MM-DD');
  const to = days[days.length - 1].format('YYYY-MM-DD');
  const cal = useQuery(chronoCalendarQuery(from, to, mine));
  const byDay = useMemo(() => {
    const m = new Map<string, ChronoCalendarItem[]>();
    for (const it of cal.data ?? []) m.set(it.deadline, [...(m.get(it.deadline) ?? []), it]);
    return m;
  }, [cal.data]);
  const today = dayjs().format('YYYY-MM-DD');
  const picked = byDay.get(day) ?? [];
  const DOT: Record<string, string> = {
    done: colors.success,
    review: colors.info,
    returned: colors.warning,
    late: colors.danger,
    waiting: colors.textMuted,
    active: colors.brand,
  };

  return (
    <View style={styles.calWrap}>
      <Card>
        <MonthNavigator month={month} onChange={(m) => setMonth(m.startOf('month'))} />
        <View style={styles.weekRow}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Text key={d} variant="caption" tone="subtle" style={styles.weekCell}>
              {weekdayNameShort(d)}
            </Text>
          ))}
        </View>
        {cal.isPending ? (
          <Skeleton height={260} />
        ) : (
          <View style={styles.grid}>
            {days.map((d) => {
              const key = d.format('YYYY-MM-DD');
              const items = byDay.get(key) ?? [];
              const out = d.month() !== first.month();
              const on = key === day;
              return (
                <Pressable
                  key={key}
                  testID={`chrono-day-${key}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${d.format('DD.MM.YYYY')} — ${t('chrono.calendarCount', { count: items.length })}`}
                  onPress={() => setDay(key)}
                  style={[
                    styles.cell,
                    on && { backgroundColor: colors.brandSoft, borderColor: colors.brand },
                    !on && { borderColor: 'transparent' },
                  ]}
                >
                  <Text
                    variant="label"
                    tone={key === today ? 'brand' : out ? 'subtle' : 'fg'}
                    weight={key === today ? '800' : undefined}
                  >
                    {d.date()}
                  </Text>
                  <View style={styles.dots}>
                    {items.slice(0, 4).map((it) => (
                      <View key={`${it.task_id}-${it.step_id ?? 'm'}`} style={[styles.dot, { backgroundColor: DOT[it.tone] }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>
      <Card title={dayjs(day).format('DD.MM.YYYY')}>
        {picked.length === 0 ? (
          <Text variant="body" tone="subtle" style={styles.emptyDay}>
            {t('chrono.calendarEmptyDay')}
          </Text>
        ) : (
          picked.map((it) => (
            <ListRow
              key={`${it.task_id}-${it.step_id ?? 'm'}`}
              title={it.title}
              titleAddon={it.is_main ? <Badge label={t('chrono.mainShort')} tone="brand" /> : undefined}
              subtitle={[it.is_main ? null : it.task_title, it.assignee?.legal_name].filter(Boolean).join(' · ')}
              right={
                <Badge
                  label={it.tone === 'late' ? t('chrono.daysLate', { count: it.late_days }) : t(`chrono.tone_${it.tone}`)}
                  tone={TONE_BADGE[it.tone]}
                />
              }
              onPress={() => router.push(`/topshiriq?id=${it.task_id}&job=${it.step_id ?? 'root'}`)}
            />
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 8 },
  flex: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { gap: 8 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: 150 },
  below: { gap: 4, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calWrap: { gap: 12 },
  weekRow: { flexDirection: 'row', marginTop: 8 },
  weekCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dots: { flexDirection: 'row', gap: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  emptyDay: { paddingVertical: 16, textAlign: 'center' },
});
