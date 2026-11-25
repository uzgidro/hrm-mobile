// Procedure schedule: day board (registrar, doctor, nurse) and the procedure rooms catalog (registrar CRUD).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, Segmented, Sheet, Text } from '@/ui';
import { allSpecialtiesQuery } from '../../api/queries';
import { procRoomsQuery, useDeleteProcRoom, useSaveProcRoom, type ProcRoom } from '../../api/sections2';
import { QueryBlock, useSanReadOnly } from '../../components/common';
import { ChoiceField, ErrorLine, SwitchRow } from '../../components/forms';
import { ChipWrap, FieldLabel, RowTools, SectionScreen, useConfirmDelete, useWeekdayNames } from '../../components/sections2/kit';
import { ScheduleBoard } from '../../components/sections2/Schedule';
import { emptyProcRoomDraft, procRoomBody, toggleValue, weekdaysLabel, type ProcRoomDraft } from '../../utils/sections2';
import { hasSanRole, sanErrorMessage } from '../../utils/sanatorium';
import { useAuthStore } from '@/store/authStore';

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const registrar = hasSanRole(user, 'registrar');
  const readOnly = useSanReadOnly();
  const [seg, setSeg] = useState<'board' | 'rooms'>('board');
  const [edit, setEdit] = useState<ProcRoom | 'new' | null>(null);
  const q = useQuery(procRoomsQuery(true, registrar && seg === 'rooms'));
  return (
    <SectionScreen
      title={t('sanatorium.s2.schedule')}
      feature="procedure_schedule"
      roles={['registrar', 'doctor', 'nurse']}
      testID="san-schedule-screen"
      refreshing={seg === 'rooms' ? q.isRefetching : false}
      onRefresh={seg === 'rooms' ? () => void q.refetch() : undefined}
      onAdd={registrar && seg === 'rooms' ? () => setEdit('new') : undefined}
      addLabel={t('sanatorium.s2.addProcRoom')}
    >
      {registrar && <Segmented testID="schedule-seg" value={seg} onChange={setSeg} options={[{ value: 'board', label: t('sanatorium.s2.board') }, { value: 'rooms', label: t('sanatorium.s2.procRooms') }]} />}
      {seg === 'board' ? <ScheduleBoard canAct={!readOnly} /> : <Rooms q={q} onEdit={setEdit} />}
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('sanatorium.s2.addProcRoom') : t('sanatorium.s2.editProcRoom')} scroll>
        {edit && <RoomForm key={edit === 'new' ? 'new' : edit.id} room={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </SectionScreen>
  );
}

function Rooms({ q, onEdit }: { q: ReturnType<typeof useQuery<ProcRoom[]>>; onEdit: (r: ProcRoom) => void }) {
  const { t } = useTranslation();
  const names = useWeekdayNames();
  const del = useDeleteProcRoom();
  const confirmDelete = useConfirmDelete();
  return (
    <QueryBlock query={q}>
      {(list) =>
        list.length === 0 ? (
          <EmptyState title={t('sanatorium.s2.noProcRooms')} />
        ) : (
          <View style={styles.stack}>
            {list.map((r) => (
              <Card key={r.id} testID={`proc-room-${r.id}`}>
                <View style={styles.head}>
                  <Text variant="heading" style={styles.flex}>{r.name}</Text>
                  {!r.is_active && <Badge label={t('sanatorium.s2.inactive')} tone="warning" />}
                </View>
                <Text variant="caption" tone="muted">
                  {[r.specialty?.name, `${r.work_from.slice(0, 5)}–${r.work_to.slice(0, 5)}`, `${r.slot_minutes} ${t('sanatorium.min')}`, `${t('sanatorium.s2.capacity')}: ${r.capacity}`, weekdaysLabel(r.weekdays, names, t('sanatorium.s2.everyDay'))].filter(Boolean).join(' · ')}
                </Text>
                <RowTools testID={`proc-room-tools-${r.id}`} onEdit={() => onEdit(r)} onDelete={() => void confirmDelete(t('sanatorium.s2.deleteProcRoom'), () => del.mutateAsync(r.id))} />
              </Card>
            ))}
          </View>
        )
      }
    </QueryBlock>
  );
}

function RoomForm({ room, onClose }: { room: ProcRoom | null; onClose: () => void }) {
  const { t } = useTranslation();
  const names = useWeekdayNames();
  const save = useSaveProcRoom();
  const specs = useQuery(allSpecialtiesQuery());
  const [d, setD] = useState<ProcRoomDraft>(() =>
    room
      ? { name: room.name, specialtyId: room.specialty_id, capacity: String(room.capacity), slot: String(room.slot_minutes), workFrom: room.work_from.slice(0, 5), workTo: room.work_to.slice(0, 5), weekdays: room.weekdays, description: room.description ?? '', active: room.is_active }
      : emptyProcRoomDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<ProcRoomDraft>) => setD((x) => ({ ...x, ...p }));
  const submit = async () => {
    const r = procRoomBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: room?.id, body: r.body });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="proc-room-form">
      <FormInput label={t('sanatorium.s2.procRoomName')} value={d.name} onChangeText={(v) => set({ name: v })} required testID="pr-name" />
      <ChoiceField label={t('sanatorium.specialty')} value={d.specialtyId} noneLabel={t('sanatorium.none')} options={(specs.data ?? []).filter((s) => s.kind === 'procedure' && s.is_active).map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => set({ specialtyId: v })} loading={specs.isPending} testID="pr-specialty" />
      <FormInput label={t('sanatorium.s2.capacity')} value={d.capacity} onChangeText={(v) => set({ capacity: v })} keyboardType="number-pad" testID="pr-capacity" />
      <FormInput label={t('sanatorium.s2.slotMinutes')} value={d.slot} onChangeText={(v) => set({ slot: v })} keyboardType="number-pad" testID="pr-slot" />
      <FormInput label={t('sanatorium.s2.workFrom')} value={d.workFrom} onChangeText={(v) => set({ workFrom: v })} placeholder="09:00" testID="pr-from" />
      <FormInput label={t('sanatorium.s2.workTo')} value={d.workTo} onChangeText={(v) => set({ workTo: v })} placeholder="18:00" testID="pr-to" />
      <FieldLabel>{t('sanatorium.s2.weekdays')}</FieldLabel>
      <ChipWrap options={names.map((n, i) => ({ value: i, label: n }))} isOn={(v) => d.weekdays.includes(v)} onToggle={(v) => set({ weekdays: toggleValue(d.weekdays, v) })} testID="pr-days" />
      <FormInput label={t('sanatorium.s2.description')} value={d.description} onChangeText={(v) => set({ description: v })} multiline />
      <SwitchRow label={t('sanatorium.s2.active')} value={d.active} onChange={(v) => set({ active: v })} testID="pr-active" />
      <ErrorLine message={error} testID="pr-error" />
      <Button testID="pr-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, flex: { flex: 1 }, head: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
