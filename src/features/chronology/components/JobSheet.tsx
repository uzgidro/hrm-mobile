// Bitta ish (job) yoki asosiy topshiriq oynasi — web v2 StepPanel / MainJobPanel.
// The executor hands the job in (note + files), comments, asks for more time;
// an ijro officer accepts / returns (reason required), decides extensions,
// moves the deadline with a reason, reopens. A job — the main one included —
// cannot be handed in while a job under it is unfinished.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Button, Sheet, Text } from '@/ui';
import {
  useChronoWrite,
  agreeExtension,
  comment,
  decideExtension,
  decideStep,
  decideTask,
  finalDecideTask,
  requestExtension,
  setDeadline,
  submitStep,
  submitTask,
} from '../api/mutations';
import {
  TONE_BADGE,
  mentionablePeople,
  rootTone,
  stepTone,
  type ChronoExtension,
  type ChronoPerson,
  type ChronoStep,
  type ChronoTask,
} from '../utils/chrono';
import { Composer, DateReasonForm, ExtensionHistory, NoteForm, Timeline, runWrite } from './TaskParts';

const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

type Mode = null | 'submit' | 'comment' | 'extension' | 'approve' | 'reject' | 'agree' | 'deadline' | 'reopen' | 'finalApprove' | 'finalReject';

function PersonLine({ p, note, size = 34 }: { p?: ChronoPerson | null; note?: string | null; size?: number }) {
  const { t } = useTranslation();
  if (!p) return <Text tone="subtle">—</Text>;
  const sub = [p.position_name, p.branch_name].filter(Boolean).join(' · ');
  return (
    <View style={styles.person}>
      <Avatar name={p.legal_name ?? '?'} uri={p.photo_path} thumb={p.photo_thumb_path} size={size} />
      <View style={styles.flex}>
        <Text variant="label" numberOfLines={1}>
          {p.legal_name}
        </Text>
        {!!sub && (
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {sub}
          </Text>
        )}
        {!!note && (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {note}
          </Text>
        )}
      </View>
      {!!p.absence && <Badge label={t(`chrono.absence_${p.absence}`)} tone="warning" />}
    </View>
  );
}

