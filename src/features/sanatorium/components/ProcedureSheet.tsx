// Prescribe a procedure (course of sessions) for the guest's stay.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useCreateProcedure } from '../api/mutations';
import type { Appointment } from '../types';
import { fmtDate, sanErrorMessage, todayIso } from '../utils/sanatorium';
import { endBeforeStart } from '../utils/staffParity';

export function ProcedureSheet({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!appt} onClose={onClose} title={t('sanatorium.addProcedure')} scroll>
      {appt && <ProcedureForm key={appt.id} appt={appt} onClose={onClose} />}
    </Sheet>
  );
}

// Mounted per opening, so every field starts fresh.
function ProcedureForm({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateProcedure();
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState('5');
  const [start, setStart] = useState(todayIso());
  const [timeText, setTimeText] = useState('');
  const [place, setPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [end, setEnd] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [pickEnd, setPickEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const n = Number.parseInt(sessions, 10);
    if (name.trim().length < 2) return setError(t('sanatorium.nameShort'));
    if (!Number.isFinite(n) || n < 1 || n > 100) return setError(t('sanatorium.sessionsRange'));
    if (endBeforeStart(start, end)) return setError(t('sanStaff.desk.endBeforeStart'));
    try {
      await create.mutateAsync({
        stay_id: appt.stay_id,
        appointment_id: appt.id,
        name: name.trim(),
        sessions_total: n,
        start_date: start,
        ...(end ? { end_date: end } : {}),
        ...(timeText.trim() ? { time_text: timeText.trim() } : {}),
        ...(place.trim() ? { place: place.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success(t('sanatorium.procedureAdded'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <>
      <View style={styles.body} testID="procedure-sheet">
        <FormInput label={t('sanatorium.procedureName')} value={name} onChangeText={setName} required maxLength={255} testID="proc-name" />
        <FormInput label={t('sanatorium.sessionsTotal')} value={sessions} onChangeText={setSessions} keyboardType="number-pad" required testID="proc-sessions" />
        <SelectField label={t('sanatorium.startDate')} value={fmtDate(start)} icon="calendar" onPress={() => setPickDate(true)} testID="proc-start" />
        <SelectField label={t('sanatorium.endDate')} value={end ? fmtDate(end) : undefined} placeholder="—" icon="calendar" onPress={() => setPickEnd(true)} testID="proc-end" />
        <FormInput label={t('sanatorium.timeText')} value={timeText} onChangeText={setTimeText} placeholder="09:00" maxLength={50} />
        <FormInput label={t('sanatorium.place')} value={place} onChangeText={setPlace} maxLength={100} />
        <FormInput label={t('sanatorium.notes')} value={notes} onChangeText={setNotes} multiline maxLength={2000} />
        {!!error && <Text variant="label" tone="danger" testID="proc-error">{error}</Text>}
        <Button testID="proc-save" label={t('common.save')} full loading={create.isPending} onPress={() => void submit()} />
      </View>
      <DatePickerModal visible={pickDate} value={start} title={t('sanatorium.startDate')} onConfirm={setStart} onClose={() => setPickDate(false)} />
      <DatePickerModal visible={pickEnd} value={end ?? start} title={t('sanatorium.endDate')} onConfirm={setEnd} onClose={() => setPickEnd(false)} />
    </>
  );
}

const styles = StyleSheet.create({ body: { gap: 4, paddingBottom: 8 } });
