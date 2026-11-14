// Doctor scans a guest's QR: resolve -> the guest's card. Native only (the camera).
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CodeScanner } from '@/components/CodeScanner';
import { PageHeader, Screen } from '@/ui';
import { useResolveGuestQr } from '../api/mutations';
import { Denied, useSanAccess } from '../components/common';
import { sanErrorMessage } from '../utils/sanatorium';

export default function ScanScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('doctor');
  const resolve = useResolveGuestQr();
  const [message, setMessage] = useState<string | null>(null);

  const onCode = useCallback(
    async (raw: string) => {
      try {
        const r = await resolve.mutateAsync(raw);
        router.replace({ pathname: '/sanatorium-guest', params: { id: String(r.guest.id) } });
      } catch (e) {
        setMessage(sanErrorMessage(e, t('sanatorium.scanFailed')));
      }
    },
    [resolve, t],
  );

  if (!allowed) return <Denied />;
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <PageHeader title={t('sanatorium.scanQr')} subtitle={t('sanatorium.scanSubtitle')} />
      <View style={styles.flex}>
        <CodeScanner
          hint={t('sanatorium.scanHint')}
          busy={resolve.isPending}
          message={message}
          onCode={(raw) => void onCode(raw)}
          onRetry={() => setMessage(null)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
