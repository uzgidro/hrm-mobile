// Registrar: incoming requests. Accept -> booking sheet -> the guest's ID + password shown ONCE;
// reject -> a reason. Credentials live only in this screen's state and vanish on close.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, PageHeader, Screen, Segmented, Sheet, Text } from '@/ui';
import { useRejectRequest } from '../api/mutations';
import { requestsQuery } from '../api/queries';
import { AcceptSheet, type Accepted } from '../components/AcceptSheet';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import type { RequestStatus, SanRequest } from '../types';
import { fmtDate, fmtDateTime, maskPassport, requestTone, sanErrorMessage } from '../utils/sanatorium';

export default function RequestsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const [status, setStatus] = useState<RequestStatus>('new');
  const q = useQuery(requestsQuery(status, allowed));
  const [accepting, setAccepting] = useState<SanRequest | null>(null);
  const [rejecting, setRejecting] = useState<SanRequest | null>(null);
  const [creds, setCreds] = useState<Accepted | null>(null);
  if (!allowed) return <Denied />;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-requests-screen">
      <PageHeader title={t('sanatorium.nav.requests')} />
      <Segmented
        testID="requests-seg"
        value={status}
        onChange={setStatus}
        options={(['new', 'accepted', 'rejected'] as const).map((s) => ({ value: s, label: t(`sanatorium.requestStatus.${s}`) }))}
      />
      <View style={styles.body}>
        <QueryBlock query={q}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('sanatorium.noRequests')} />
            ) : (
              <View style={styles.stack}>
                {items.map((r) => (
                  <Card key={r.id} testID={`request-${r.id}`}>
                    <View style={styles.row}>
                      <Text variant="heading" style={styles.flex}>{r.full_name}</Text>
                      <Badge label={t(`sanatorium.requestStatus.${r.status}`)} tone={requestTone(r.status)} />
                    </View>
                    <Text variant="caption" tone="muted">
                      {[r.birth_date ? fmtDate(r.birth_date) : null, r.passport ? maskPassport(r.passport) : null, r.organization_name].filter(Boolean).join(' · ')}
                    </Text>
                    <PhoneLink phone={r.phone} />
                    {r.status === 'new' && r.existing_guest_matches === false && (
                      <Badge label={t('sanatorium.warnMismatch')} tone="danger" testID="warn-mismatch" />
                    )}
                    {r.status === 'new' && !!r.duplicate_passport && (
                      <Badge label={t('sanatorium.warnDuplicate')} tone="warning" testID="warn-duplicate" />
                    )}
                    {(r.referral_from || r.referral_to) && (
                      <Text variant="body">{t('sanatorium.referralPeriod')}: {fmtDate(r.referral_from)} → {fmtDate(r.referral_to)}</Text>
                    )}
                    {!!r.note && <Text variant="caption" tone="muted">{r.note}</Text>}
                    <Text variant="caption" tone="subtle">{t(`sanatorium.source.${r.source}`, { defaultValue: r.source })} · {fmtDateTime(r.created_at)}</Text>
                    {r.status === 'rejected' && !!r.reject_reason && <Text variant="caption" tone="danger">{r.reject_reason}</Text>}
                    {r.status === 'new' && (
                      <View style={styles.actions}>
                        <Button testID="request-accept" label={t('sanatorium.accept')} icon="check" size="sm" onPress={() => setAccepting(r)} />
                        <Button testID="request-reject" label={t('sanatorium.reject')} variant="dangerGhost" size="sm" onPress={() => setRejecting(r)} />
                        {!!r.existing_guest_id && (
                          <Button label={t('sanatorium.existingGuest')} variant="link" size="sm" onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(r.existing_guest_id) } })} />
                        )}
                      </View>
                    )}
                    {r.status === 'accepted' && !!r.guest_id && (
                      <Button label={t('sanatorium.openGuest')} variant="link" size="sm" onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(r.guest_id) } })} />
                    )}
                  </Card>
                ))}
              </View>
            )
          }
        </QueryBlock>
      </View>
      <AcceptSheet
        request={accepting}
        onClose={() => setAccepting(null)}
        onAccepted={(a) => {
          setAccepting(null);
          setCreds(a);
        }}
      />
      <RejectSheet request={rejecting} onClose={() => setRejecting(null)} />
      <Sheet visible={!!creds} onClose={() => setCreds(null)} title={t('sanatorium.credentials')}>
        <View style={styles.creds} testID="credentials-sheet">
          <Text variant="body" weight="600">{creds?.guestName}</Text>
          {creds?.credentials ? (
            <>
              <Text variant="label" tone="danger">{t('sanatorium.credentialsOnce')}</Text>
              <View style={styles.credRow}>
                <Text variant="caption" tone="muted">{t('sanatorium.loginCode')}</Text>
                <Text variant="display" selectable testID="cred-login">{creds.credentials.login_code}</Text>
              </View>
              <View style={styles.credRow}>
                <Text variant="caption" tone="muted">{t('sanatorium.password')}</Text>
                <Text variant="display" selectable testID="cred-password">{creds.credentials.password}</Text>
              </View>
            </>
          ) : (
            <Text variant="body" testID="cred-none">{t('sanatorium.credentialsNone')}</Text>
          )}
          <Button label={t('sanatorium.credentialsDone')} full onPress={() => setCreds(null)} testID="cred-done" />
        </View>
      </Sheet>
    </Screen>
  );
}

function RejectSheet({ request, onClose }: { request: SanRequest | null; onClose: () => void }) {
  const { t } = useTranslation();
  const reject = useRejectRequest();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!request) return;
    if (reason.trim().length < 3) return setError(t('sanatorium.reasonShort'));
    try {
      await reject.mutateAsync({ id: request.id, reason: reason.trim() });
      toast.success(t('sanatorium.rejected'));
      setReason('');
      setError(null);
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Sheet visible={!!request} onClose={onClose} title={t('sanatorium.reject')} scroll>
      <View style={styles.creds} testID="reject-sheet">
        <Text variant="body" weight="600">{request?.full_name}</Text>
        <FormInput label={t('sanatorium.reason')} value={reason} onChangeText={(v) => { setReason(v); setError(null); }} multiline required testID="reject-reason" />
        {!!error && <Text variant="label" tone="danger">{error}</Text>}
        <Button testID="reject-save" label={t('sanatorium.reject')} variant="danger" full loading={reject.isPending} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { marginTop: 12 },
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' },
  creds: { gap: 10, paddingBottom: 8 },
  credRow: { gap: 2 },
});
