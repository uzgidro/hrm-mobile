// Book an appointment for a stay (specialty or a particular doctor, date-time, duration, note).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, SelectField, Sheet } from '@/ui';
import { useCreateAppointment } from '../api/mutations';
import { specialtiesQuery, staffRoleQuery } from '../api/queries';
import { fmtDateTime, sanErrorMessage, toLocalIso } from '../utils/sanatorium';
import { ChoiceField, ErrorLine, opt } from './forms';

/** `stayId` null = closed. */
export function AppointmentSheet({ stayId, onClose }: { stayId: number | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={stayId != null} onClose={onClose} title={t('sanatorium.newAppointment')} scroll>
      {stayId != null && <AppointmentForm key={stayId} stayId={stayId} onClose={onClose} />}
    </Sheet>
  );
}

function AppointmentForm({ stayId, onClose }: { stayId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateAppointment();
  const specialties = useQuery(specialtiesQuery());
  const doctors = useQuery(staffRoleQuery('doctor'));
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [when, setWhen] = useState(() => toLocalIso(dayjs().add(1, 'day').hour(10).minute(0).second(0)));
  const [pickWhen, setPickWhen] = useState(false);
  const [duration, setDuration] = useState('20');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const d = Number.parseInt(duration, 10);
    if (!specialtyId && !doctorId) return setError(t('sanatorium.errors.doctor_or_specialty_required'));
    if (!Number.isFinite(d) || d < 5 || d > 240) return setError(t('sanatorium.durationRange'));
    try {
      await create.mutateAsync({
        stay_id: stayId,
        ...(specialtyId ? { specialty_id: specialtyId } : {}),
        ...(doctorId ? { doctor_staff_id: doctorId } : {}),
        scheduled_at: when,
        duration_min: d,
        ...(opt(note) ? { referral_note: opt(note) } : {}),
      });
      toast.success(t('sanatorium.appointmentCreated'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="appt-create-sheet">
      <ChoiceField
        label={t('sanatorium.specialty')}
        value={specialtyId}
        noneLabel={t('sanatorium.none')}
        options={(specialties.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
        onChange={setSpecialtyId}
        loading={specialties.isPending}
        testID="ac-specialty"
      />
      <ChoiceField
        label={t('sanatorium.doctor')}
        value={doctorId}
        noneLabel={t('sanatorium.anyDoctor')}
        options={(doctors.data ?? []).filter((d) => !specialtyId || d.specialty_id === specialtyId).map((d) => ({ value: d.id, label: d.full_name, sub: d.specialty ?? undefined }))}
        onChange={setDoctorId}
        loading={doctors.isPending}
        testID="ac-doctor"
      />
      <SelectField label={t('sanatorium.dateTime')} value={fmtDateTime(when)} icon="calendar" onPress={() => setPickWhen(true)} testID="ac-when" />
      <FormInput label={t('sanatorium.duration')} value={duration} onChangeText={setDuration} keyboardType="number-pad" testID="ac-duration" />
      <FormInput label={t('sanatorium.referralNote')} value={note} onChangeText={setNote} multiline testID="ac-note" />
      <ErrorLine message={error} testID="ac-error" />
      <Button testID="ac-save" label={t('sanatorium.newAppointment')} full loading={create.isPending} onPress={() => void submit()} />
      <DateTimePickerModal visible={pickWhen} value={when} title={t('sanatorium.dateTime')} onConfirm={(iso) => setWhen(toLocalIso(iso))} onClose={() => setPickWhen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 4, paddingBottom: 8 } });
