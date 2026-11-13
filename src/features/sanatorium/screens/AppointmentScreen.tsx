// One appointment: what was referred, and — for the doctor — the finish form (complaint,
// diagnosis, recommendation), referral and procedure. The appointment comes from the guest's
// card (there is no single-appointment endpoint), which also gives the medical history.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Card, EmptyState, PageHeader, Screen, SectionHeader, Text } from '@/ui';
import { useFinishAppointment, useNurseNotified } from '../api/mutations';
import { guestQuery } from '../api/queries';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import { ProcedureSheet } from '../components/ProcedureSheet';
import { ReferSheet } from '../components/ReferSheet';
import type { Appointment, GuestProfile } from '../types';
import { apptTone, fmtDateTime, hasSanRole, sanErrorMessage } from '../utils/sanatorium';

export default function AppointmentScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('doctor', 'nurse', 'registrar');
  const params = useLocalSearchParams<{ id?: string; guestId?: string }>();
  const id = Number(params.id ?? 0);
  const guestId = Number(params.guestId ?? 0);
  const q = useQuery({ ...guestQuery(guestId), enabled: allowed && guestId > 0 });
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-appointment-screen">
      <PageHeader title={t('sanatorium.appointment')} />
      <QueryBlock query={q}>
        {(p: GuestProfile) => {
          const appt = p.appointments?.find((a) => a.id === id);
          if (!appt) return <EmptyState title={t('sanatorium.notFound')} />;
          return <Detail key={appt.id} appt={{ ...appt, guest: p.guest }} history={(p.appointments ?? []).filter((a) => a.id !== id && a.status === 'done')} />;
        }}
      </QueryBlock>
    </Screen>
  );
}

function Detail({ appt, history }: { appt: Appointment; history: Appointment[] }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isDoctor = hasSanRole(user, 'doctor');
  const isNurse = hasSanRole(user, 'nurse');
  const finish = useFinishAppointment();
  const notified = useNurseNotified();
  const [complaint, setComplaint] = useState(appt.complaint ?? '');
  const [diagnosis, setDiagnosis] = useState(appt.diagnosis ?? '');
  const [recommendation, setRecommendation] = useState(appt.recommendation ?? '');
  const [error, setError] = useState<string | null>(null);
  const [refer, setRefer] = useState<Appointment | null>(null);
  const [proc, setProc] = useState<Appointment | null>(null);

  const save = async () => {
    try {
      await finish.mutateAsync({ id: appt.id, complaint: complaint.trim(), diagnosis: diagnosis.trim(), recommendation: recommendation.trim() });
      setError(null);
      toast.success(t('sanatorium.appointmentFinished'));
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const open = appt.status !== 'cancelled';

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="title" onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(appt.guest_id) } })}>
              {appt.guest?.full_name}
            </Text>
            <PhoneLink phone={appt.guest?.phone} />
          </View>
          <Badge label={t(`sanatorium.apptStatus.${appt.status}`)} tone={apptTone(appt.status)} />
        </View>
        <Text variant="body">{fmtDateTime(appt.scheduled_at)} · {appt.duration_min} {t('sanatorium.min')}</Text>
        {!!appt.specialty && <Text variant="caption" tone="muted">{appt.specialty}</Text>}
        {!!appt.referral_note && <Text variant="body" tone="muted">{appt.referral_note}</Text>}
        {isNurse && !isDoctor && open && !appt.nurse_notified_at && (
          <Button
            testID="appt-notified"
            label={t('sanatorium.notified')}
            icon="check"
            size="sm"
            loading={notified.isPending}
            onPress={() => notified.mutate(appt.id, { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) })}
          />
        )}
        {!!appt.nurse_notified_at && <Badge label={`${t('sanatorium.notifiedAt')} ${fmtDateTime(appt.nurse_notified_at)}`} tone="success" />}
      </Card>

      {isDoctor && open && (
        <>
          <SectionHeader title={t('sanatorium.conclusion')} />
          <Card>
            <FormInput label={t('sanatorium.complaint')} value={complaint} onChangeText={setComplaint} multiline testID="appt-complaint" />
            <FormInput label={t('sanatorium.diagnosis')} value={diagnosis} onChangeText={setDiagnosis} multiline testID="appt-diagnosis" />
            <FormInput label={t('sanatorium.recommendation')} value={recommendation} onChangeText={setRecommendation} multiline testID="appt-recommendation" />
            {!!error && <Text variant="label" tone="danger" testID="appt-error">{error}</Text>}
            <Button testID="appt-finish" label={appt.status === 'done' ? t('common.save') : t('sanatorium.finish')} full loading={finish.isPending} onPress={() => void save()} />
          </Card>
          <View style={styles.actions}>
            <Button testID="appt-refer" label={t('sanatorium.refer')} variant="soft" icon="arrowUp" onPress={() => setRefer(appt)} />
            <Button testID="appt-procedure" label={t('sanatorium.addProcedure')} variant="soft" icon="plus" onPress={() => setProc(appt)} />
          </View>
        </>
      )}
      {!isDoctor && appt.status === 'done' && (
        <Card title={t('sanatorium.conclusion')}>
          {!!appt.diagnosis && <Text variant="body">{appt.diagnosis}</Text>}
          {!!appt.recommendation && <Text variant="body" tone="muted">{appt.recommendation}</Text>}
        </Card>
      )}

      {isDoctor && history.length > 0 && (
        <>
          <SectionHeader title={t('sanatorium.history')} />
          <Card>
            {history.map((h) => (
              <View key={h.id} style={styles.hist}>
                <Text variant="label" tone="brand">{fmtDateTime(h.scheduled_at)}{h.specialty ? ` · ${h.specialty}` : ''}</Text>
                {!!h.complaint && <Text variant="body">{t('sanatorium.complaint')}: {h.complaint}</Text>}
                {!!h.diagnosis && <Text variant="body">{t('sanatorium.diagnosis')}: {h.diagnosis}</Text>}
                {!!h.recommendation && <Text variant="body" tone="muted">{t('sanatorium.recommendation')}: {h.recommendation}</Text>}
              </View>
            ))}
          </Card>
        </>
      )}
      <ReferSheet appt={refer} onClose={() => setRefer(null)} />
      <ProcedureSheet appt={proc} onClose={() => setProc(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  hist: { paddingVertical: 8, gap: 2 },
});
