// Topshiriq yaratish / tahrirlash — web v2 TaskEditor porti, uch qadam:
//   1. Topshiriq      — nima, qaysi hujjat asosida, qachongacha (+ fayllar);
//   2. Ishtirokchilar — butun tashkilotdan, bittasi asosiy ijrochi;
//   3. Ishlar         — daraxt: har ish o'z mas'uli (ishtirokchilardan) va
//                       muddati bilan, istalgan ishga ilinadi.
// Saved deadlines are read-only here: moving one needs a reason and lands in
// the extension history, so it is done from the job's sheet.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UploadFile } from '@/api/formFile';
import { getApiErrorMessage } from '@/api/errors';
import { AttachmentField } from '@/components/AttachmentField';
import { ChipScroll } from '@/components/ChipScroll';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { useEmployeeOptionsPicker } from '@/lib/useInfinitePicker';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Card, Chip, IconButton, Screen, Segmented, SelectField, Sheet, Skeleton, Text } from '@/ui';
import { chronoTaskQuery } from '../api/queries';
import { addFiles, createTask, saveSteps, updateTask, useChronoWrite } from '../api/mutations';
import { pickFiles } from '../components/TaskParts';
import { subtree, treeOrder, type ChronoPerson, type ChronoTask, type StepInput } from '../utils/chrono';

type Stage = 'task' | 'people' | 'steps';
const STAGES: Stage[] = ['task', 'people', 'steps'];

type Draft = {
  handle: string;
  id?: number;
  title: string;
  description: string;
  assigneeId: number | null;
  start_date: string;
  deadline: string;
  /** The saved deadline — moves only through «Muddatni o'zgartirish». */
  lockedDeadline?: string;
  parent: string | null;
};

const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

export default function ChronoFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const taskId = id ? Number(id) : null;
  const existing = useQuery({ ...chronoTaskQuery(taskId ?? 0), enabled: !!taskId });
  if (taskId && !existing.data) {
    return (
      <Screen>
        <Skeleton height={320} />
      </Screen>
    );
  }
  return <Form task={existing.data ?? null} key={taskId ?? 'new'} onDone={() => router.back()} />;
}

