// Procedure schedule: the day board (per room: mark done / missed, reschedule, cancel) and the
// «schedule this procedure» sheet. Used by the schedule screen and the nurse screen.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ProgressBar, SelectField, Sheet, Text } from '@/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { Tone } from '@/ui/Chip';
import {
  boardQuery, procRoomsQuery, useCancelSession, useMarkSession, useRescheduleSession, useScheduleProcedure,
  type ProcSession, type SessionStatus,
} from '../../api/sections2';
import { DayBar, QueryBlock } from '../common';
import { ChoiceField, DateField, ErrorLine } from '../forms';
import { fmtDateTime, fmtTime, sanErrorMessage, toLocalIso, todayIso } from '../../utils/sanatorium';
import { moveBody, remainingSessions, scheduleBody, scheduleStart, slotUsage } from '../../utils/sections2';

const TONE: Record<SessionStatus, Tone> = { planned: 'info', done: 'success', missed: 'warning', cancelled: 'danger' };

export function ScheduleBoard({ canAct = true }: { canAct?: boolean }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [day, setDay] = useState(todayIso());
  const [roomId, setRoomId] = useState<number | null>(null);
  const rooms = useQuery(procRoomsQuery(false));
  const q = useQuery(boardQuery(day, true, roomId));
  const [moving, setMoving] = useState<ProcSession | null>(null);
  return (
    <View testID="schedule-board">
      <DayBar value={day} onChange={setDay} />
      <ChoiceField label={t('sanCatalog.sched.room')} value={roomId} noneLabel={t('sanCatalog.sched.allRooms')} options={(rooms.data ?? []).map((r) => ({ value: r.id, label: r.name }))} onChange={setRoomId} loading={rooms.isPending} testID="board-room-filter" />
      <QueryBlock query={q}>
        {(b) => (
          <View style={styles.stack}>
            {b.rooms.length === 0 && b.unassigned.length === 0 && <EmptyState title={t('sanatorium.s2.noSessions')} />}
            {b.rooms.map((r) => (
              <Card key={r.room.id} title={r.room.name} icon="board" tint="violet" testID={`board-room-${r.room.id}`}>
                <View style={styles.counts}>
                  <Badge label={`${t('sanatorium.s2.sessionStatus.planned')}: ${r.counts.planned}`} tone="info" />
                  <Badge label={`${t('sanatorium.s2.sessionStatus.done')}: ${r.counts.done}`} tone="success" />
                  <Badge label={`${t('sanatorium.s2.sessionStatus.missed')}: ${r.counts.missed}`} tone={r.counts.missed > 0 ? 'warning' : 'neutral'} testID={`board-room-${r.room.id}-missed`} />
                </View>
                <View style={styles.slotRow} testID={`board-room-${r.room.id}-slots`}>
                  <View style={styles.flex}><ProgressBar value={slotUsage(r.capacity_slots, r.free_slots)} color={r.free_slots === 0 ? c.danger : c.brand} /></View>
                  <Text variant="caption" tone="muted">{t('sanCatalog.sched.freeSlots', { free: r.free_slots, total: r.capacity_slots })}</Text>
                </View>
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

/** Optional note (max 255) asked before marking a session missed or cancelling it. */
function NoteSheet({ open, title, confirmLabel, pending, onClose, onSubmit }: {
  open: boolean; title: string; confirmLabel: string; pending: boolean; onClose: () => void; onSubmit: (note: string) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  return (
    <Sheet visible={open} onClose={onClose} title={title}>
      {open && (
        <View testID="session-note-sheet">
          <FormInput label={t('sanCatalog.sched.note')} value={note} onChangeText={setNote} maxLength={255} multiline testID="session-note" />
          <Button testID="session-note-ok" label={confirmLabel} full loading={pending} onPress={() => onSubmit(note.trim())} />
        </View>
      )}
    </Sheet>
  );
}

function SessionRow({ s, canAct, onMove }: { s: ProcSession; canAct: boolean; onMove: () => void }) {
  const { t } = useTranslation();
  const mark = useMarkSession();
  const cancel = useCancelSession();
  const [ask, setAsk] = useState<'missed' | 'cancel' | null>(null);
  const onError = (e: unknown) => toast.error(sanErrorMessage(e, t('errors.generic')));
  const set = (status: 'done' | 'missed' | 'planned', note?: string) => mark.mutate({ id: s.id, status, ...(note ? { note } : {}) }, { onError, onSuccess: () => setAsk(null) });
  const doCancel = (note: string) => cancel.mutate({ id: s.id, ...(note ? { note } : {}) }, { onError, onSuccess: () => setAsk(null) });
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
      {!!s.note && <Text variant="caption" tone="subtle" testID={`session-${s.id}-note`}>{s.note}</Text>}
      {canAct && s.status !== 'cancelled' && (
        <View style={styles.actions}>
          {s.status === 'planned' && <Button testID={`session-${s.id}-done`} label={t('sanatorium.s2.markDone')} size="sm" icon="check" loading={mark.isPending} onPress={() => set('done')} />}
          {s.status === 'planned' && <Button testID={`session-${s.id}-missed`} label={t('sanatorium.s2.markMissed')} size="sm" variant="soft" onPress={() => setAsk('missed')} />}
          {s.status !== 'planned' && <Button testID={`session-${s.id}-undo`} label={t('sanatorium.s2.undo')} size="sm" variant="soft" loading={mark.isPending} onPress={() => set('planned')} />}
          {s.status === 'planned' && <Button testID={`session-${s.id}-move`} label={t('sanatorium.s2.reschedule')} size="sm" variant="soft" onPress={onMove} />}
          {s.status === 'planned' && <Button testID={`session-${s.id}-cancel`} label={t('sanatorium.s2.cancelSession')} size="sm" variant="dangerGhost" onPress={() => setAsk('cancel')} />}
        </View>
      )}
      <NoteSheet
        open={ask === 'missed'}
        title={t('sanatorium.s2.markMissed')}
        confirmLabel={t('sanatorium.s2.markMissed')}
        pending={mark.isPending}
        onClose={() => setAsk(null)}
        onSubmit={(note) => set('missed', note)}
      />
      <NoteSheet
        open={ask === 'cancel'}
        title={t('sanatorium.s2.cancelSession')}
        confirmLabel={t('sanatorium.s2.cancelSession')}
        pending={cancel.isPending}
        onClose={() => setAsk(null)}
        onSubmit={doCancel}
      />
    </View>
  );
}

function MoveForm({ s, onClose }: { s: ProcSession; onClose: () => void }) {
  const { t } = useTranslation();
  const move = useRescheduleSession();
  const rooms = useQuery(procRoomsQuery(false));
  const [at, setAt] = useState(s.starts_at);
  // null = keep the current room; the room is sent only when another one is picked.
  const [roomId, setRoomId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    try {
      await move.mutateAsync({ id: s.id, body: moveBody(toLocalIso(at), roomId) });
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
      <ChoiceField label={t('sanatorium.s2.procRoom')} value={roomId} noneLabel={`${t('sanCatalog.sched.noChange')}${s.room ? ` (${s.room.name})` : ''}`} options={(rooms.data ?? []).filter((r) => r.id !== s.room?.id).map((r) => ({ value: r.id, label: r.name }))} onChange={setRoomId} loading={rooms.isPending} testID="move-room" />
      <ErrorLine message={error} testID="move-error" />
      <Button testID="move-save" label={t('common.save')} full loading={move.isPending} onPress={() => void submit()} />
    </View>
  );
}

/** «Place the remaining sessions of this procedure into a procedure room's free slots». */
export type ScheduleProcedure = { id: number; name: string; sessions_total: number; sessions_done: number; start_date?: string | null };
export function ScheduleProcedureSheet({ procedure, onClose }: { procedure: ScheduleProcedure | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!procedure} onClose={onClose} title={t('sanatorium.s2.scheduleProcedure')} scroll>
      {procedure && <ScheduleForm key={procedure.id} p={procedure} onClose={onClose} />}
    </Sheet>
  );
}

function ScheduleForm({ p, onClose }: { p: ScheduleProcedure; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useScheduleProcedure();
  const rooms = useQuery(procRoomsQuery(false));
  const remaining = remainingSessions(p);
  const today = todayIso();
  const [roomId, setRoomId] = useState<number | null>(null);
  const [start, setStart] = useState<string | null>(scheduleStart(p, today));
  const [time, setTime] = useState('');
  const [count, setCount] = useState(String(remaining));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ n: number; left: number } | null>(null);
  const submit = async () => {
    const r = scheduleBody({ roomId, start, time, count }, remaining, today);
    if (!r.ok) return setError(t(r.error));
    try {
      const out = await save.mutateAsync({ procedureId: p.id, body: r.body });
      setResult({ n: out.scheduled.length, left: out.unscheduled });
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
      <FormInput label={`${t('sanatorium.s2.sessionsCount')} (${t('sanCatalog.sched.sessionsHint', { n: remaining })})`} value={count} onChangeText={setCount} keyboardType="number-pad" testID="sch-count" />
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
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  session: { paddingVertical: 8, gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
