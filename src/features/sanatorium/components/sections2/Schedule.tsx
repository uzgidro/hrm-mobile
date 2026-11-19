// Procedure schedule: the day board (per room: mark done / missed, reschedule, cancel) and the
// «schedule this procedure» sheet. Used by the schedule screen and the nurse screen.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, SelectField, Sheet, Text } from '@/ui';
import type { Tone } from '@/ui/Chip';
import {
  boardQuery, procRoomsQuery, useCancelSession, useMarkSession, useRescheduleSession, useScheduleProcedure,
  type ProcSession, type SessionStatus,
} from '../../api/sections2';
import { DayBar, QueryBlock } from '../common';
import { ChoiceField, DateField, ErrorLine } from '../forms';
import { fmtDateTime, fmtTime, sanErrorMessage, toLocalIso, todayIso } from '../../utils/sanatorium';
import { isHhmm } from '../../utils/sections2';

const TONE: Record<SessionStatus, Tone> = { planned: 'info', done: 'success', missed: 'warning', cancelled: 'danger' };

export function ScheduleBoard({ canAct = true }: { canAct?: boolean }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(todayIso());
  const q = useQuery(boardQuery(day));
  const [moving, setMoving] = useState<ProcSession | null>(null);
  return (
    <View testID="schedule-board">
      <DayBar value={day} onChange={setDay} />
      <QueryBlock query={q}>
        {(b) => (
          <View style={styles.stack}>
            {b.rooms.length === 0 && b.unassigned.length === 0 && <EmptyState title={t('sanatorium.s2.noSessions')} />}
            {b.rooms.map((r) => (
              <Card key={r.room.id} title={r.room.name} icon="board" tint="violet" testID={`board-room-${r.room.id}`}>
                <Text variant="caption" tone="muted">
                  {t('sanatorium.s2.sessionCounts', { planned: r.counts.planned, done: r.counts.done, missed: r.counts.missed })} · {t('sanatorium.s2.freeSlots')}: {r.free_slots}/{r.capacity_slots}
                </Text>
                {r.sessions.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.s2.noSessions')}</Text>}
                {r.sessions.map((s) => <SessionRow key={s.id} s={s} canAct={canAct} onMove={() => setMoving(s)} />)}
              </Card>
            ))}
            {b.unassigned.length > 0 && (
              <Card title={t('sanatorium.s2.unassigned')} icon="clock" tint="amber">
                {b.unassigned.map((s) => <SessionRow key={s.id} s={s} canAct={canAct} onMove={() => setMoving(s)} />)}
              </Card>
            )}
          </View>
        )}
      </QueryBlock>
      <Sheet visible={!!moving} onClose={() => setMoving(null)} title={t('sanatorium.s2.reschedule')} scroll>
        {moving && <MoveForm key={moving.id} s={moving} onClose={() => setMoving(null)} />}
      </Sheet>
    </View>
  );
}

function SessionRow({ s, canAct, onMove }: { s: ProcSession; canAct: boolean; onMove: () => void }) {
  const { t } = useTranslation();
  const mark = useMarkSession();
  const cancel = useCancelSession();
  const onError = (e: unknown) => toast.error(sanErrorMessage(e, t('errors.generic')));
  const set = (status: 'done' | 'missed' | 'planned') => mark.mutate({ id: s.id, status }, { onError });
  const doCancel = async () => {
    if (!(await confirm({ title: t('sanatorium.s2.cancelSession'), confirmLabel: t('sanatorium.s2.cancelSession'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    cancel.mutate({ id: s.id }, { onError });
  };
  return (
    <View style={styles.session} testID={`session-${s.id}`}>
      <View style={styles.head}>
        <Text variant="heading" tone="brand">{fmtTime(s.starts_at)}</Text>
        <View style={styles.flex}>
          <Text variant="body" weight="600" numberOfLines={2}>{s.guest?.full_name ?? `#${s.guest_id}`}</Text>
          <Text variant="caption" tone="muted">{s.procedure_name} · {s.sessions_done}/{s.sessions_total}</Text>
        </View>
        <Badge label={t(`sanatorium.s2.sessionStatus.${s.status}`)} tone={TONE[s.status]} />
      </View>
      {canAct && s.status !== 'cancelled' && (
        <View style={styles.actions}>
          {s.status === 'planned' && <Button testID={`session-${s.id}-done`} label={t('sanatorium.s2.markDone')} size="sm" icon="check" loading={mark.isPending} onPress={() => set('done')} />}
          {s.status === 'planned' && <Button testID={`session-${s.id}-missed`} label={t('sanatorium.s2.markMissed')} size="sm" variant="soft" onPress={() => set('missed')} />}
          {s.status !== 'planned' && <Button testID={`session-${s.id}-undo`} label={t('sanatorium.s2.undo')} size="sm" variant="soft" onPress={() => set('planned')} />}
          {s.status === 'planned' && <Button testID={`session-${s.id}-move`} label={t('sanatorium.s2.reschedule')} size="sm" variant="soft" onPress={onMove} />}
          {s.status === 'planned' && <Button testID={`session-${s.id}-cancel`} label={t('sanatorium.s2.cancelSession')} size="sm" variant="dangerGhost" loading={cancel.isPending} onPress={() => void doCancel()} />}
        </View>
      )}
    </View>
  );
}

function MoveForm({ s, onClose }: { s: ProcSession; onClose: () => void }) {
  const { t } = useTranslation();
  const move = useRescheduleSession();
  const rooms = useQuery(procRoomsQuery(false));
  const [at, setAt] = useState(s.starts_at);
  const [roomId, setRoomId] = useState<number | null>(s.room?.id ?? null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    try {
      await move.mutateAsync({ id: s.id, body: { starts_at: toLocalIso(at), ...(roomId ? { room_id: roomId } : {}) } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="session-move-form">
      <Text variant="body" weight="600">{s.guest?.full_name} · {s.procedure_name}</Text>
      <SelectField label={t('sanatorium.s2.newTime')} value={fmtDateTime(at)} icon="clock" onPress={() => setOpen(true)} testID="move-at" />
      <DateTimePickerModal visible={open} value={at} title={t('sanatorium.s2.newTime')} onConfirm={(iso) => setAt(toLocalIso(dayjs(iso)))} onClose={() => setOpen(false)} />
      <ChoiceField label={t('sanatorium.s2.procRoom')} value={roomId} options={(rooms.data ?? []).map((r) => ({ value: r.id, label: r.name }))} onChange={setRoomId} loading={rooms.isPending} testID="move-room" />
      <ErrorLine message={error} testID="move-error" />
      <Button testID="move-save" label={t('common.save')} full loading={move.isPending} onPress={() => void submit()} />
    </View>
  );
}

/** «Place the remaining sessions of this procedure into a procedure room's free slots». */
export function ScheduleProcedureSheet({ procedure, onClose }: { procedure: { id: number; name: string; sessions_total: number; sessions_done: number } | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!procedure} onClose={onClose} title={t('sanatorium.s2.scheduleProcedure')} scroll>
      {procedure && <ScheduleForm key={procedure.id} p={procedure} onClose={onClose} />}
    </Sheet>
  );
}

function ScheduleForm({ p, onClose }: { p: { id: number; name: string; sessions_total: number; sessions_done: number }; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useScheduleProcedure();
  const rooms = useQuery(procRoomsQuery(false));
  const [roomId, setRoomId] = useState<number | null>(null);
  const [start, setStart] = useState<string | null>(todayIso());
  const [time, setTime] = useState('');
  const [count, setCount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ n: number; left: number } | null>(null);
  const submit = async () => {
    if (!roomId) return setError(t('sanatorium.s2.pickProcRoom'));
    if (time.trim() && !isHhmm(time)) return setError(t('sanatorium.s2.hoursInvalid'));
    const n = count.trim() ? Number.parseInt(count, 10) : null;
    if (n != null && (!Number.isFinite(n) || n < 1 || n > 100)) return setError(t('sanatorium.sessionsRange'));
    try {
      const r = await save.mutateAsync({ procedureId: p.id, body: { room_id: roomId, ...(start ? { start_date: start } : {}), ...(time.trim() ? { preferred_time: time.trim() } : {}), ...(n ? { sessions: n } : {}) } });
      setResult({ n: r.scheduled.length, left: r.unscheduled });
      setError(null);
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="schedule-form">
      <Text variant="body" weight="600">{p.name} · {p.sessions_done}/{p.sessions_total}</Text>
      <ChoiceField label={t('sanatorium.s2.procRoom')} value={roomId} options={(rooms.data ?? []).map((r) => ({ value: r.id, label: r.name, sub: r.specialty?.name }))} onChange={setRoomId} loading={rooms.isPending} testID="sch-room" />
      <DateField label={t('sanatorium.startDate')} value={start} onChange={setStart} testID="sch-start" />
      <FormInput label={t('sanatorium.s2.preferredTime')} value={time} onChangeText={setTime} placeholder="10:00" testID="sch-time" />
      <FormInput label={t('sanatorium.s2.sessionsCount')} value={count} onChangeText={setCount} keyboardType="number-pad" testID="sch-count" />
      <ErrorLine message={error} testID="sch-error" />
      {result && (
        <Text variant="body" tone="brand" testID="sch-result">
          {t('sanatorium.s2.scheduledResult', { n: result.n })}{result.left > 0 ? ` · ${t('sanatorium.s2.unscheduledResult', { n: result.left })}` : ''}
        </Text>
      )}
      {result ? <Button label={t('sanatorium.s2.close')} full variant="soft" onPress={onClose} /> : <Button testID="sch-save" label={t('sanatorium.s2.schedule')} full loading={save.isPending} onPress={() => void submit()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  session: { paddingVertical: 8, gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
