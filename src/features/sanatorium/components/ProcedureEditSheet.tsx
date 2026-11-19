// Doctor / registrar edits a prescribed procedure (the nurse only ticks sessions elsewhere).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet } from '@/ui';
import { useUpdateProcedure } from '../api/mutations';
import type { ProcStatus, Procedure } from '../types';
import { sanErrorMessage } from '../utils/sanatorium';
import { ChoiceField, DateField, ErrorLine, optNull } from './forms';

export function ProcedureEditSheet({ proc, onClose }: { proc: Procedure | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!proc} onClose={onClose} title={t('sanatorium.editProcedure')} scroll>
      {proc && <ProcForm key={proc.id} proc={proc} onClose={onClose} />}
    </Sheet>
  );
}

function ProcForm({ proc, onClose }: { proc: Procedure; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useUpdateProcedure();
  const [name, setName] = useState(proc.name);
  const [total, setTotal] = useState(String(proc.sessions_total));
  const [done, setDone] = useState(String(proc.sessions_done));
  const [start, setStart] = useState<string | null>(proc.start_date);
  const [end, setEnd] = useState<string | null>(proc.end_date);
  const [timeText, setTimeText] = useState(proc.time_text ?? '');
  const [place, setPlace] = useState(proc.place ?? '');
  const [notes, setNotes] = useState(proc.notes ?? '');
  const [status, setStatus] = useState<ProcStatus>(proc.status);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const tt = Number.parseInt(total, 10);
    const dd = Number.parseInt(done, 10);
    if (name.trim().length < 2) return setError(t('sanatorium.nameShort'));
    if (!Number.isFinite(tt) || tt < 1 || tt > 100) return setError(t('sanatorium.sessionsRange'));
    if (!Number.isFinite(dd) || dd < 0 || dd > tt) return setError(t('sanatorium.errors.sessions_exceed'));
    try {
      await save.mutateAsync({
        id: proc.id,
        body: { name: name.trim(), sessions_total: tt, sessions_done: dd, start_date: start, end_date: end, time_text: optNull(timeText), place: optNull(place), notes: optNull(notes), status },
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="proc-edit-sheet">
      <FormInput label={t('sanatorium.procedureName')} value={name} onChangeText={setName} required testID="pe-name" />
      <FormInput label={t('sanatorium.sessionsTotal')} value={total} onChangeText={setTotal} keyboardType="number-pad" />
      <FormInput label={t('sanatorium.sessionsDone')} value={done} onChangeText={setDone} keyboardType="number-pad" testID="pe-done" />
      <DateField label={t('sanatorium.startDate')} value={start} onChange={setStart} />
      <DateField label={t('sanatorium.endDate')} value={end} onChange={setEnd} />
      <FormInput label={t('sanatorium.timeText')} value={timeText} onChangeText={setTimeText} />
      <FormInput label={t('sanatorium.place')} value={place} onChangeText={setPlace} />
      <FormInput label={t('sanatorium.notes')} value={notes} onChangeText={setNotes} multiline />
      <ChoiceField label={t('sanatorium.statusLabel')} value={status} options={(['active', 'done', 'cancelled'] as ProcStatus[]).map((s) => ({ value: s, label: t(`sanatorium.procStatus.${s}`) }))} onChange={(v) => v && setStatus(v)} />
      <ErrorLine message={error} testID="pe-error" />
      <Button testID="pe-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 2, paddingBottom: 8 } });