/** Who has signed a pending extension, and who still has to (control → main executor → chairman). */
function ExtensionVotes({ ext }: { ext: ChronoExtension }) {
  const { t } = useTranslation();
  if (!ext.votes?.length) return null;
  return (
    <View style={styles.gap6}>
      <Text variant="caption" tone="subtle">
        {t(ext.stage === 'chair' ? 'chrono.extStageChair' : 'chrono.extStageAgreement')}
      </Text>
      {ext.votes.map((v, i) => (
        <View key={i} style={styles.voteRow}>
          <Badge
            label={t(v.decision === 'agree' ? 'chrono.voteAgreed' : v.decision === 'disagree' ? 'chrono.voteDisagreed' : 'chrono.voteWaiting')}
            tone={v.decision === 'agree' ? 'success' : v.decision === 'disagree' ? 'danger' : 'neutral'}
          />
          <Text variant="caption" style={styles.flex} numberOfLines={2}>
            {t(`chrono.voteRole_${v.role}`)}
            {v.person?.legal_name ? ` · ${v.person.legal_name}` : ''}
            {v.note ? ` — ${v.note}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function KV({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="label" tone={danger ? 'danger' : 'fg'}>
        {value}
      </Text>
    </View>
  );
}

export function stepLabel(t: (k: string, o?: Record<string, unknown>) => string, s: ChronoStep): string {
  const tone = stepTone(s);
  if (tone === 'late') return t('chrono.daysLate', { count: s.late_days });
  if (tone === 'active') return s.days_left === 0 ? t('chrono.dueToday') : t('chrono.daysLeft', { count: s.days_left ?? 0 });
  return t(`chrono.tone_${tone === 'waiting' ? 'waitingShort' : tone}`);
}

/** One job of the task. */
export function JobSheet({ task, step, onClose }: { task: ChronoTask; step: ChronoStep; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const write = useChronoWrite();
  const [mode, setMode] = useState<Mode>(null);
  const mine = task.my_step_ids.includes(step.id);
  const manage = task.can_manage;
  const tone = stepTone(step);
  const waiting = !!step.waiting_turn && step.status !== 'approved';
  const pending = step.extensions.find((e) => e.status === 'pending') ?? null;
  // Old payloads (before the agreement flow) carry no flags: the officer decides.
  const canAgree = pending?.can_agree ?? false;
  const canDecide = pending?.can_decide ?? (pending ? manage : false);
  const lastReturn = useMemo(
    () => (step.status === 'returned' ? task.events.find((e) => e.step_id === step.id && e.kind === 'returned') : undefined),
    [task.events, step],
  );
  const events = useMemo(() => task.events.filter((e) => e.step_id === step.id), [task.events, step.id]);
  const go = (run: () => Promise<unknown>, ok: string) =>
    runWrite(write.mutateAsync(run), t(ok), t('errors.generic')).then(() => setMode(null));
  const toggle = (m: Mode) => setMode(mode === m ? null : m);

  return (
    <Sheet scroll visible onClose={onClose} title={step.title}>
      <View style={styles.body}>
        <View style={styles.badges}>
          {!!step.order_no && <Badge label={t('chrono.orderNo', { n: step.order_no })} tone="brand" />}
          <Badge label={stepLabel(t as never, step)} tone={TONE_BADGE[tone]} />
          {mine && <Badge label={t('chrono.mine')} tone="brand" />}
          {step.requires_file && <Badge label={t('chrono.fileRequired')} tone="info" />}
        </View>
        <PersonLine p={step.assignee} />
        {!!step.coexecutors?.length && (
          <View style={styles.gap6}>
            <Text variant="caption" tone="subtle">
              {t('chrono.coexecutors')}
            </Text>
            {step.coexecutors.map((c, i) => (
              <PersonLine key={c.employee?.id ?? i} p={c.employee} note={c.reason} size={28} />
            ))}
          </View>
        )}
        {waiting && (
          <View style={[styles.alert, { backgroundColor: colors.warningSoft }]}>
            <Text variant="caption">{t('chrono.waitingTurnHint')}</Text>
          </View>
        )}
        <View style={styles.grid}>
          <KV label={t('chrono.fStart')} value={fmt(step.start_date)} />
          <KV
            label={t('chrono.fStepDeadline')}
            value={step.original_deadline !== step.deadline ? `${fmt(step.deadline)} (${fmt(step.original_deadline)})` : fmt(step.deadline)}
          />
          <KV
            label={t('chrono.forecast')}
            value={fmt(step.approved_at ?? step.forecast_end)}
            danger={step.late_days > 0 || step.inherited_days > 0}
          />
          <KV label={t('chrono.submittedAt')} value={step.submitted_at ? dayjs(step.submitted_at).format('DD.MM.YY HH:mm') : '—'} />
        </View>
        {(step.own_late_days > 0 || step.inherited_days > 0) && (
          <View style={[styles.alert, { backgroundColor: colors.dangerSoft }]}>
            {step.own_late_days > 0 && (
              <Text variant="label" tone="danger">
                {t('chrono.ownLate', { count: step.own_late_days })}
              </Text>
            )}
            {step.inherited_days > 0 && (
              <Text variant="caption" tone="danger">
                {t('chrono.inheritedLate', { count: step.inherited_days })}
              </Text>
            )}
          </View>
        )}
        {step.children_total > 0 && (
          <Text variant="caption" tone={step.blocked ? 'muted' : 'success'}>
            {t('chrono.subJobsDone', { done: step.children_done, total: step.children_total })}
            {step.blocked && step.status !== 'approved' ? `\n${t('chrono.waitingHint')}` : ''}
          </Text>
        )}
        {lastReturn && (
          <View style={[styles.alert, { backgroundColor: colors.dangerSoft }]}>
            <Text variant="label" tone="danger">
              {t('chrono.returnedReason')}
            </Text>
            <Text variant="body">{lastReturn.text}</Text>
          </View>
        )}
        {!!step.description && (
          <Text variant="body" numberOfLines={8}>
            {step.description}
          </Text>
        )}

        {step.handoff && (
          <View style={[styles.request, { backgroundColor: colors.brandSoft }]}>
            <Text variant="label">{t('chrono.handoffTitle')}</Text>
            {[{ label: t('chrono.voteRole_control'), sign: step.handoff.control }, ...step.handoff.next.filter((sign) => !step.handoff?.next_done || sign.done).map((sign) => ({ label: t('chrono.handoffNext'), sign }))].map(
              ({ label, sign }, i) => (
                <Text key={i} variant="caption" tone={sign.done ? 'success' : 'muted'}>
                  {sign.done ? '✓' : '…'} {label}
                  {sign.person?.legal_name ? ` — ${sign.person.legal_name}` : ''}
                  {sign.done ? '' : ` · ${t('chrono.handoffWaiting')}`}
                  {sign.note ? ` · ${sign.note}` : ''}
                </Text>
              ),
            )}
            <Text variant="caption" tone="muted">
              {step.handoff.complete
                ? t('chrono.handoffReady')
                : step.handoff.acceptor === 'final'
                  ? t('chrono.handoffAcceptFinal')
                  : t('chrono.handoffAcceptControl')}
            </Text>
          </View>
        )}
        {pending && (
          <View style={[styles.request, { backgroundColor: colors.warningSoft }]}>
            <Text variant="label">{t('chrono.extPending')}</Text>
            <Text variant="body">
              {fmt(pending.old_deadline)} → {fmt(pending.requested_deadline)}
            </Text>
            <Text variant="body" numberOfLines={5}>
              {pending.reason}
            </Text>
            <ExtensionVotes ext={pending} />
            {canAgree && (
              <>
                <NoteForm
                  label={t('chrono.agreeNote')}
                  submitLabel={t('chrono.extAgree')}
                  busy={write.isPending}
                  onSubmit={(note) => go(() => agreeExtension(pending.id, note), 'chrono.extAgreed')}
                />
                <NoteForm
                  label={t('chrono.rejectNote')}
                  required
                  danger
                  submitLabel={t('chrono.extDisagree')}
                  busy={write.isPending}
                  onSubmit={(note) => go(() => decideExtension(pending.id, 'reject', { note }), 'chrono.extRejected')}
                />
              </>
            )}
            {canDecide && (
              <>
                <DateReasonForm
                  dateLabel={t('chrono.grantDeadline')}
                  reasonLabel={t('chrono.decisionNote')}
                  min={dayjs(pending.old_deadline).add(1, 'day').format('YYYY-MM-DD')}
                  initial={pending.requested_deadline}
                  reasonOptional
                  submitLabel={t('chrono.extApprove')}
                  busy={write.isPending}
                  onSubmit={(deadline, note) => go(() => decideExtension(pending.id, 'approve', { deadline, note }), 'chrono.extApproved')}
                />
                <NoteForm
                  label={t('chrono.rejectNote')}
                  required
                  danger
                  submitLabel={t('chrono.extReject')}
                  busy={write.isPending}
                  onSubmit={(note) => go(() => decideExtension(pending.id, 'reject', { note }), 'chrono.extRejected')}
                />
              </>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {mine && (step.status === 'active' || step.status === 'returned') && (
            <Button
              testID="chrono-submit"
              label={t('chrono.submit')}
              icon="check"
              disabled={step.blocked || waiting}
              onPress={() => toggle('submit')}
            />
          )}
          {step.can_agree && <Button label={t('chrono.extAgree')} icon="check" onPress={() => toggle('agree')} />}
          {step.can_accept && (
            // A co-executor's job not handed in yet: its executor marks it done himself.
            <Button label={step.status === 'submitted' ? t('chrono.approve') : t('chrono.markDone')} icon="check" onPress={() => toggle('approve')} />
          )}
          {step.can_return && <Button label={t('chrono.reject')} variant="dangerGhost" onPress={() => toggle('reject')} />}
          {mine && step.status !== 'approved' && !pending && (
            <Button label={t('chrono.askExtension')} icon="clock" variant="soft" onPress={() => toggle('extension')} />
          )}
          {manage && step.status !== 'approved' && (
            <Button label={t('chrono.changeDeadline')} icon="calendar" variant="soft" onPress={() => toggle('deadline')} />
          )}
          {manage && step.status === 'approved' && (
            <Button label={t('chrono.reopen')} icon="refresh" variant="soft" onPress={() => toggle('reopen')} />
          )}
          <Button label={t('chrono.comment')} icon="mail" variant="ghost" onPress={() => toggle('comment')} />
        </View>

        {mode === 'submit' && (
          <Composer
            placeholder={t('chrono.submitPh')}
            submitLabel={t('chrono.submitSend')}
            allowEmpty
            requireFile={step.requires_file}
            busy={write.isPending}
            onSubmit={(text, files) => go(() => submitStep(step.id, text, files), 'chrono.submitted')}
          />
        )}
        {mode === 'comment' && (
          <Composer
            placeholder={t('chrono.commentPh')}
            submitLabel={t('chrono.sendComment')}
            busy={write.isPending}
            people={mentionablePeople(task)}
            onSubmit={(text, files, mentionIds) =>
              go(() => comment(task.id, { stepId: step.id, text, files, mentionIds }), 'chrono.commentSent')
            }
          />
        )}
        {mode === 'agree' && (
          <NoteForm
            label={t('chrono.agreeNote')}
            submitLabel={t('chrono.extAgree')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideStep(step.id, 'agree', note), 'chrono.extAgreed')}
          />
        )}
        {mode === 'approve' && (
          <NoteForm
            label={t('chrono.approveNote')}
            submitLabel={t('chrono.approve')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideStep(step.id, 'approve', note), 'chrono.approved')}
          />
        )}
        {mode === 'reject' && (
          <NoteForm
            label={t('chrono.rejectNote')}
            required
            danger
            submitLabel={t('chrono.reject')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideStep(step.id, 'reject', note), 'chrono.returned')}
          />
        )}
        {mode === 'reopen' && (
          <NoteForm
            label={t('chrono.reopenNote')}
            submitLabel={t('chrono.reopen')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideStep(step.id, 'reopen', note), 'chrono.reopened')}
          />
        )}
        {mode === 'extension' && (
          <DateReasonForm
            dateLabel={t('chrono.newDeadline')}
            reasonLabel={t('chrono.extReason')}
            min={dayjs(step.deadline).add(1, 'day').format('YYYY-MM-DD')}
            submitLabel={t('chrono.askExtension')}
            busy={write.isPending}
            onSubmit={(deadline, reason) => go(() => requestExtension(step.id, deadline, reason), 'chrono.extRequested')}
          />
        )}
        {mode === 'deadline' && (
          <DateReasonForm
            dateLabel={t('chrono.newDeadline')}
            reasonLabel={t('chrono.deadlineReason')}
            initial={step.deadline}
            mustChange
            submitLabel={t('chrono.changeDeadline')}
            busy={write.isPending}
            onSubmit={(deadline, reason) => go(() => setDeadline(step.id, deadline, reason), 'chrono.deadlineChanged')}
          />
        )}

        <ExtensionHistory items={step.extensions} />
        {events.length > 0 && (
          <View style={styles.section}>
            <Text variant="label">{t('chrono.timelineStep')}</Text>
            <Timeline events={events} max={10} />
          </View>
        )}
      </View>
    </Sheet>
  );
}

/** The main job: handed in by the main executor once every job is accepted. */
export function MainJobSheet({ task, onClose }: { task: ChronoTask; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const write = useChronoWrite();
  const [mode, setMode] = useState<Mode>(null);
  const tone = rootTone(task);
  const lastReturn = useMemo(() => {
    if (task.submitted_at || task.completed_at) return undefined;
    const ev = task.events.find((e) => e.kind === 'task_returned' || e.kind === 'task_submitted');
    return ev?.kind === 'task_returned' ? ev : undefined;
  }, [task]);
  const go = (run: () => Promise<unknown>, ok: string) =>
    runWrite(write.mutateAsync(run), t(ok), t('errors.generic')).then(() => setMode(null));
  const toggle = (m: Mode) => setMode(mode === m ? null : m);
  const canHandIn = task.is_main_executor && !task.submitted_at && !task.completed_at;
  // executing → control (the control department) → final (the final approver) → done.
  const stage = task.stage ?? (task.completed_at ? 'done' : task.submitted_at ? 'control' : 'executing');
  const controlOnly = !!task.final_step && !task.can_final;

  return (
    <Sheet scroll visible onClose={onClose} title={t('chrono.mainJob')}>
      <View style={styles.body}>
        <Text variant="heading">{task.title}</Text>
        <View style={styles.badges}>
          <Badge
            label={
              tone === 'late'
                ? t('chrono.delayForecast', { count: task.delay_days })
                : tone === 'waiting'
                  ? t('chrono.jobsOpen', { count: task.jobs_open })
                  : t(`chrono.tone_${tone}`)
            }
            tone={TONE_BADGE[tone]}
          />
          {task.is_main_executor && <Badge label={t('chrono.mine')} tone="brand" />}
        </View>
        <PersonLine p={task.main_executor} />
        {task.steps.length > 0 && !task.completed_at && (
          <Text variant="caption" tone={task.jobs_open ? 'muted' : 'success'}>
            {task.jobs_open ? t('chrono.mainWaits', { count: task.jobs_open }) : t('chrono.allJobsDone')}
          </Text>
        )}
        {task.main_own_late_days > 0 && !task.completed_at && (
          <Text variant="label" tone="danger">
            {t('chrono.ownLate', { count: task.main_own_late_days })}
          </Text>
        )}
        {lastReturn && (
          <View style={[styles.alert, { backgroundColor: colors.dangerSoft }]}>
            <Text variant="label" tone="danger">
              {t('chrono.returnedReason')}
            </Text>
            <Text variant="body">{lastReturn.text}</Text>
          </View>
        )}
        {stage === 'final' && (
          <View style={[styles.alert, { backgroundColor: colors.infoSoft }]}>
            <Text variant="caption">{t('chrono.stageFinalHint')}</Text>
          </View>
        )}
        <View style={styles.actions}>
          {canHandIn && (
            <Button
              testID="chrono-main-submit"
              label={t('chrono.submit')}
              icon="check"
              disabled={task.jobs_open > 0}
              onPress={() => toggle('submit')}
            />
          )}
          {task.can_manage && stage === 'control' && (
            <>
              <Button label={t(controlOnly ? 'chrono.controlApprove' : 'chrono.approve')} icon="check" onPress={() => toggle('approve')} />
              <Button label={t('chrono.reject')} variant="dangerGhost" onPress={() => toggle('reject')} />
            </>
          )}
          {task.can_final && stage === 'final' && (
            <>
              <Button label={t('chrono.finalApprove')} icon="checkDouble" onPress={() => toggle('finalApprove')} />
              <Button label={t('chrono.reject')} variant="dangerGhost" onPress={() => toggle('finalReject')} />
            </>
          )}
          {task.can_manage && (stage === 'done' || stage === 'final') && (
            <Button label={t('chrono.reopen')} icon="refresh" variant="soft" onPress={() => toggle('reopen')} />
          )}
        </View>
        {mode === 'submit' && (
          <Composer
            placeholder={t('chrono.submitPh')}
            submitLabel={t('chrono.submitSend')}
            allowEmpty
            busy={write.isPending}
            onSubmit={(text, files) => go(() => submitTask(task.id, text, files), 'chrono.submitted')}
          />
        )}
        {mode === 'approve' && (
          <NoteForm
            label={t('chrono.approveNote')}
            submitLabel={t('chrono.approve')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideTask(task.id, 'approve', note), controlOnly ? 'chrono.controlApproved' : 'chrono.taskDone')}
          />
        )}
        {mode === 'finalApprove' && (
          <NoteForm
            label={t('chrono.approveNote')}
            submitLabel={t('chrono.finalApprove')}
            busy={write.isPending}
            onSubmit={(note) => go(() => finalDecideTask(task.id, 'final-approve', note), 'chrono.taskDone')}
          />
        )}
        {mode === 'finalReject' && (
          <NoteForm
            label={t('chrono.rejectNote')}
            required
            danger
            submitLabel={t('chrono.reject')}
            busy={write.isPending}
            onSubmit={(note) => go(() => finalDecideTask(task.id, 'final-reject', note), 'chrono.returned')}
          />
        )}
        {mode === 'reject' && (
          <NoteForm
            label={t('chrono.rejectNote')}
            required
            danger
            submitLabel={t('chrono.reject')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideTask(task.id, 'reject', note), 'chrono.returned')}
          />
        )}
        {mode === 'reopen' && (
          <NoteForm
            label={t('chrono.reopenNote')}
            submitLabel={t('chrono.reopen')}
            busy={write.isPending}
            onSubmit={(note) => go(() => decideTask(task.id, 'reopen', note), 'chrono.reopened')}
          />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 12 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  kv: { width: '50%', gap: 2 },
  alert: { gap: 4, borderRadius: 12, padding: 10 },
  request: { gap: 8, borderRadius: 12, padding: 10 },
  actions: { gap: 8 },
  section: { gap: 8, marginTop: 4 },
  gap6: { gap: 6 },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
