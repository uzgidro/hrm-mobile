// Doctor's desk: the day's appointments with quick actions (finish, refer, procedure, history),
// scan a guest's QR or type the guest ID — the resolved guest opens as a card with profile / history.
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Button, Card, EmptyState, PageHeader, Screen, Text } from '@/ui';
import { appointmentsQuery } from '../api/queries';
import { useResolveGuestQr } from '../api/mutations';
import { DayBar, Denied, QueryBlock, useSanAccess } from '../components/common';
import { DeskApptCard, FinishSheet, HistorySheet, ResolvedGuestSheet, type DeskAction } from '../components/DeskParts';
import { ProcedureSheet } from '../components/ProcedureSheet';
import { ReferSheet } from '../components/ReferSheet';
import { MyGuestsLink } from '../simple/components/MyGuestsLink';
import type { Appointment, QrResolveResult } from '../types';
import { sanErrorMessage, todayIso } from '../utils/sanatorium';
import { sortByTime } from '../utils/staffParity';

type Dlg = { kind: 'finish' | 'refer' | 'procedure'; appt: Appointment } | null;

export default function DoctorScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('doctor');
  const [day, setDay] = useState(todayIso());
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [history, setHistory] = useState<{ id: number; name: string } | null>(null);
  const [resolved, setResolved] = useState<QrResolveResult | null>(null);
  const q = useQuery(appointmentsQuery(day, true, allowed));
  const resolve = useResolveGuestQr();
  if (!allowed) return <Denied />;

  const find = async () => {
    if (code.trim().length < 6) return setError(t('sanatorium.codeShort'));
    try {
      const r = await resolve.mutateAsync(code);
      setCode('');
      setError(null);
      setResolved(r);
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const act = (a: DeskAction, appt: Appointment) => {
    if (a === 'history') setHistory({ id: appt.guest_id, name: appt.guest?.full_name ?? `#${appt.guest_id}` });
    else setDlg({ kind: a, appt });
  };

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-doctor-screen">
      <PageHeader title={t('sanatorium.nav.doctor')} />
      <View style={styles.stack}>
        {Platform.OS !== 'web' && (
          <Button testID="doctor-scan" label={t('sanatorium.scanQr')} icon="camera" size="lg" full onPress={() => router.push('/sanatorium-scan')} />
        )}
        <Card title={t('sanatorium.findById')} icon="search" tint="drop">
          <FormInput
            testID="doctor-code"
            label={t('sanatorium.guestId')}
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setError(null);
            }}
            placeholder={t('sanatorium.guestIdHint')}
          />
          {!!error && <Text variant="label" tone="danger" testID="doctor-code-error">{error}</Text>}
          <Button testID="doctor-find" label={t('sanatorium.find')} variant="soft" full loading={resolve.isPending} disabled={code.trim().length < 6} onPress={() => void find()} />
        </Card>
        <MyGuestsLink enabled />
        <DayBar value={day} onChange={setDay} />
        <QueryBlock query={q}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('sanatorium.noAppointments')} />
            ) : (
              <View style={styles.stack}>
                {sortByTime(items).map((a) => (
                  <DeskApptCard
                    key={a.id}
                    appt={a}
                    onAction={act}
                    onOpen={() => router.push({ pathname: '/sanatorium-appointment', params: { id: String(a.id), guestId: String(a.guest_id) } })}
                  />
                ))}
              </View>
            )
          }
        </QueryBlock>
      </View>
      <FinishSheet appt={dlg?.kind === 'finish' ? dlg.appt : null} onClose={() => setDlg(null)} />
      <ReferSheet appt={dlg?.kind === 'refer' ? dlg.appt : null} onClose={() => setDlg(null)} />
      <ProcedureSheet appt={dlg?.kind === 'procedure' ? dlg.appt : null} onClose={() => setDlg(null)} />
      <HistorySheet guest={history} onClose={() => setHistory(null)} />
      <ResolvedGuestSheet result={resolved} onClose={() => setResolved(null)} onHistory={setHistory} />
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: 12 } });
