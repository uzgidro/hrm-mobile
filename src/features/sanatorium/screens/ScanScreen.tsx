// Doctor scans a guest's QR: resolve -> the guest card (phone, age, room, stay) with profile / history.
// Native only (the camera).
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CodeScanner } from '@/components/CodeScanner';
import { PageHeader, Screen } from '@/ui';
import { useResolveGuestQr } from '../api/mutations';
import { Denied, useSanAccess } from '../components/common';
import { HistorySheet, ResolvedGuestSheet } from '../components/DeskParts';
import type { QrResolveResult } from '../types';
import { sanErrorMessage } from '../utils/sanatorium';

export default function ScanScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('doctor');
  const resolve = useResolveGuestQr();
  const [message, setMessage] = useState<string | null>(null);
  const [resolved, setResolved] = useState<QrResolveResult | null>(null);
  const [history, setHistory] = useState<{ id: number; name: string } | null>(null);
  // The scanner locks after the first read; a new key unlocks it once the card is closed.
  const [scanKey, setScanKey] = useState(0);

  const onCode = useCallback(
    async (raw: string) => {
      try {
        setResolved(await resolve.mutateAsync(raw));
      } catch (e) {
        setMessage(sanErrorMessage(e, t('sanatorium.scanFailed')));
      }
    },
    [resolve, t],
  );
  const reset = () => {
    setResolved(null);
    setHistory(null);
    setMessage(null);
    setScanKey((k) => k + 1);
  };

  if (!allowed) return <Denied />;
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <PageHeader title={t('sanatorium.scanQr')} subtitle={t('sanatorium.scanSubtitle')} />
      <View style={styles.flex}>
        <CodeScanner
          key={scanKey}
          hint={t('sanatorium.scanHint')}
          busy={resolve.isPending}
          message={message}
          onCode={(raw) => void onCode(raw)}
          onRetry={() => setMessage(null)}
        />
      </View>
      <ResolvedGuestSheet result={resolved} onClose={reset} onHistory={setHistory} />
      <HistorySheet guest={history} onClose={reset} />
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
