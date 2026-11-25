// Finish screen of the wizard: route sheet, the new login cards (shown ONCE), share and «another guest».
import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Text } from '@/ui';
import { GuestCardSheet, type GuestCardInfo } from '../../components/GuestCardSheet';
import type { ArrivalResult } from '../types';
import { routeSheetText } from '../utils';
import { RouteSheetBody } from './RouteSheetView';

export function ArrivalResultView({ result, checkedIn, onAnother }: { result: ArrivalResult; checkedIn: boolean; onAnother: () => void }) {
  const { t } = useTranslation();
  const [card, setCard] = useState<GuestCardInfo | null>(null);
  const sheet = result.route_sheet;
  const creds = result.credentials ?? [];
  const first = result.stays[0];

  const share = () => {
    if (!sheet) return;
    const text = routeSheetText(sheet, null, { loginCode: t('sanatorium.loginCode'), password: t('sanatorium.password'), period: t('sanatorium.period') }, creds);
    void Share.share({ message: text }).catch(() => {});
  };

  return (
    <View style={styles.stack} testID="wizard-result">
      <Card>
        <Text variant="title" testID="result-title">{checkedIn ? t('sanSimple.res.placed') : t('sanSimple.res.booked')}</Text>
        {(result.stays ?? []).map((s) => !!s.guest && <Text key={s.id} variant="body">{s.guest.full_name}</Text>)}
        {(result.warnings ?? []).map((w, i) => <Badge key={`${w.code}${i}`} label={t(`sanSimple.warn.${w.code}`, { defaultValue: w.code })} tone="warning" />)}
      </Card>
      {sheet && (
        <Card title={t('sanSimple.route.title')} icon="target" testID="result-route">
          <RouteSheetBody sheet={sheet} />
        </Card>
      )}
      {creds.map((c) => (
        <Card key={c.guest_id} testID={`result-cred-${c.guest_id}`}>
          <Text variant="heading">{c.full_name}</Text>
          <Text variant="label" tone="danger">{t('sanatorium.credentialsOnce')}</Text>
          <Text variant="caption" tone="muted">{t('sanatorium.loginCode')}</Text>
          <Text variant="display" selectable testID={`result-login-${c.guest_id}`}>{c.login_code}</Text>
          <Text variant="caption" tone="muted">{t('sanatorium.password')}</Text>
          <Text variant="display" selectable testID={`result-password-${c.guest_id}`}>{c.password}</Text>
          <Button label={t('sanatorium.idCard')} variant="soft" onPress={() => setCard({ guestId: c.guest_id, name: c.full_name, loginCode: c.login_code, password: c.password })} />
        </Card>
      ))}
      <Button testID="result-share" label={t('sanSimple.res.shareOrPrint')} icon="arrowUp" size="lg" full onPress={share} disabled={!sheet} />
      {!!first && <Button testID="result-open" label={t('sanSimple.res.openStay')} variant="soft" full onPress={() => router.replace({ pathname: '/sanatorium-stay', params: { id: String(first.id) } })} />}
      <Button testID="result-another" label={t('sanSimple.res.another')} variant="soft" full onPress={onAnother} />
      <Button testID="result-done" label={t('sanSimple.res.done')} variant="neutral" full onPress={() => router.back()} />
      <GuestCardSheet info={card} onClose={() => setCard(null)} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 12 } });
