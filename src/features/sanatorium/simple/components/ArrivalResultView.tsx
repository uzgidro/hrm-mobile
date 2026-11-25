// The end of the wizard: what happened, where the guest goes now, the paper to hand over and the new logins
// (shown ONCE, kept only in the memory of this screen).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, Text } from '@/ui';
import { GuestCardSheet, type GuestCardInfo } from '../../components/GuestCardSheet';
import { useSanFeatures } from '../../utils/features';
import { guestCabinetUrl } from '../../utils/guests';
import { fmtDate } from '../../utils/sanatorium';
import type { ArrivalResult } from '../types';
import { warningText } from '../warnings';
import { Note, useRoomText } from './parts';
import { RouteSheetBody, RouteSheetTools, useSheetLang } from './RouteSheetView';

export function ArrivalResultView({ result, checkedIn, replayed = false, onAnother, onHome }: {
  result: ArrivalResult;
  checkedIn: boolean;
  /** The same press had been saved before (lost answer, second tap): the stays are shown, the passwords cannot be. */
  replayed?: boolean;
  onAnother: () => void;
  onHome: () => void;
}) {
  const { t } = useTranslation();
  const features = useSanFeatures();
  const roomText = useRoomText();
  const [card, setCard] = useState<GuestCardInfo | null>(null);
  const sheet = result.route_sheet ?? null;
  const [lang, setLang] = useSheetLang(sheet);
  const creds = result.credentials ?? [];
  const first = result.stays[0];
  const family = (result.route_sheets ?? []).filter((r) => r.stay_id !== sheet?.stay_id);
  const names = result.stays.map((s) => s.guest?.full_name).filter(Boolean).join(', ');
  const rooms = [...new Map(result.stays.flatMap((s) => (s.room ? [[s.room.id, roomText(s.room)] as const] : []))).values()].join(', ');

  return (
    <View style={styles.stack} testID="wizard-result">
      <Card>
        <Text variant="title" testID="result-title">{t(replayed ? 'sanFlow.done.already' : checkedIn ? 'sanFlow.done.settled' : 'sanFlow.done.booked')}</Text>
        <Text variant="body" testID="result-names">{[names, rooms].filter(Boolean).join(' — ')}</Text>
        {!!first?.planned_from && <Text variant="label" tone="muted">{fmtDate(first.planned_from)} — {fmtDate(first.planned_to)}</Text>}
      </Card>
      {(result.warnings ?? []).map((w, i) => <Note key={`${w.code}${i}`} tone="warning" testID={`result-warn-${w.code}`}>{warningText(w)}</Note>)}
      {sheet && (
        <Card title={t('sanSimple.route.title')} icon="target" testID="result-route">
          {!!first && <RouteSheetTools stayId={sheet.stay_id ?? first.id} sheet={sheet} others={family} creds={creds} lang={lang} onLang={setLang} />}
          <View style={styles.gap} />
          <RouteSheetBody sheet={sheet} others={family} lang={lang} />
        </Card>
      )}
      {creds.length > 0 ? (
        <Note tone="warning" testID="creds-once">{t('sanatorium.credentialsOnce')}</Note>
      ) : replayed ? (
        <>
          <Note tone="warning" testID="replayed">{t('sanFlow.done.alreadyHint')}</Note>
          {result.stays.map((s) => !!s.guest && (
            <Button key={s.id} label={s.guest.full_name} icon="lock" variant="soft" full testID={`replayed-${s.guest.id}`} onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(s.guest!.id) } })} />
          ))}
        </>
      ) : (
        <Note tone="info" testID="keeps-login">{t('sanFlow.done.keepsLogin')}</Note>
      )}
      {creds.map((c) => (
        <Card key={c.guest_id} testID={`result-cred-${c.guest_id}`}>
          <Text variant="heading">{c.full_name}</Text>
          <Text variant="caption" tone="muted">{t('sanatorium.loginCode')}</Text>
          <Text variant="display" selectable testID={`result-login-${c.guest_id}`}>{c.login_code}</Text>
          <Text variant="caption" tone="muted">{t('sanatorium.password')}</Text>
          <Text variant="display" selectable testID={`result-password-${c.guest_id}`}>{c.password}</Text>
          <Button testID={`result-card-${c.guest_id}`} label={t('sanatorium.idCard')} icon="qr" variant="soft" onPress={() => setCard({ guestId: c.guest_id, name: c.full_name, loginCode: c.login_code, password: c.password })} />
        </Card>
      ))}
      {features.on('guest_cabinet') && creds.length > 0 && <Text variant="caption" tone="muted" selectable testID="result-cabinet">{t('sanFlow.sheet.cabinet', { url: guestCabinetUrl() })}</Text>}
      {!!first && <Button testID="result-open" label={t('sanSimple.res.openStay')} variant="soft" full onPress={() => router.replace({ pathname: '/sanatorium-stay', params: { id: String(first.id) } })} />}
      <Button testID="result-another" label={t('sanFlow.done.again')} variant="soft" icon="plus" full onPress={onAnother} />
      <Button testID="result-done" label={t('sanFlow.done.home')} full onPress={onHome} />
      <GuestCardSheet info={card} onClose={() => setCard(null)} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 12 }, gap: { height: 12 } });
