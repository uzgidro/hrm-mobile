// Doctor's desk: the day's appointments, scan a guest's QR or type the guest ID.
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Button, Card, EmptyState, PageHeader, Screen, Text } from '@/ui';
import { appointmentsQuery } from '../api/queries';
import { useResolveGuestQr } from '../api/mutations';
import { ApptRow } from '../components/ApptRow';
import { DayBar, Denied, QueryBlock, useSanAccess } from '../components/common';
import { sanErrorMessage, todayIso } from '../utils/sanatorium';

export default function DoctorScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('doctor');
  const [day, setDay] = useState(todayIso());
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const q = useQuery(appointmentsQuery(day, true, allowed));
  const resolve = useResolveGuestQr();
  if (!allowed) return <Denied />;

  const find = async () => {
    if (code.trim().length < 6) return setError(t('sanatorium.codeShort'));
    try {
      const r = await resolve.mutateAsync(code);
      setCode('');
      setError(null);
      router.push({ pathname: '/sanatorium-guest', params: { id: String(r.guest.id) } });
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
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
          <Button testID="doctor-find" label={t('sanatorium.find')} variant="soft" full loading={resolve.isPending} onPress={() => void find()} />
        </Card>
        <DayBar value={day} onChange={setDay} />
        <QueryBlock query={q}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('sanatorium.noAppointments')} />
            ) : (
              <Card>
                {items.map((a) => (
                  <ApptRow
                    key={a.id}
                    appt={a}
                    onPress={() => router.push({ pathname: '/sanatorium-appointment', params: { id: String(a.id), guestId: String(a.guest_id) } })}
                  />
                ))}
              </Card>
            )
          }
        </QueryBlock>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: 12 } });
