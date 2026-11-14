// Nurse's desk: the day's appointments of her guests (call, «notified») and active procedures
// where she ticks off a session.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, Screen, Segmented, Text } from '@/ui';
import { useNurseNotified, useUpdateProcedure } from '../api/mutations';
import { appointmentsQuery, proceduresQuery } from '../api/queries';
import { DayBar, Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import type { Appointment, Procedure } from '../types';
import { apptTone, fmtDate, fmtDateTime, fmtTime, sanErrorMessage, todayIso } from '../utils/sanatorium';

export default function NurseScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('nurse');
  const [seg, setSeg] = useState<'appointments' | 'procedures'>('appointments');
  const [day, setDay] = useState(todayIso());
  const appts = useQuery(appointmentsQuery(day, false, allowed && seg === 'appointments'));
  const procs = useQuery(proceduresQuery(allowed && seg === 'procedures'));
  if (!allowed) return <Denied />;
  const cur = seg === 'appointments' ? appts : procs;
  return (
    <Screen refreshing={cur.isRefetching} onRefresh={() => void cur.refetch()} testID="sanatorium-nurse-screen">
      <PageHeader title={t('sanatorium.nav.nurse')} />
      <Segmented
        testID="nurse-seg"
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'appointments', label: t('sanatorium.appointments') },
          { value: 'procedures', label: t('sanatorium.procedures') },
        ]}
      />
      <View style={styles.body}>
        {seg === 'appointments' ? (
          <>
            <DayBar value={day} onChange={setDay} />
            <QueryBlock query={appts}>
              {(items) =>
                items.length === 0 ? (
                  <EmptyState title={t('sanatorium.noAppointments')} />
                ) : (
                  <View style={styles.stack}>{items.map((a) => <NurseAppt key={a.id} a={a} />)}</View>
                )
              }
            </QueryBlock>
          </>
        ) : (
          <QueryBlock query={procs}>
            {(items) =>
              items.length === 0 ? (
                <EmptyState title={t('sanatorium.noProcedures')} />
              ) : (
                <View style={styles.stack}>{items.map((p) => <ProcCard key={p.id} p={p} />)}</View>
              )
            }
          </QueryBlock>
        )}
      </View>
    </Screen>
  );
}

function NurseAppt({ a }: { a: Appointment }) {
  const { t } = useTranslation();
  const notified = useNurseNotified();
  const done = !!a.nurse_notified_at;
  return (
    <Card testID={`nurse-appt-${a.id}`}>
      <View style={styles.head}>
        <Text variant="heading" tone="brand">{fmtTime(a.scheduled_at)}</Text>
        <Text
          variant="heading"
          style={styles.flex}
          numberOfLines={2}
          onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(a.guest_id) } })}
        >
          {a.guest?.full_name ?? `#${a.guest_id}`}
        </Text>
        <Badge label={t(`sanatorium.apptStatus.${a.status}`)} tone={apptTone(a.status)} />
      </View>
      <Text variant="caption" tone="muted">
        {[a.specialty, a.room_number ? `${t('sanatorium.room')} ${a.room_number}` : null].filter(Boolean).join(' · ')}
      </Text>
      <PhoneLink phone={a.guest?.phone} />
      <View style={styles.actions}>
        {done ? (
          <Badge label={`${t('sanatorium.notifiedAt')} ${fmtDateTime(a.nurse_notified_at)}`} tone="success" />
        ) : (
          a.status === 'scheduled' && (
            <Button
              testID="nurse-notified"
              label={t('sanatorium.notified')}
              icon="check"
              size="sm"
              loading={notified.isPending}
              onPress={() => notified.mutate(a.id, { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) })}
            />
          )
        )}
      </View>
    </Card>
  );
}

function ProcCard({ p }: { p: Procedure }) {
  const { t } = useTranslation();
  const update = useUpdateProcedure();
  const left = p.sessions_total - p.sessions_done;
  const tick = () => {
    const next = p.sessions_done + 1;
    update.mutate(
      { id: p.id, body: { sessions_done: next, ...(next >= p.sessions_total ? { status: 'done' } : {}) } },
      { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) },
    );
  };
  return (
    <Card testID={`proc-${p.id}`}>
      <Text variant="heading">{p.name}</Text>
      <Text variant="body" onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(p.guest_id) } })}>
        {p.guest?.full_name ?? `#${p.guest_id}`}
      </Text>
      <PhoneLink phone={p.guest?.phone} />
      <Text variant="caption" tone="muted">
        {[p.time_text, p.place, p.start_date ? fmtDate(p.start_date) : null].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.progress}>
        <ProgressBar value={p.sessions_total ? p.sessions_done / p.sessions_total : 0} />
        <Text variant="caption" tone="muted">{p.sessions_done}/{p.sessions_total} {t('sanatorium.sessions')}</Text>
      </View>
      {left > 0 && <Button testID="proc-tick" label={t('sanatorium.plusSession')} icon="plus" size="sm" loading={update.isPending} onPress={tick} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { marginTop: 12 },
  stack: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  actions: { marginTop: 8, flexDirection: 'row' },
  progress: { marginVertical: 8, gap: 4 },
});
