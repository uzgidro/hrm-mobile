// «Mening QR-kodim» — the employee's own 24-digit medical code, for the doctor to scan or type.
//
// The QR is drawn by the app's own small encoder (`utils/qrMatrix.ts`, digits only) on
// `react-native-svg`, so no native dependency was added. The digits stay under it, grouped and
// selectable: a doctor without a scanner types them. The card is white in every theme.
import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, ErrorState, LoadingView, PageHeader, Screen, Text } from '@/ui';
import { myQrQuery } from '../api/queries';
import { QrSymbol } from '../components/QrSymbol';
import { groupCode } from '../utils/codes';

// A printed-paper look regardless of the app theme (scan/readability contrast).
/* eslint-disable no-restricted-syntax */
const PAPER = '#FFFFFF';
const INK = '#111111';
/* eslint-enable no-restricted-syntax */

export default function MyQrScreen() {
  const { t } = useTranslation();
  const q = useQuery(myQrQuery());
  const { width } = useWindowDimensions();
  // As large as the screen allows: the doctor scans it from the employee's hand.
  const qrSide = Math.max(200, Math.min(width - 72, 340));
  const header = <PageHeader title={t('medicalExam.qr.title')} subtitle={t('medicalExam.qr.subtitle')} />;

  if (q.isPending) {
    return (
      <Screen scroll={false}>
        {header}
        <LoadingView />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen scroll={false}>
        {header}
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  }

  const me = q.data;
  const groups = groupCode(me.qr).split(' ');
  // Six groups of four digits: two per line keeps every glyph large on a narrow phone.
  const lines = [groups.slice(0, 2), groups.slice(2, 4), groups.slice(4, 6)];
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="my-qr-screen">
      {header}
      <View style={styles.stack}>
        <View style={[styles.paper, { backgroundColor: PAPER }]} testID="qr-paper">
          <Text style={[styles.name, { color: INK }]}>{me.legal_name}</Text>
          <Text style={[styles.meta, { color: INK }]}>
            {[me.branch_name, me.department_name, me.job_position_name].filter(Boolean).join(' · ')}
          </Text>
          <QrSymbol digits={me.qr} size={qrSide} testID="qr-symbol" />
          <View style={styles.digits} accessible accessibilityLabel={groupCode(me.qr)} testID="qr-digits">
            {lines.map((l, i) => (
              <Text key={i} style={[styles.line, { color: INK }]} selectable>
                {l.join('  ')}
              </Text>
            ))}
          </View>
        </View>
        <Card>
          <Text variant="body" tone="muted" testID="qr-explain">
            {t('medicalExam.qr.explain')}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 24 },
  paper: { borderRadius: 20, padding: 20, gap: 12, alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  meta: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  digits: { gap: 4, paddingTop: 4, alignItems: 'center' },
  line: { fontFamily: MONO, fontSize: 20, fontWeight: '700', letterSpacing: 1 },
});
