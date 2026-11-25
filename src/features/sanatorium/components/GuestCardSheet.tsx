// Guest ID card: QR image, name and ID (+ the password ONLY when it was just issued), the cabinet
// address and the sanatorium contacts. High-contrast, print-friendly layout; «Share» sends the same
// text through the OS share sheet. Nothing is stored: the QR is fetched on open and dropped on close,
// the password is a prop.
import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, ErrorState, LoadingView, Sheet, Text } from '@/ui';
import { guestQrQuery, settingsQuery } from '../api/queries';
import { useSanFeatures } from '../utils/features';
import { buildCardShareText, guestCabinetUrl } from '../utils/guests';
import { CopyButton, PrintButton } from './CardActions';

export type GuestCardInfo = { guestId: number; name: string; loginCode?: string | null; password?: string | null };

export function GuestCardSheet({ info, onClose }: { info: GuestCardInfo | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const qr = useQuery(guestQrQuery(info?.guestId ?? 0, !!info));
  const settings = useQuery(settingsQuery(!!info));
  const cabinetOn = useSanFeatures().on('guest_cabinet');
  const cabinetUrl = cabinetOn ? guestCabinetUrl() : null;
  const foot = [settings.data?.contacts, settings.data?.addresses, settings.data?.work_hours].filter((x): x is string => !!x && x.trim() !== '');
  const share = () => {
    if (!info) return;
    const message = buildCardShareText({
      name: info.name,
      loginCode: info.loginCode,
      password: info.password,
      cabinetUrl,
      contacts: settings.data?.contacts,
      addresses: settings.data?.addresses,
      workHours: settings.data?.work_hours,
      labels: { loginCode: t('sanatorium.loginCode'), password: t('sanatorium.password'), cabinet: t('sanGuests.cabinetAt') },
    });
    void Share.share({ message }).catch(() => {});
  };
  return (
    <Sheet visible={!!info} onClose={onClose} title={t('sanatorium.idCard')} scroll>
      <View style={styles.body} testID="guest-card-sheet">
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text variant="heading" style={styles.center}>{info?.name}</Text>
          {qr.isPending ? (
            <LoadingView rows={1} />
          ) : qr.isError || !qr.data ? (
            <ErrorState onRetry={() => void qr.refetch()} />
          ) : (
            <Image testID="guest-qr-image" source={{ uri: qr.data }} style={styles.qr} contentFit="contain" accessibilityLabel={t('sanatorium.qrCode')} />
          )}
          {!!info?.loginCode && (
            <View style={styles.center}>
              <Text variant="caption" tone="muted">{t('sanatorium.loginCode')}</Text>
              <Text variant="display" selectable testID="card-login">{info.loginCode}</Text>
              <CopyButton value={info.loginCode} testID="card-copy-login" />
            </View>
          )}
          {!!info?.password && (
            <View style={styles.center}>
              <Text variant="caption" tone="muted">{t('sanatorium.password')}</Text>
              <Text variant="display" selectable testID="card-password">{info.password}</Text>
              <CopyButton value={info.password} testID="card-copy-password" />
              <Text variant="caption" tone="danger">{t('sanatorium.credentialsOnce')}</Text>
            </View>
          )}
          {!!cabinetUrl && (
            <View style={styles.center}>
              <Text variant="caption" tone="muted">{t('sanGuests.cabinetAt')}</Text>
              <Text variant="label" selectable style={styles.center} testID="card-cabinet">{cabinetUrl}</Text>
            </View>
          )}
          {foot.length > 0 && (
            <View style={styles.center} testID="card-foot">
              {foot.map((x, i) => (
                <Text key={i} variant="caption" tone="muted" style={styles.center}>{x}</Text>
              ))}
            </View>
          )}
        </View>
        <Button testID="card-share" label={t('sanatorium.share')} icon="arrowUp" full onPress={share} />
        <PrintButton testID="card-print" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, alignItems: 'center' },
  center: { alignItems: 'center', textAlign: 'center' },
  qr: { width: 220, height: 220 },
});
