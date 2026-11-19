// Housekeeping: rooms board by cleanliness status, set a room's status, tasks with assignment
// (room keeper / registrar), «my tasks» for the housekeeper and the linen-change setting.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, Segmented, Sheet, Text } from '@/ui';
import { staffRoleQuery } from '../../api/queries';
import {
  hkBoardQuery, hkMineQuery, hkSettingsQuery, hkTasksInfinite, useDeleteHkTask, useDoneHkTask, useSaveHkSettings,
  useSaveHkTask, useSetRoomHkStatus, useStartHkTask,
} from '../../api/sections1';
import { PagedBlock, QueryBlock } from '../../components/common';
import { ChoiceField, DateField, ErrorLine, opt } from '../../components/forms';
import { askDelete, SectionGate } from '../../components/sections1/shared';
import { HK_KINDS, HK_STATUSES, type HkKind, type HkRoom, type HkStatus, type HkTask, type HkTaskStatus } from '../../types1';
import { hkAllowedStatuses, hkTaskTone, hkTone } from '../../utils/sections1';
import { fmtDate, hasSanRole, sanErrorMessage } from '../../utils/sanatorium';

type Tab = 'mine' | 'board' | 'tasks' | 'settings';

export default function HousekeepingScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const supervisor = hasSanRole(user, 'registrar', 'room_keeper');
  const housekeeper = hasSanRole(user, 'housekeeper');
  const [tab, setTab] = useState<Tab>(housekeeper && !supervisor ? 'mine' : 'board');
  const [taskSheet, setTaskSheet] = useState<HkTask | 'new' | null>(null);
  return (
    <SectionGate feature="housekeeping" roles={['registrar', 'room_keeper', 'housekeeper']}>
      <Screen testID="sanatorium-housekeeping-screen">
        <PageHeader
          title={t('san1.hk.title')}
          right={tab === 'tasks' && supervisor ? <Button testID="hk-task-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setTaskSheet('new')} /> : undefined}
        />
        <Segmented
          testID="hk-tabs"
          value={tab}
          onChange={setTab}
          options={[
            ...(housekeeper ? [{ value: 'mine' as Tab, label: t('san1.hk.mine') }] : []),
            { value: 'board' as Tab, label: t('san1.hk.board') },
            ...(supervisor ? [{ value: 'tasks' as Tab, label: t('san1.hk.tasks') }, { value: 'settings' as Tab, label: t('san1.hk.settings') }] : []),
          ]}
        />
        <View style={styles.body}>
          {tab === 'mine' && <MyTasks />}
          {tab === 'board' && <Board supervisor={supervisor} />}
          {tab === 'tasks' && supervisor && <Tasks onEdit={setTaskSheet} />}
          {tab === 'settings' && supervisor && <LinenSettings />}
        </View>
        <Sheet visible={!!taskSheet} onClose={() => setTaskSheet(null)} title={taskSheet === 'new' ? t('san1.hk.addTask') : t('san1.hk.editTask')} scroll>
          {taskSheet && <TaskForm key={taskSheet === 'new' ? 'new' : taskSheet.id} task={taskSheet === 'new' ? null : taskSheet} onClose={() => setTaskSheet(null)} />}
        </Sheet>
      </Screen>
    </SectionGate>
  );
}

// ── Board ──
function Board({ supervisor }: { supervisor: boolean }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'all' | HkStatus>('all');
  const q = useQuery(hkBoardQuery(status));
  const [room, setRoom] = useState<HkRoom | null>(null);
  return (
    <View style={styles.stack}>
      <QueryBlock query={q} rows={5}>
        {(b) => (
          <View style={styles.stack}>
            <Segmented
              testID="hk-status-tabs"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all' as const, label: t('common.all') },
                ...HK_STATUSES.map((s) => ({ value: s as 'all' | HkStatus, label: t(`san1.hk.status.${s}`), count: b.counts[s] || undefined })),
              ]}
            />
            {b.rooms.length === 0 ? (
              <EmptyState title={t('san1.hk.noRooms')} />
            ) : (
              b.rooms.map((r) => (
                <ListRow
                  key={r.id}
                  pressable
                  testID={`hk-room-${r.id}`}
                  title={`${t('sanatorium.room')} ${r.number}`}
                  subtitle={[
                    [r.building, r.floor != null ? `${r.floor}` : null].filter(Boolean).join(' / ') || null,
                    r.in_house ? t('san1.hk.inHouse') : null,
                    r.arriving_today ? t('san1.hk.arriving') : null,
                    r.open_tasks.length ? `${t('san1.hk.openTasks')}: ${r.open_tasks.length}` : null,
                  ].filter(Boolean).join(' · ') || undefined}
                  right={<Badge label={t(`san1.hk.status.${r.hk_status}`)} tone={hkTone(r.hk_status)} />}
                  chevron
                  onPress={() => setRoom(r)}
                />
              ))
            )}
          </View>
        )}
      </QueryBlock>
      <Sheet visible={!!room} onClose={() => setRoom(null)} title={room ? `${t('sanatorium.room')} ${room.number}` : ''} scroll>
        {room && <RoomStatusForm key={room.id} room={room} supervisor={supervisor} onClose={() => setRoom(null)} />}
      </Sheet>
    </View>
  );
}