function Form({ task, onDone }: { task: ChronoTask | null; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const write = useChronoWrite();
  const seq = useRef(0);
  const newHandle = () => `n${++seq.current}`;
  const [stage, setStage] = useState<Stage>('task');
  const [title, setTitle] = useState(task?.title ?? '');
  const [docNumber, setDocNumber] = useState(task?.doc_number ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [startDate, setStartDate] = useState(task?.start_date ?? (task ? '' : dayjs().format('YYYY-MM-DD')));
  const [deadline, setDeadline] = useState(task?.deadline ?? '');
  const [deadlineReason, setDeadlineReason] = useState('');
  const [members, setMembers] = useState<ChronoPerson[]>(task?.members ?? []);
  const [mainId, setMainId] = useState<number | null>(task?.main_executor?.id ?? null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [steps, setSteps] = useState<Draft[]>(() =>
    task
      ? task.steps.map((s) => ({
          handle: String(s.id),
          id: s.id,
          title: s.title,
          description: s.description ?? '',
          assigneeId: s.assignee?.id ?? null,
          start_date: s.start_date ?? '',
          deadline: s.deadline,
          lockedDeadline: s.deadline,
          parent: s.parent_id != null ? String(s.parent_id) : null,
        }))
      : [],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [datePick, setDatePick] = useState<null | 'start' | 'deadline'>(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleQ, setPeopleQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const busyIds = useMemo(() => new Set(steps.map((s) => s.assigneeId).filter((x): x is number => x != null)), [steps]);
  const ordered = useMemo(
    () => treeOrder(steps.map((s) => ({ id: s.handle, parent: s.parent, draft: s }))).map((o) => ({ ...o, item: o.item.draft })),
    [steps],
  );
  const deadlineOf = (handle: string | null) => (handle ? steps.find((x) => x.handle === handle)?.deadline || deadline : deadline);
  const deadlineMoved = !!task && !!deadline && deadline !== task.deadline;

  /* ── validation, one stage at a time ── */
  const checkTask = (): string | null => {
    if (!title.trim()) return t('chrono.errTitle');
    if (!deadline) return t('chrono.errDeadline');
    if (startDate && startDate > deadline) return t('chrono.errStartAfterDeadline');
    if (deadlineMoved && deadlineReason.trim().length < 3) return t('chrono.errDeadlineReason');
    return null;
  };
  const checkPeople = (): string | null => {
    if (!members.length) return t('chrono.errNoMembers');
    if (mainId == null || !byId.has(mainId)) return t('chrono.errMain');
    return null;
  };
  const checkSteps = (): string | null => {
    for (const { item: s, number } of ordered) {
      const name = s.title.trim() || t('chrono.stepN', { n: number });
      if (!s.title.trim()) return t('chrono.errStepTitle', { n: number });
      if (s.assigneeId == null || !byId.has(s.assigneeId)) return t('chrono.errStepAssignee', { name });
      if (!s.deadline) return t('chrono.errStepDeadline', { name });
      if (s.start_date && s.start_date > s.deadline) return t('chrono.errStepStart', { name });
      if (!s.id && s.deadline > deadlineOf(s.parent))
        return t(s.parent ? 'chrono.errStepAfterParent' : 'chrono.errStepAfterTask', { name });
    }
    return null;
  };
  const CHECK: Record<Stage, () => string | null> = { task: checkTask, people: checkPeople, steps: checkSteps };
  const goTo = (next: Stage) => {
    const from = STAGES.indexOf(stage);
    const to = STAGES.indexOf(next);
    for (let k = from; k < to; k++) {
      const msg = CHECK[STAGES[k]]();
      if (msg) {
        setStage(STAGES[k]);
        return setError(msg);
      }
    }
    setError('');
    setStage(next);
  };

  /* ── people ── */
  const options = useEmployeeOptionsPicker(peopleQ, { enabled: peopleOpen });
  const toggleMember = (empId: number) => {
    if (byId.has(empId)) {
      if (busyIds.has(empId)) return toast.info(t('chrono.memberBusy'));
      setMembers((xs) => xs.filter((m) => m.id !== empId));
      if (mainId === empId) setMainId(null);
      return;
    }
    const r = options.rows.find((x) => x.id === empId);
    if (!r) return;
    setMembers((xs) => [
      ...xs,
      { id: r.id, legal_name: r.legal_name, photo_path: r.photo_path, position_name: r.job_position_name, branch_name: r.organization_name },
    ]);
    if (mainId == null) setMainId(r.id);
  };

  /* ── jobs ── */
  const patch = (handle: string, p: Partial<Draft>) => setSteps((xs) => xs.map((x) => (x.handle === handle ? { ...x, ...p } : x)));
  const add = (parent: Draft | null) => {
    const d: Draft = { handle: newHandle(), title: '', description: '', assigneeId: null, start_date: '', deadline: parent?.deadline ?? '', parent: parent?.handle ?? null };
    setSteps((xs) => [...xs, d]);
    setEditing(d.handle);
  };
  /** Removing a job lifts its sub-jobs onto the job it hung on. */
  const remove = (handle: string) =>
    setSteps((xs) => {
      const gone = xs.find((x) => x.handle === handle);
      return xs.filter((x) => x.handle !== handle).map((x) => (x.parent === handle ? { ...x, parent: gone?.parent ?? null } : x));
    });

  /* ── save ── */
  const save = async () => {
    for (const s of STAGES) {
      const msg = CHECK[s]();
      if (msg) {
        setStage(s);
        return setError(msg);
      }
    }
    setError('');
    setSaving(true);
    const stepPayload: StepInput[] = ordered.map(({ item: s }) => ({
      ...(s.id ? { id: s.id } : { key: s.handle }),
      title: s.title.trim(),
      description: s.description.trim() || null,
      assignee_id: s.assigneeId as number,
      start_date: s.start_date || null,
      deadline: s.deadline,
      parent: s.parent,
    }));
    const fields = {
      title: title.trim(),
      doc_number: docNumber.trim() || null,
      description: description.trim() || null,
      main_executor_id: mainId,
      start_date: startDate || null,
      deadline,
    };
    const memberIds = members.map((m) => m.id);
    try {
      const saved = (await write.mutateAsync(async () => {
        let out: ChronoTask;
        if (!task) {
          out = await createTask({ ...fields, member_ids: memberIds, steps: stepPayload });
        } else {
          // Order matters (same as the web): the task's own fields first (a
          // later deadline must be in place for a new job), then the jobs, then
          // the members — someone whose job moved away can only then be dropped.
          await updateTask(task.id, { ...fields, ...(deadlineMoved ? { deadline_reason: deadlineReason.trim() } : {}) });
          out = await saveSteps(task.id, stepPayload);
          const now = new Set(out.members.map((m) => m.id));
          if (now.size !== memberIds.length || memberIds.some((x) => !now.has(x))) out = await updateTask(task.id, { member_ids: memberIds });
        }
        if (files.length) out = await addFiles(out.id, files);
        return out;
      })) as ChronoTask;
      toast.success(t('chrono.saved'));
      if (task) onDone();
      else router.replace(`/topshiriq?id=${saved.id}`);
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    } finally {
      setSaving(false);
    }
  };

  const idx = STAGES.indexOf(stage);
  const base = startDate ? dayjs(startDate) : dayjs();
  const quick = [
    { label: t('chrono.quick3d'), date: base.add(3, 'day').format('YYYY-MM-DD') },
    { label: t('chrono.quick1w'), date: base.add(7, 'day').format('YYYY-MM-DD') },
    { label: t('chrono.quick2w'), date: base.add(14, 'day').format('YYYY-MM-DD') },
    { label: t('chrono.quick1m'), date: base.add(1, 'month').format('YYYY-MM-DD') },
  ];
  const editingDraft = editing ? steps.find((s) => s.handle === editing) ?? null : null;

  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <IconButton icon="close" accessibilityLabel={t('common.cancel')} onPress={onDone} />
          <Text variant="title" accessibilityRole="header" style={styles.flex} numberOfLines={1}>
            {task ? t('chrono.editTitle') : t('chrono.create')}
          </Text>
        </View>
        <Segmented<Stage>
          options={[
            { value: 'task', label: `1. ${t('chrono.stageTask')}` },
            { value: 'people', label: `2. ${t('chrono.stagePeople')}`, count: members.length },
            { value: 'steps', label: `3. ${t('chrono.stageSteps')}`, count: steps.length },
          ]}
          value={stage}
          onChange={goTo}
        />
        <Text variant="caption" tone="muted" style={styles.hint}>
          {stage === 'task' ? t('chrono.stageTaskHint') : stage === 'people' ? t('chrono.peopleHint') : t('chrono.stepsHint')}
        </Text>

        {stage === 'task' && (
          <Card>
            <View style={styles.gap}>
              <FormInput label={t('chrono.fTitle')} value={title} onChangeText={setTitle} placeholder={t('chrono.fTitlePh')} required />
              <FormInput label={t('chrono.fDoc')} value={docNumber} onChangeText={setDocNumber} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <SelectField label={t('chrono.fStart')} value={fmt(startDate)} icon="calendar" onPress={() => setDatePick('start')} />
                </View>
                <View style={styles.flex}>
                  <SelectField label={`${t('chrono.fDeadline')} *`} value={fmt(deadline)} icon="calendar" onPress={() => setDatePick('deadline')} />
                </View>
              </View>
              <ChipScroll contentContainerStyle={styles.chips}>
                {quick.map((q) => (
                  <Chip key={q.label} label={q.label} selected={deadline === q.date} onPress={() => setDeadline(q.date)} />
                ))}
              </ChipScroll>
              {deadlineMoved && (
                <FormInput label={t('chrono.fDeadlineReason')} value={deadlineReason} onChangeText={setDeadlineReason} multiline required />
              )}
              <FormInput label={t('chrono.fDescription')} value={description} onChangeText={setDescription} multiline />
              <AttachmentField
                label={t('chrono.taskFiles')}
                files={files}
                onPick={() => void pickFiles().then((more) => setFiles((xs) => [...xs, ...more].slice(0, 10)))}
                onRemove={(i) => setFiles((xs) => xs.filter((_, j) => j !== i))}
              />
            </View>
          </Card>
        )}

        {stage === 'people' && (
          <Card>
            <View style={styles.gap}>
              <Button label={t('chrono.addPeople')} icon="plus" variant="soft" onPress={() => setPeopleOpen(true)} />
              {members.length === 0 ? (
                <Text variant="body" tone="subtle" style={styles.center}>
                  {t('chrono.peopleEmpty')}
                </Text>
              ) : (
                members.map((m) => {
                  const isMain = m.id === mainId;
                  return (
                    <View key={m.id} style={[styles.member, { borderColor: isMain ? colors.brand : colors.border }]}>
                      <Avatar name={m.legal_name ?? '?'} uri={m.photo_path} thumb={m.photo_thumb_path} size={34} />
                      <View style={styles.flex}>
                        <Text variant="label" numberOfLines={1}>
                          {m.legal_name}
                        </Text>
                        <Text variant="caption" tone="subtle" numberOfLines={1}>
                          {[m.position_name, m.branch_name].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </View>
                      <Chip label={isMain ? t('chrono.mainBadge') : t('chrono.makeMainShort')} selected={isMain} onPress={() => setMainId(m.id)} />
                      <IconButton
                        icon="close"
                        accessibilityLabel={busyIds.has(m.id) ? t('chrono.memberBusy') : t('chrono.removeMember')}
                        onPress={() => toggleMember(m.id)}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </Card>
        )}

        {stage === 'steps' && (
          <Card>
            <View style={styles.gap}>
              <View style={[styles.rootRow, { borderColor: colors.brand, backgroundColor: colors.brandSoft }]}>
                <Text variant="caption" tone="brand" weight="800">
                  {t('chrono.mainJob').toUpperCase()}
                </Text>
                <Text variant="label">{title || '—'}</Text>
                <Text variant="caption" tone="muted">
                  {(mainId != null && byId.get(mainId)?.legal_name) || '—'} · {fmt(deadline) || '—'}
                </Text>
              </View>
              {ordered.length === 0 && (
                <Text variant="caption" tone="subtle">
                  {t('chrono.noJobsHint')}
                </Text>
              )}
              {ordered.map(({ item: s, depth, number }) => (
                <Pressable
                  key={s.handle}
                  accessibilityRole="button"
                  onPress={() => setEditing(s.handle)}
                  style={[styles.job, { marginLeft: Math.min(depth, 5) * 16, borderLeftColor: colors.border }]}
                >
                  <View style={styles.flex}>
                    <Text variant="label" numberOfLines={2}>
                      {number}. {s.title.trim() || t('chrono.stepN', { n: number })}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {[(s.assigneeId != null && byId.get(s.assigneeId)?.legal_name) || t('chrono.pickFromMembers'), fmt(s.deadline) || '—'].join(' · ')}
                    </Text>
                  </View>
                  <IconButton icon="plus" accessibilityLabel={t('chrono.addSubJob')} onPress={() => add(s)} />
                  <IconButton icon="trash" accessibilityLabel={t('chrono.removeStep')} onPress={() => remove(s.handle)} />
                </Pressable>
              ))}
              <Button label={t('chrono.addStep')} icon="plus" variant="soft" onPress={() => add(null)} />
            </View>
          </Card>
        )}

        {!!error && (
          <Text variant="label" tone="danger" style={styles.error}>
            {error}
          </Text>
        )}
        <View style={styles.footer}>
          {idx > 0 ? (
            <Button label={t('chrono.back')} variant="ghost" onPress={() => goTo(STAGES[idx - 1])} />
          ) : (
            <Button label={t('common.cancel')} variant="ghost" onPress={onDone} />
          )}
          <View style={styles.flex} />
          {idx < STAGES.length - 1 ? (
            <>
              {task && <Button label={t('common.save')} variant="soft" loading={saving} onPress={() => void save()} />}
              <Button testID="chrono-next" label={t('chrono.next')} onPress={() => goTo(STAGES[idx + 1])} />
            </>
          ) : (
            <Button testID="chrono-save" label={task ? t('common.save') : t('chrono.createSubmit')} loading={saving} onPress={() => void save()} />
          )}
        </View>
        <View style={{ height: 32 }} />
      </Screen>

      {datePick && (
        <DatePickerModal
          visible
          value={(datePick === 'start' ? startDate : deadline) || undefined}
          title={datePick === 'start' ? t('chrono.fStart') : t('chrono.fDeadline')}
          onConfirm={(d) => (datePick === 'start' ? setStartDate(d) : setDeadline(d))}
          onClose={() => setDatePick(null)}
        />
      )}
      <PickerModal
        visible={peopleOpen}
        multiple
        title={t('chrono.addPeople')}
        options={options.rows.map((r) => ({
          value: r.id,
          label: r.legal_name ?? `#${r.id}`,
          subLabel: [r.job_position_name, r.organization_name].filter(Boolean).join(' · ') || undefined,
          photo: r.photo_path,
        }))}
        loading={options.loading}
        selected={members.map((m) => m.id)}
        onToggle={toggleMember}
        onSelect={toggleMember}
        onClose={() => setPeopleOpen(false)}
        onSearchChange={setPeopleQ}
        onEndReached={options.onEndReached}
        loadingMore={options.loadingMore}
      />
      {editingDraft && (
        <JobEditSheet
          draft={editingDraft}
          drafts={steps}
          ordered={ordered}
          members={members}
          maxDeadline={deadlineOf(editingDraft.parent)}
          onChange={(p) => patch(editingDraft.handle, p)}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

/** One job of the form: title, executor (from the members), parent, dates. */
function JobEditSheet({
  draft,
  drafts,
  ordered,
  members,
  maxDeadline,
  onChange,
  onClose,
}: {
  draft: Draft;
  drafts: Draft[];
  ordered: { item: Draft; number: string }[];
  members: ChronoPerson[];
  maxDeadline: string;
  onChange: (p: Partial<Draft>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<null | 'assignee' | 'parent' | 'start' | 'deadline'>(null);
  // The parent picker speaks numbers: 0 = the main job, n = n-th row.
  const blocked = subtree(drafts.map((d) => ({ id: d.handle, parent: d.parent })), draft.handle);
  const parents = ordered.filter((o) => !blocked.has(o.item.handle));
  const parentLabel = draft.parent
    ? (() => {
        const o = ordered.find((x) => x.item.handle === draft.parent);
        return o ? `${o.number}. ${o.item.title || t('chrono.stepN', { n: o.number })}` : t('chrono.mainJob');
      })()
    : t('chrono.mainJob');
  useEffect(() => {
    // A parent that can no longer hold this job (moved below it) falls back to the main job.
    if (draft.parent && blocked.has(draft.parent)) onChange({ parent: null });
  }, [draft.parent, blocked, onChange]);

  return (
    <Sheet scroll visible onClose={onClose} title={draft.title || t('chrono.newJob')}>
      <View style={styles.gap}>
        <FormInput label={t('chrono.fStepTitle')} value={draft.title} onChangeText={(v) => onChange({ title: v })} placeholder={t('chrono.fStepTitlePh')} required />
        <SelectField
          label={`${t('chrono.fAssignee')} *`}
          value={members.find((m) => m.id === draft.assigneeId)?.legal_name ?? ''}
          placeholder={t('chrono.pickFromMembers')}
          onPress={() => setPick('assignee')}
        />
        <SelectField label={t('chrono.fParent')} value={parentLabel} onPress={() => setPick('parent')} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField label={t('chrono.fStart')} value={fmt(draft.start_date)} icon="calendar" onPress={() => setPick('start')} />
          </View>
          <View style={styles.flex}>
            <SelectField
              label={`${t('chrono.fStepDeadline')} *`}
              value={fmt(draft.deadline)}
              icon="calendar"
              disabled={!!draft.lockedDeadline}
              onPress={() => setPick('deadline')}
            />
          </View>
        </View>
        {draft.lockedDeadline ? (
          <Text variant="caption" tone="subtle">
            {t('chrono.deadlineLockedHint')}
          </Text>
        ) : (
          !!maxDeadline && (
            <Text variant="caption" tone="subtle">
              {t('chrono.dueNoLaterThan', { date: fmt(maxDeadline) })}
            </Text>
          )
        )}
        <FormInput label={t('chrono.fStepDesc')} value={draft.description} onChangeText={(v) => onChange({ description: v })} multiline />
        <Button label={t('common.done')} full onPress={onClose} />
      </View>
      <PickerModal
        visible={pick === 'assignee'}
        title={t('chrono.fAssignee')}
        options={members.map((m) => ({ value: m.id, label: m.legal_name ?? `#${m.id}`, subLabel: m.branch_name ?? undefined, photo: m.photo_path }))}
        selected={draft.assigneeId}
        onSelect={(v) => {
          onChange({ assigneeId: v });
          setPick(null);
        }}
        onClose={() => setPick(null)}
      />
      <PickerModal
        visible={pick === 'parent'}
        title={t('chrono.fParent')}
        avatars={false}
        options={[
          { value: 0, label: t('chrono.mainJob') },
          ...parents.map((o) => ({ value: ordered.indexOf(o) + 1, label: `${o.number}. ${o.item.title || t('chrono.stepN', { n: o.number })}` })),
        ]}
        selected={draft.parent ? ordered.findIndex((o) => o.item.handle === draft.parent) + 1 : 0}
        onSelect={(v) => {
          onChange({ parent: v === 0 ? null : ordered[v - 1]?.item.handle ?? null });
          setPick(null);
        }}
        onClose={() => setPick(null)}
      />
      {(pick === 'start' || pick === 'deadline') && (
        <DatePickerModal
          visible
          value={(pick === 'start' ? draft.start_date : draft.deadline) || maxDeadline || undefined}
          title={pick === 'start' ? t('chrono.fStart') : t('chrono.fStepDeadline')}
          onConfirm={(d) => onChange(pick === 'start' ? { start_date: d } : { deadline: d })}
          onClose={() => setPick(null)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 8 },
  hint: { marginTop: 8, marginBottom: 12 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  chips: { gap: 8 },
  center: { textAlign: 'center', paddingVertical: 16 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, padding: 8 },
  rootRow: { gap: 2, borderWidth: 1.5, borderRadius: 14, padding: 10 },
  job: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingVertical: 4, borderLeftWidth: 2 },
  error: { marginTop: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
});

