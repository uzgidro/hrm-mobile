// Move a scheduled appointment (date-time, duration, doctor). Never touches the status.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, SelectField, Sheet } from '@/ui';
import { usePatchAppointment } from '../api/mutations';
import { staffRoleQuery } from '../api/queries';
import type { Appointment } from '../types';
import { fmtDateTime, sanErrorMessage, toLocalIso } from '../utils/sanatorium';
import { ChoiceField, ErrorLine } from './forms';

export function RescheduleSheet({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!appt} onClose={onClose} title={t('sanatorium.reschedule')} scroll>
      {appt && <Form key={appt.id} appt={appt} onClose={onClose} />}
    </Sheet>
  );
}

function Form({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { t } = useTranslation();
  const patch = usePatchAppointment();
  const doctors = useQuery(staffRoleQuery('doctor'));
  const [when, setWhen] = useState(appt.scheduled_at);
  const [pick, setPick] = useState(false);
  const [duration, setDuration] = useState(String(appt.duration_min));
  const [doctorId, setDoctorId] = useState<number | null>(appt.doctor?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const d = Number.parseInt(duration, 10);
    if (!Number.isFinite(d) || d < 5 || d > 240) return setError(t('sanatorium.durationRange'));
    try {
      await patch.mutateAsync({ id: appt.id, body: { scheduled_at: toLocalIso(when), duration_min: d, ...(doctorId ? { doctor_staff_id: doctorId } : {}) } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="reschedule-sheet">
      <SelectField label={t('sanatorium.dateTime')} value={fmtDateTime(when)} icon="calendar" onPress={() => setPick(true)} testID="rs-when" />
      <FormInput label={t('sanatorium.duration')} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
      <ChoiceField
        label={t('sanatorium.doctor')}
        value={doctorId}
        noneLabel={t('sanatorium.anyDoctor')}
        options={(doctors.data ?? []).map((d) => ({ value: d.id, label: d.full_name, sub: d.specialty ?? undefined }))}
        onChange={setDoctorId}
        loading={doctors.isPending}
      />
      <ErrorLine message={error} testID="rs-error" />
      <Button testID="rs-save" label={t('common.save')} full loading={patch.isPending} onPress={() => void submit()} />
      <DateTimePickerModal visible={pick} value={when} title={t('sanatorium.dateTime')} onConfirm={(iso) => setWhen(toLocalIso(iso))} onClose={() => setPick(false)} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 4, paddingBottom: 8 } });
