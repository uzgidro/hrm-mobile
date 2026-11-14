// Referral («yo'llanma»): send the guest on to another specialty / doctor at a given time.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { toast } from '@/lib/toast';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useReferAppointment } from '../api/mutations';
import { doctorsQuery, specialtiesQuery } from '../api/queries';
import type { Appointment } from '../types';
import { fmtDateTime, sanErrorMessage, toLocalIso } from '../utils/sanatorium';

export function ReferSheet({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!appt} onClose={onClose} title={t('sanatorium.refer')} scroll>
      {appt && <ReferForm key={appt.id} appt={appt} onClose={onClose} />}
    </Sheet>
  );
}

// Mounted per opening, so every field starts fresh.
function ReferForm({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { t } = useTranslation();
  const specialties = useQuery(specialtiesQuery());
  const doctors = useQuery(doctorsQuery());
  const refer = useReferAppointment();
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [when, setWhen] = useState<string>(() => toLocalIso(dayjs().add(1, 'day').hour(10).minute(0).second(0)));
  const [note, setNote] = useState('');
  const [pick, setPick] = useState<'specialty' | 'doctor' | 'when' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doctorOptions = useMemo(
    () =>
      (doctors.data ?? [])
        .filter((d) => !specialtyId || d.specialty_id === specialtyId)
        .map((d) => ({ value: d.id, label: d.full_name ?? `#${d.id}`, subLabel: d.specialty ?? undefined })),
    [doctors.data, specialtyId],
  );
  const specName = specialties.data?.find((s) => s.id === specialtyId)?.name;
  const docName = doctors.data?.find((d) => d.id === doctorId)?.full_name;

  const submit = async () => {
    if (!specialtyId && !doctorId) return setError(t('sanatorium.errors.doctor_or_specialty_required'));
    try {
      await refer.mutateAsync({
        id: appt.id,
        body: {
          ...(specialtyId ? { specialty_id: specialtyId } : {}),
          ...(doctorId ? { doctor_staff_id: doctorId } : {}),
          scheduled_at: when,
          duration_min: 20,
          ...(note.trim() ? { referral_note: note.trim() } : {}),
        },
      });
      toast.success(t('sanatorium.referred'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <>
      <View style={styles.body} testID="refer-sheet">
        <SelectField label={t('sanatorium.specialty')} value={specName} placeholder={t('sanatorium.choose')} onPress={() => setPick('specialty')} testID="refer-specialty" />
        <SelectField label={t('sanatorium.doctor')} value={docName} placeholder={t('sanatorium.anyDoctor')} onPress={() => setPick('doctor')} testID="refer-doctor" />
        <SelectField label={t('sanatorium.dateTime')} value={fmtDateTime(when)} icon="calendar" onPress={() => setPick('when')} testID="refer-when" />
        <FormInput label={t('sanatorium.referralNote')} value={note} onChangeText={setNote} multiline testID="refer-note" />
        {!!error && <Text variant="label" tone="danger" testID="refer-error">{error}</Text>}
        <Button testID="refer-save" label={t('sanatorium.refer')} full loading={refer.isPending} onPress={() => void submit()} />
      </View>
      <PickerModal
        visible={pick === 'specialty'}
        title={t('sanatorium.specialty')}
        options={(specialties.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
        loading={specialties.isPending}
        selected={specialtyId}
        avatars={false}
        onClose={() => setPick(null)}
        onSelect={(v) => {
          setSpecialtyId(v);
          setDoctorId(null);
          setPick(null);
        }}
      />
      <PickerModal
        visible={pick === 'doctor'}
        title={t('sanatorium.doctor')}
        options={doctorOptions}
        loading={doctors.isPending}
        selected={doctorId}
        onClose={() => setPick(null)}
        onSelect={(v) => {
          setDoctorId(v);
          setPick(null);
        }}
      />
      <DateTimePickerModal
        visible={pick === 'when'}
        value={when}
        title={t('sanatorium.dateTime')}
        onConfirm={(iso) => setWhen(toLocalIso(iso))}
        onClose={() => setPick(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({ body: { gap: 6, paddingBottom: 8 } });
