// Stay documents (contract / invoice / act / epikriz) as PDF or DOCX, plus the paid services block
// of the stay screen (orders, services total, grand total, debt). Hidden when the section is off.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SANATORIUM_STAY_DOCUMENT } from '@/api/urls';
import { Button, Card, ListRow, Text } from '@/ui';
import { sanMeQuery } from '../../api/sections2';
import type { StayFull } from '../../types';
import { useSanFeatures } from '../../utils/features';
import { docFileName } from '../../utils/sections2';
import { fmtMoney, hasSanRole, isSanReadOnly } from '../../utils/sanatorium';
import { useAuthStore } from '@/store/authStore';
import { OrderList, ServiceOrderSheet } from './ServiceOrders';
import { DownloadButton } from './kit';

const KINDS = ['contract', 'invoice', 'act', 'epikriz'] as const;

/** Registrar: all four documents. The attending doctor: the epikriz only. */
export function StayDocumentsCard({ stay }: { stay: Pick<StayFull, 'id' | 'doctor'> }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const f = useSanFeatures();
  const registrar = hasSanRole(user, 'registrar');
  const doctor = hasSanRole(user, 'doctor');
  const me = useQuery(sanMeQuery(doctor && !registrar));
  const mine = doctor && me.data?.staff_id != null && me.data.staff_id === stay.doctor?.id;
  if (!f.on('documents') || !(registrar || mine)) return null;
  const kinds = registrar ? KINDS : (['epikriz'] as const);
  return (
    <Card title={t('sanatorium.s2.documents')} icon="doc" tint="cyan" testID="stay-documents">
      {kinds.map((k) => (
        <View key={k} style={styles.docRow}>
          <Text variant="body" style={styles.flex}>{t(`sanatorium.s2.docKind.${k}`)}</Text>
          <DownloadButton testID={`doc-${k}-pdf`} label="PDF" format="pdf" url={SANATORIUM_STAY_DOCUMENT(stay.id, k)} params={{ format: 'pdf' }} filename={docFileName(k, stay.id, 'pdf')} />
          <DownloadButton testID={`doc-${k}-docx`} label="DOCX" format="docx" url={SANATORIUM_STAY_DOCUMENT(stay.id, k)} params={{ format: 'docx' }} filename={docFileName(k, stay.id, 'docx')} />
        </View>
      ))}
    </Card>
  );
}

/** Orders of the stay, services total / grand total / debt, and «add service». Registrar only. */
export function StayServicesCard({ stay }: { stay: Pick<StayFull, 'id'> & { services_total?: string; grand_total?: string; debt?: string; total_amount?: string } }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const f = useSanFeatures();
  const [adding, setAdding] = useState(false);
  const readOnly = isSanReadOnly(user);
  if (!f.on('paid_services') || !hasSanRole(user, 'registrar')) return null;
  return (
    <Card title={t('sanatorium.s2.services')} icon="gift" tint="orange" testID="stay-services">
      <ListRow title={t('sanatorium.s2.accommodationTotal')} right={<Text variant="body">{fmtMoney(stay.total_amount)}</Text>} />
      <ListRow title={t('sanatorium.s2.servicesTotal')} right={<Text variant="body" testID="stay-services-total">{fmtMoney(stay.services_total ?? '0')}</Text>} />
      <ListRow title={t('sanatorium.s2.grandTotal')} right={<Text variant="heading" testID="stay-grand-total">{fmtMoney(stay.grand_total ?? stay.total_amount)}</Text>} />
      <ListRow title={t('sanatorium.debt')} right={<Text variant="heading">{fmtMoney(stay.debt)}</Text>} />
      {!readOnly && <Button testID="stay-add-service" label={t('sanatorium.s2.newOrder')} icon="plus" size="sm" variant="soft" onPress={() => setAdding(true)} />}
      <OrderList filter={{ stay_id: stay.id }} showGuest={false} />
      <ServiceOrderSheet open={adding} stayId={stay.id} onClose={() => setAdding(false)} />
    </Card>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 } });
