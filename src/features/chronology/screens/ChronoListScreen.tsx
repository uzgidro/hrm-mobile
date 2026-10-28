// Topshiriqlar xronologiyasi — web v2 `TaskChronologyPage` porti: holat
// filtrlari (soni bilan), qidiruv, «Menga tegishli», ro'yxat va kalendar.
// Each row names who is making the task late and by how much — seen without opening it.
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
  CHRONO_KINDS,
  TASK_BADGE,
  TASK_FILTERS,
  TONE_BADGE,
  type ChronoCalendarItem,
  type ChronoKind,
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
  // Asosiy / Texnik / Sayyor never mix (web v2 parity, 2026-10-27).
  const [kind, setKind] = useState<ChronoKind>('main');
  const summary = useQuery(chronoSummaryQuery(debounced, mine, kind));
  const list = useQuery({ ...chronoTasksQuery(debounced, status, mine, kind), enabled: view === 'list' });
  const s = summary.data;
  const canManage = !!s?.can_manage;
  const seesAll = s?.sees_all ?? canManage;

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
          <Segmented<ChronoKind>
            testID="chrono-kind"
            options={CHRONO_KINDS.map((k) => ({ value: k, label: t(`chrono.kind_${k}`) }))}
            value={kind}
            onChange={setKind}
          />
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
          {/* Only those who see every task get the switch; for anyone else «all» already IS «mine». */}
          {seesAll && (
            <ChipScroll contentContainerStyle={styles.chips}>
              <Chip label={t('chrono.scopeAll')} selected={!mine} onPress={() => setMine(false)} />
              <Chip label={t('chrono.scopeMine')} selected={mine} onPress={() => setMine(true)} />
            </ChipScroll>
          )}
        </View>

        {view === 'calendar' ? (
          <ChronoCalendar mine={mine} kind={kind} />
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
  const late = row.status !== 'done' ? row.causes.filter((c) => c.own_late_days > 0) : [];
  const name = row.main_executor?.legal_name ?? '—';
  const turn = row.status !== 'done' ? turnText(t, row) : null;
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
          {late.length > 0 && (
            // Only the late people (user 2026-10-28: review / request counts are read inside the requests).
            <Text variant="caption" tone="danger" numberOfLines={2}>
              {t('chrono.lateLine', {
                names: late
                  .map((c) => t('chrono.lateItem', { name: c.assignee?.legal_name ?? '—', count: c.own_late_days }))
                  .join(', '),
              })}
            </Text>
          )}
          {!!turn && (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {turn}
            </Text>
          )}
        </View>
      }
      onPress={() => router.push(`/topshiriq?id=${row.id}`)}
    />
  );
}

/** «Navbat: <name>» — whose move it is, readable without opening the task. */
function turnText(t: (k: string, o?: Record<string, unknown>) => string, row: ChronoTaskRow): string | null {
  const tn = row.turn;
  if (!tn || tn.kind === 'done') return null;
  if (tn.kind === 'control') return t('chrono.turnControl');
  if (tn.kind === 'final') return t('chrono.turnFinal');
  return tn.person?.legal_name ? t('chrono.turnOf', { name: tn.person.legal_name }) : null;
}

/* ─────────────────────────── calendar ─────────────────────────── */

/**
 * A month grid (Monday first): every main job and job on the day it is due,
 * as coloured dots; tapping a day lists its entries, an entry opens the task
 * on that very job.
 */
function ChronoCalendar({ mine, kind }: { mine: boolean; kind: ChronoKind }) {
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
  const cal = useQuery(chronoCalendarQuery(from, to, mine, kind));
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
