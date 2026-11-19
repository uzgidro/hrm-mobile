// Bitta topshiriq — web v2 `/topshiriqlar-xronologiyasi/:id` porti.
// On a phone the tree is an OUTLINE: the main job on top, every job indented
// under the job it hangs on (the canvas the web draws needs a desktop). A row
// opens the job's sheet; `?job=` (calendar, push) opens one directly.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Card, EmptyState, ErrorState, IconButton, ProgressBar, Screen, Skeleton, Text } from '@/ui';
import { chronoTaskQuery } from '../api/queries';
import { addFiles, comment, deleteTask, useChronoWrite } from '../api/mutations';
import { JobSheet, MainJobSheet, stepLabel } from '../components/JobSheet';
import { Composer, FileList, Timeline, pickFiles, runWrite } from '../components/TaskParts';
import { useDueText } from '../components/dueText';
import { TASK_BADGE, TONE_BADGE, jobRows, mentionablePeople, rootTone, stepTone, type ChronoTask } from '../utils/chrono';

const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

export default function ChronoTaskScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string; job?: string }>();
  const id = Number(params.id);
  const q = useQuery(chronoTaskQuery(id));
  // `?job=` opens a job (or `root`, the main job) straight away.
  const [open, setOpen] = useState<string | null>(params.job ?? null);

  if (q.isError) {
    return (
      <Screen>
        <Header title={t('chrono.title')} />
        <ErrorState onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  if (!q.data) {
    return (
      <Screen>
        <Header title={t('chrono.title')} />
        <Skeleton height={140} />
        <View style={{ height: 12 }} />
        <Skeleton height={320} />
      </Screen>
    );
  }
  const task = q.data;
  const step = open && open !== 'root' ? task.steps.find((s) => String(s.id) === open) : undefined;

  return (
    <View style={styles.root}>
      <TaskBody task={task} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} onOpen={setOpen} />
      {open === 'root' && <MainJobSheet task={task} onClose={() => setOpen(null)} />}
      {step && <JobSheet key={step.id} task={task} step={step} onClose={() => setOpen(null)} />}
    </View>
  );
}

function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      <Text variant="title" accessibilityRole="header" style={styles.flex} numberOfLines={2}>
        {title}
      </Text>
      {right}
    </View>
  );
}

