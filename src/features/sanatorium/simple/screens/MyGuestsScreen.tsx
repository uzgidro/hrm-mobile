// Doctor / nurse: «Mening mehmonlarim» — in-house guests assigned to me; the doctor starts an exam in one tap.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, PageHeader, Screen, Text } from '@/ui';
import { useSingleFlight } from '../useSingleFlight';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../../components/common';
import { HistorySheet } from '../../components/DeskParts';
import { useAuthStore } from '@/store/authStore';
import { fmtDate, fmtDateTime, hasSanRole, sanErrorMessage } from '../../utils/sanatorium';
import { dietLabel } from '../../utils/staffParity';
import { myGuestsQuery, useStartExam } from '../api';
import type { MyGuest } from '../types';

export default function MyGuestsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('doctor', 'nurse');
  const q = useQuery(myGuestsQuery(allowed));
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-my-guests-screen">
      <PageHeader title={t('sanSimple.my.title')} />
      <QueryBlock query={q}>
        {(items) =>
          items == null ? (
            <EmptyState title={t('sanSimple.unavailable')} />
          ) : items.length === 0 ? (
            <EmptyState title={t('sanSimple.my.empty')} />
          ) : (
            <View style={styles.stack}>{items.map((g) => <GuestCard key={g.stay_id} g={g} />)}</View>
          )
        }
      </QueryBlock>
    </Screen>
  );
}

function GuestCard({ g }: { g: MyGuest }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const start = useStartExam();
  const [hist, setHist] = useState(false);
  const doctor = hasSanRole(user, 'doctor');
  const open = () => router.push({ pathname: '/sanatorium-guest', params: { id: String(g.guest.id) } });
  const flight = useSingleFlight();
  const begin = () =>
    flight.run(async () => {
      try {
        const a = await start.mutateAsync(g.stay_id);
        // `existing`: the visit that was already open is shown, not a new one.
        if (a.existing) toast.info(t('sanStaff.my.existing'));
        router.push({ pathname: '/sanatorium-appointment', params: { id: String(a.id), guestId: String(g.guest.id) } });
      } catch (e) {
        toast.error(sanErrorMessage(e, t('errors.generic')));
      }
    });
  return (
    <Card testID={`my-guest-${g.stay_id}`}>
      <Text variant="heading" onPress={open}>{g.guest.full_name}</Text>
      <PhoneLink phone={g.guest.phone} />
      <Text variant="caption" tone="muted">
        {[g.room ? `${t('sanatorium.room')} ${g.room.number}` : null, g.planned_to ? `${t('sanSimple.my.until')} ${fmtDate(g.planned_to)}` : null, dietLabel(g.diet, i18n.language) || null].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.chips}>
        {g.next_appointment ? <Badge label={`${t('sanSimple.my.next')}: ${fmtDateTime(g.next_appointment.scheduled_at)}`} tone="info" /> : <Badge label={t('sanSimple.my.noAppt')} tone="neutral" />}
        {doctor && g.has_exam === false && <Badge label={t('sanSimple.my.noExam')} tone="warning" />}
        {!!g.guest.allergies && <Badge testID={`my-allergy-${g.stay_id}`} label={`${t('sanStaff.my.allergy')}: ${g.guest.allergies}`} tone="danger" />}
      </View>
      <View style={styles.actions}>
        {doctor && (g.can_start_exam ?? !g.has_exam) && <Button testID={`my-start-${g.stay_id}`} label={t('sanSimple.my.start')} full loading={start.isPending || flight.pending} onPress={() => void begin()} />}
        {doctor && <Button testID={`my-history-${g.stay_id}`} label={t('sanStaff.desk.history')} variant="ghost" full onPress={() => setHist(true)} />}
        <Button testID={`my-open-${g.stay_id}`} label={t('sanSimple.my.open')} variant="soft" full onPress={open} />
      </View>
      <HistorySheet guest={hist ? { id: g.guest.id, name: g.guest.full_name } : null} onClose={() => setHist(false)} />
    </Card>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }, actions: { gap: 8, marginTop: 10 } });