function RoomStatusForm({ room, supervisor, onClose }: { room: HkRoom; supervisor: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const set = useSetRoomHkStatus();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const apply = async (status: HkStatus) => {
    try {
      await set.mutateAsync({ roomId: room.id, status, note: opt(note) });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="hk-room-sheet">
      <View style={styles.row}>
        <Text variant="caption" tone="muted">{t('san1.hk.current')}:</Text>
        <Badge label={t(`san1.hk.status.${room.hk_status}`)} tone={hkTone(room.hk_status)} />
        {!room.ready && <Badge label={t('san1.hk.notReady')} tone="warning" />}
      </View>
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={setNote} testID="hk-room-note" />
      <ErrorLine message={error} testID="hk-room-error" />
      {hkAllowedStatuses(HK_STATUSES, supervisor).filter((s) => s !== room.hk_status).map((s) => (
        <Button key={s} testID={`hk-set-${s}`} label={t(`san1.hk.status.${s}`)} variant="soft" full loading={set.isPending} onPress={() => void apply(s)} />
      ))}
    </View>
  );
}

// ── Tasks ──
const taskTitle = (t: (k: string) => string, k: HkTask) => `${t('sanatorium.room')} ${k.room.number} · ${t(`san1.hk.kind.${k.kind}`)}`;

function TaskLine({ k, onPress, right }: { k: HkTask; onPress?: () => void; right?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <ListRow
      pressable={!!onPress}
      testID={`hk-task-${k.id}`}
      title={taskTitle(t, k)}
      subtitle={[k.due_date ? fmtDate(k.due_date) : null, k.assignee?.full_name, k.note].filter(Boolean).join(' · ') || undefined}
      right={
        right ?? (
          <View style={styles.row}>
            {k.overdue && <Badge label={t('san1.hk.overdue')} tone="danger" />}
            <Badge label={t(`san1.hk.taskStatus.${k.status}`)} tone={hkTaskTone(k.status)} />
          </View>
        )
      }
      chevron={!!onPress}
      onPress={onPress}
    />
  );
}

function Tasks({ onEdit }: { onEdit: (t: HkTask) => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'all' | HkTaskStatus>('open');
  const [kind, setKind] = useState<'all' | HkKind>('all');
  const query = useInfiniteQuery(hkTasksInfinite({ ...(status !== 'all' ? { status } : {}), ...(kind !== 'all' ? { kind } : {}) }));
  return (
    <View style={styles.stack}>
      <Segmented
        testID="hk-task-status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all' as const, label: t('common.all') },
          ...(['open', 'in_progress', 'done'] as const).map((s) => ({ value: s as 'all' | HkTaskStatus, label: t(`san1.hk.taskStatus.${s}`) })),
        ]}
      />
      <Segmented
        testID="hk-task-kind"
        value={kind}
        onChange={setKind}
        options={[{ value: 'all' as const, label: t('common.all') }, ...HK_KINDS.map((k) => ({ value: k as 'all' | HkKind, label: t(`san1.hk.kind.${k}`) }))]}
      />
      <PagedBlock query={query}>
        {(items) => (items.length === 0 ? <EmptyState title={t('san1.hk.noTasks')} /> : <View style={styles.stack}>{items.map((k) => <TaskLine key={k.id} k={k} onPress={() => onEdit(k)} />)}</View>)}
      </PagedBlock>
    </View>
  );
}

function TaskForm({ task, onClose }: { task: HkTask | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveHkTask();
  const del = useDeleteHkTask();
  const board = useQuery(hkBoardQuery('all'));
  const housekeepers = useQuery(staffRoleQuery('housekeeper'));
  const [roomId, setRoomId] = useState<number | null>(task?.room.id ?? null);
  const [kind, setKind] = useState<HkKind>(task?.kind ?? 'cleaning');
  const [due, setDue] = useState<string | null>(task?.due_date ?? null);
  const [assignee, setAssignee] = useState<number | null>(task?.assignee_staff_id ?? null);
  const [status, setStatus] = useState<HkTaskStatus>(task?.status ?? 'open');
  const [note, setNote] = useState(task?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (roomId == null) return setError(t('san1.hk.pickRoom'));
    try {
      await save.mutateAsync({
        id: task?.id,
        body: task
          ? { kind, due_date: due, assignee_staff_id: assignee, status, note: opt(note) ?? null }
          : { room_id: roomId, kind, ...(due ? { due_date: due } : {}), ...(assignee != null ? { assignee_staff_id: assignee } : {}), ...(opt(note) ? { note: opt(note) } : {}) },
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const remove = async () => {
    if (!task || !(await askDelete(t, t('san1.hk.deleteTask')))) return;
    try {
      await del.mutateAsync(task.id);
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="hk-task-sheet">
      {task ? (
        <Text variant="heading">{`${t('sanatorium.room')} ${task.room.number}`}</Text>
      ) : (
        <ChoiceField
          label={t('sanatorium.room')}
          value={roomId}
          options={(board.data?.rooms ?? []).map((r) => ({ value: r.id, label: `${t('sanatorium.room')} ${r.number}`, sub: r.building ?? undefined }))}
          onChange={setRoomId}
          loading={board.isPending}
          testID="hk-task-room"
        />
      )}
      <ChoiceField label={t('san1.hk.kindLabel')} value={kind} options={HK_KINDS.map((k) => ({ value: k as HkKind, label: t(`san1.hk.kind.${k}`) }))} onChange={(v) => v && setKind(v)} testID="hk-task-kindfield" />
      <DateField label={t('san1.hk.due')} value={due} onChange={setDue} testID="hk-task-due" />
      <ChoiceField
        label={t('san1.hk.assignee')}
        value={assignee}
        noneLabel={t('san1.hk.unassigned')}
        options={(housekeepers.data ?? []).map((s) => ({ value: s.id, label: s.full_name }))}
        onChange={setAssignee}
        loading={housekeepers.isPending}
        testID="hk-task-assignee"
      />
      {task && (
        <ChoiceField
          label={t('san1.hk.statusLabel')}
          value={status}
          options={(['open', 'in_progress', 'done'] as const).map((s) => ({ value: s as HkTaskStatus, label: t(`san1.hk.taskStatus.${s}`) }))}
          onChange={(v) => v && setStatus(v)}
        />
      )}
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={setNote} multiline testID="hk-task-note" />
      <ErrorLine message={error} testID="hk-task-error" />
      <Button testID="hk-task-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
      {task && <Button testID="hk-task-delete" label={t('sanatorium.remove')} variant="dangerGhost" full loading={del.isPending} onPress={() => void remove()} />}
    </View>
  );
}

// ── My tasks (housekeeper) ──
function MyTasks() {
  const { t } = useTranslation();
  const q = useQuery(hkMineQuery());
  const start = useStartHkTask();
  const done = useDoneHkTask();
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <QueryBlock query={q} rows={4}>
      {(d) => (
        <View style={styles.stack} testID="hk-mine">
          {d.open.length === 0 ? <EmptyState title={t('san1.hk.noMine')} /> : null}
          {d.open.map((k) => (
            <Card key={k.id}>
              <TaskLine k={k} />
              <View style={styles.row}>
                {k.status === 'open' && <Button testID={`hk-start-${k.id}`} label={t('san1.hk.start')} variant="soft" size="sm" loading={start.isPending} onPress={() => void run(() => start.mutateAsync(k.id))} />}
                <Button testID={`hk-done-${k.id}`} label={t('san1.hk.done')} icon="check" size="sm" loading={done.isPending} onPress={() => void run(() => done.mutateAsync(k.id))} />
              </View>
            </Card>
          ))}
          {d.done_today.length > 0 && (
            <>
              <Text variant="label" tone="muted">{t('san1.hk.doneToday')}</Text>
              <Card>{d.done_today.map((k) => <TaskLine key={k.id} k={k} />)}</Card>
            </>
          )}
        </View>
      )}
    </QueryBlock>
  );
}

// ── Linen setting ──
function LinenSettings() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const q = useQuery(hkSettingsQuery());
  const save = useSaveHkSettings();
  const editable = hasSanRole(user, 'registrar');
  const [days, setDays] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <QueryBlock query={q} rows={1}>
      {(s) => {
        const value = days ?? String(s.linen_change_days);
        const submit = async () => {
          const n = Number.parseInt(value, 10);
          if (!Number.isFinite(n) || n < 0 || n > 60) return setError(t('san1.hk.linenRange'));
          try {
            await save.mutateAsync(n);
            setError(null);
            setDays(null);
            toast.success(t('sanatorium.saved'));
          } catch (e) {
            setError(sanErrorMessage(e, t('errors.generic')));
          }
        };
        return (
          <Card title={t('san1.hk.linen')} icon="settings" testID="hk-settings">
            <FormInput label={t('san1.hk.linenDays')} value={value} onChangeText={editable ? setDays : () => {}} keyboardType="number-pad" testID="hk-linen" />
            <Text variant="caption" tone="muted">{t('san1.hk.linenHint')}</Text>
            <ErrorLine message={error} />
            {editable && <Button testID="hk-linen-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />}
          </Card>
        );
      }}
    </QueryBlock>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 12 },
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  form: { gap: 6, paddingBottom: 8 },
});