function TaskBody({
  task,
  refreshing,
  onRefresh,
  onOpen,
}: {
  task: ChronoTask;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (job: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const write = useChronoWrite();
  const due = useDueText()(task);
  const rows = useMemo(() => jobRows(task), [task]);
  const myOpen = rows.filter((r) => task.my_step_ids.includes(r.step.id) && r.step.status !== 'approved');
  const late = task.steps.filter((s) => s.status !== 'approved' && s.late_days > 0);
  const showCauses = !task.completed_at && (task.delay_days > 0 || late.length > 0);
  const causes = task.causes.length
    ? task.causes.map((c) => ({ key: c.step_id == null ? 'root' : String(c.step_id), title: c.step_id == null ? t('chrono.mainJob') : c.title, who: c.assignee?.legal_name, days: c.own_late_days }))
    : late.map((s) => ({ key: String(s.id), title: s.title, who: s.assignee?.legal_name, days: s.late_days }));
  const rTone = rootTone(task);

  const remove = async () => {
    const ok = await confirm({
      title: t('chrono.deleteTitle'),
      message: task.title,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await runWrite(write.mutateAsync(() => deleteTask(task.id)), t('chrono.deleted'), t('errors.generic')).catch(() => undefined);
    router.back();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Header
        title={task.title}
        right={
          task.can_manage ? (
            <View style={styles.headerActions}>
              <IconButton icon="edit" accessibilityLabel={t('chrono.editPlan')} onPress={() => router.push(`/topshiriq-form?id=${task.id}`)} />
              <IconButton icon="trash" accessibilityLabel={t('common.delete')} onPress={() => void remove()} />
            </View>
          ) : undefined
        }
      />
      <View style={styles.badges}>
        <Badge label={t(`chrono.status_${task.status}`)} tone={TASK_BADGE[task.status]} />
        {!!task.doc_number && <Badge label={`№ ${task.doc_number}`} tone="neutral" />}
      </View>

      <View style={styles.stack}>
        {/* ── at a glance ── */}
        <Card>
          <View style={styles.grid}>
            <View style={styles.kv}>
              <Text variant="caption" tone="subtle">
                {t('chrono.fDeadline')}
              </Text>
              <Text variant="label">{fmt(task.deadline)}</Text>
              <Text variant="caption" tone={due.tone}>
                {due.text}
              </Text>
            </View>
            <View style={styles.kv}>
              <Text variant="caption" tone="subtle">
                {t('chrono.forecast')}
              </Text>
              <Text variant="label" tone={task.delay_days > 0 ? 'danger' : 'fg'}>
                {fmt(task.completed_at ?? task.forecast_end)}
              </Text>
            </View>
          </View>
          <View style={styles.progress}>
            <View style={styles.flex}>
              <ProgressBar value={task.steps_total ? task.steps_done / task.steps_total : 0} />
            </View>
            <Text variant="caption" tone="subtle">
              {t('chrono.stepsDone', { done: task.steps_done, total: task.steps_total })}
            </Text>
          </View>
        </Card>

        {/* ── the viewer's own open jobs — one tap to «Bajardim» ── */}
        {myOpen.length > 0 && (
          <Card title={t('chrono.myJobs')} icon="user" tint="violet">
            {myOpen.map((r) => (
              <Pressable key={r.step.id} accessibilityRole="button" onPress={() => onOpen(String(r.step.id))} style={styles.myRow}>
                <Text variant="label" style={styles.flex} numberOfLines={2}>
                  {r.step.title}
                </Text>
                <Badge label={stepLabel(t as never, r.step)} tone={TONE_BADGE[stepTone(r.step)]} />
              </Pressable>
            ))}
          </Card>
        )}

        {/* ── why it is late ── */}
        {showCauses && (
          <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
            <Text variant="label" tone="danger">
              {task.delay_days > 0 ? t('chrono.bannerLate', { count: task.delay_days }) : t('chrono.bannerStepsLate', { count: late.length })}
            </Text>
            {causes.map((c) => (
              <Pressable key={c.key} accessibilityRole="button" onPress={() => onOpen(c.key)} style={styles.causeRow}>
                <Text variant="body" numberOfLines={2}>
                  «{c.title}» — {c.who ?? '—'}
                </Text>
                <Text variant="caption" tone="danger">
                  {t('chrono.daysLate', { count: c.days })}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── the tree, as an outline ── */}
        <Card title={t('chrono.treeTitle')} icon="target" tint="cyan">
          <Pressable
            testID="chrono-root"
            accessibilityRole="button"
            onPress={() => onOpen('root')}
            style={[styles.rootRow, { borderColor: colors.brand, backgroundColor: colors.brandSoft }]}
          >
            <View style={styles.flex}>
              <Text variant="caption" tone="brand" weight="800">
                {t('chrono.mainJob').toUpperCase()}
              </Text>
              <Text variant="label" numberOfLines={2}>
                {task.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {task.main_executor?.legal_name ?? '—'} · {fmt(task.deadline)}
              </Text>
            </View>
            <Badge
              label={
                rTone === 'late'
                  ? t('chrono.delayForecast', { count: task.delay_days })
                  : rTone === 'waiting'
                    ? t('chrono.jobsOpen', { count: task.jobs_open })
                    : t(`chrono.tone_${rTone}`)
              }
              tone={TONE_BADGE[rTone]}
            />
          </Pressable>
          {rows.length === 0 ? (
            <Text variant="caption" tone="subtle" style={styles.noJobs}>
              {t('chrono.noJobsHintShort')}
            </Text>
          ) : (
            rows.map(({ step: s, depth, number }) => {
              const tone = stepTone(s);
              const mine = task.my_step_ids.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  testID={`chrono-job-${s.id}`}
                  accessibilityRole="button"
                  onPress={() => onOpen(String(s.id))}
                  style={[
                    styles.jobRow,
                    {
                      marginLeft: 12 + Math.min(depth, 5) * 16,
                      borderLeftColor: s.on_critical_path ? colors.danger : colors.border,
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text variant="label" numberOfLines={2}>
                      {number}. {s.title}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {[s.assignee?.legal_name ?? '—', fmt(s.deadline), s.children_total ? `${s.children_done}/${s.children_total}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.jobRight}>
                    <Badge label={stepLabel(t as never, s)} tone={TONE_BADGE[tone]} />
                    {mine && <Badge label={t('chrono.mine')} tone="brand" />}
                  </View>
                </Pressable>
              );
            })
          )}
        </Card>

        {!!task.description && (
          <Card title={t('chrono.fDescription')}>
            <Text variant="body" numberOfLines={12}>
              {task.description}
            </Text>
          </Card>
        )}

        <Card title={t('chrono.filesCount', { count: task.files.length })} icon="folder" tint="amber">
          <FileList
            files={task.files}
            busy={write.isPending}
            onAdd={() =>
              void pickFiles().then((files) =>
                files.length
                  ? runWrite(write.mutateAsync(() => addFiles(task.id, files)), t('chrono.filesAdded'), t('errors.generic')).catch(() => undefined)
                  : undefined,
              )
            }
          />
        </Card>

        <Card title={t('chrono.membersCount', { count: task.members.length })} icon="users" tint="green">
          {task.members.length === 0 ? (
            <EmptyState title={t('chrono.noMembers')} />
          ) : (
            task.members.map((m) => (
              <View key={m.id} style={styles.member}>
                <Avatar name={m.legal_name ?? '?'} uri={m.photo_path} thumb={m.photo_thumb_path} size={30} />
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={1}>
                    {m.legal_name}
                  </Text>
                  <Text variant="caption" tone="subtle" numberOfLines={1}>
                    {[m.position_name, m.branch_name].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {m.id === task.main_executor?.id && <Badge label={t('chrono.mainShort')} tone="brand" />}
              </View>
            ))
          )}
        </Card>

        <Card title={t('chrono.comment')} icon="mail" tint="drop">
          <Composer
            placeholder={t('chrono.commentTaskPh')}
            submitLabel={t('chrono.sendComment')}
            busy={write.isPending}
            people={mentionablePeople(task)}
            onSubmit={(text, files, mentionIds) =>
              runWrite(write.mutateAsync(() => comment(task.id, { text, files, mentionIds })), t('chrono.commentSent'), t('errors.generic'))
            }
          />
        </Card>

        <Card title={t('chrono.timeline')} icon="clock" tint="grey">
          <Timeline events={task.events} />
        </Card>
      </View>
      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 4 },
  headerActions: { flexDirection: 'row', gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  stack: { gap: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  kv: { flex: 1, gap: 2 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  myRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  banner: { borderRadius: 16, padding: 12, gap: 8 },
  causeRow: { gap: 2 },
  rootRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, padding: 10, marginBottom: 6 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 10, borderLeftWidth: 2 },
  jobRight: { alignItems: 'flex-end', gap: 4, maxWidth: 130 },
  noJobs: { paddingVertical: 8 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
});
