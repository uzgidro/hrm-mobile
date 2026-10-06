// Kadr: «Mobil belgilar» — xizmat safaridagi xodimlarning telefondan qo'ygan «Keldim / Ketdim»
// belgilari (v2 `/mobil-belgilar` bilan bir modul: `mobileCheckins`). Server ko'lami — kadrning o'z
// filiallari; uzoqdan belgi rad etilmaydi, shu yerda «Uzoqdan» bo'lib ko'rinadi va kerak bo'lsa
// sabab bilan bekor qilinadi (davomatdagi hodisa o'chadi, xodimga xabar boradi).
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/api/errors';
import { FormInput } from '@/components/FormInput';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Segmented,
  Sheet,
  Skeleton,
  Text,
} from '@/ui';
import { checkinDetailQuery, hrCheckinsQuery, type HrCheckinFilter } from '../api/queries';
import { useCancelCheckin } from '../api/mutations';
import { formatDistance } from '../lib/capture';
import { CheckinRow } from './CheckinScreen';

type Range = 'today' | 'week' | 'month';

export function rangeDates(range: Range, now = dayjs()): { dateFrom: string; dateTo: string } {
  const to = now.format('YYYY-MM-DD');
  if (range === 'today') return { dateFrom: to, dateTo: to };
  if (range === 'week') return { dateFrom: now.subtract(6, 'day').format('YYYY-MM-DD'), dateTo: to };
  return { dateFrom: now.startOf('month').format('YYYY-MM-DD'), dateTo: to };
}

export default function HrCheckinsScreen() {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>('today');
  const [status, setStatus] = useState<HrCheckinFilter['status']>('');
  const [farOnly, setFarOnly] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const list = useQuery(hrCheckinsQuery({ ...rangeDates(range), status, farOnly, search: debounced, page }));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()} testID="hr-checkins-screen">
        <PageHeader title={t('checkin.hr.title')} subtitle={t('checkin.hr.subtitle')} />
        <View style={styles.filters}>
          <Segmented<Range>
            testID="hr-checkins-range"
            value={range}
            onChange={(v) => reset(() => setRange(v))}
            options={[
              { value: 'today', label: t('checkin.hr.range_today') },
              { value: 'week', label: t('checkin.hr.range_week') },
              { value: 'month', label: t('checkin.hr.range_month') },
            ]}
          />
          <SearchField value={search} onChangeText={(v) => reset(() => setSearch(v))} placeholder={t('checkin.hr.search')} />
          <View style={styles.chips}>
            {(['', 'active', 'cancelled'] as const).map((s) => (
              <Chip
                key={s || 'all'}
                testID={`hr-checkins-status-${s || 'all'}`}
                label={s === '' ? t('checkin.hr.all') : s === 'active' ? t('checkin.statusActive') : t('checkin.statusCancelled')}
                selected={status === s}
                onPress={() => reset(() => setStatus(s))}
              />
            ))}
            <Chip
              testID="hr-checkins-far"
              label={t('checkin.hr.farOnly')}
              selected={farOnly}
              onPress={() => reset(() => setFarOnly(!farOnly))}
            />
          </View>
        </View>
        <Card>
          {list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={220} />
          ) : !list.data.items.length ? (
            <EmptyState title={t('checkin.hr.empty')} />
          ) : (
            list.data.items.map((r) => <CheckinRow key={r.id} item={r} showName onPress={() => setViewing(r.id)} />)
          )}
          <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
        </Card>
      </Screen>
      {viewing !== null && <CheckinDetailSheet key={viewing} id={viewing} onClose={() => setViewing(null)} />}
    </View>
  );
}

function CheckinDetailSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery(checkinDetailQuery(id));
  const cancel = useCancelCheckin();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const r = q.data;

  const doCancel = async () => {
    if (reason.trim().length < 3) return setError(t('checkin.hr.reasonMin'));
    try {
      await cancel.mutateAsync({ id, reason });
      toast.success(t('checkin.hr.cancelled'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const kv = (k: string, v?: string | null) =>
    v ? (
      <View style={styles.kv}>
        <Text variant="caption" tone="muted">
          {k}
        </Text>
        <Text variant="label" style={styles.kvValue}>
          {v}
        </Text>
      </View>
    ) : null;

  return (
    <Sheet visible onClose={onClose} title={r?.employee?.legal_name ?? t('checkin.hr.detailTitle')}>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !r ? (
        <Skeleton height={260} />
      ) : (
        // Varaqda skroll yo'q — haqiqiy surat + bekor qilish formasi bilan tasdiq tugmasi ekrandan
        // tashqarida qolardi (jonli sinov 2026-10-06).
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          testID="hr-checkin-detail"
        >
          {!!(r.photo_path || r.photo_thumb_path) && (
            <Image source={{ uri: r.photo_path || r.photo_thumb_path! }} style={styles.photo} contentFit="cover" />
          )}
          <View style={styles.badges}>
            <Badge label={t(`checkin.dir_${r.direction_type}`, { defaultValue: r.direction_type })} tone="info" />
            {r.status === 'cancelled' ? (
              <Badge label={t('checkin.statusCancelled')} tone="danger" />
            ) : (
              <Badge label={t('checkin.statusActive')} tone="success" />
            )}
            {r.is_far && <Badge label={t('checkin.far')} tone="warning" />}
          </View>
          {kv(t('checkin.hr.captured'), dayjs(r.happen_time).format('DD.MM.YYYY HH:mm'))}
          {kv(t('checkin.hr.received'), dayjs(r.received_at).format('DD.MM.YYYY HH:mm'))}
          {kv(t('checkin.hr.destination'), r.destination_branch?.name)}
          {kv(t('checkin.hr.distance'), formatDistance(r.distance_m))}
          {kv(t('checkin.hr.accuracy'), r.accuracy_m != null ? `±${Math.round(r.accuracy_m)} m` : null)}
          {r.status === 'cancelled' && kv(t('checkin.cancelReasonLabel'), r.cancel_reason)}
          {r.status === 'cancelled' && !!r.cancelled_by?.legal_name && (
            <Text variant="caption" tone="muted">
              {t('checkin.cancelledBy', { name: r.cancelled_by.legal_name })}
            </Text>
          )}
          <Button
            label={t('checkin.openMap')}
            variant="soft"
            icon="mapPin"
            full
            onPress={() => void Linking.openURL(r.map_url)}
          />
          {r.status === 'active' &&
            (cancelling ? (
              <View style={styles.sheet}>
                <Text variant="caption" tone="muted">
                  {t('checkin.hr.cancelHint')}
                </Text>
                <FormInput
                  testID="hr-checkin-cancel-reason"
                  label={t('checkin.cancelReasonLabel')}
                  value={reason}
                  onChangeText={(v) => {
                    setReason(v);
                    setError(undefined);
                  }}
                  error={error}
                  required
                  multiline
                />
                <Button
                  testID="hr-checkin-cancel-confirm"
                  label={t('checkin.hr.cancel')}
                  variant="danger"
                  full
                  loading={cancel.isPending}
                  onPress={() => void doCancel()}
                />
                <Button label={t('common.cancel')} variant="ghost" full onPress={() => setCancelling(false)} />
              </View>
            ) : (
              <Button
                testID="hr-checkin-cancel"
                label={t('checkin.hr.cancel')}
                variant="dangerGhost"
                full
                onPress={() => setCancelling(true)}
              />
            ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sheet: { gap: 10 },
  photo: { width: '100%', height: 240, borderRadius: 16 },
  scroll: { flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  kvValue: { flexShrink: 1, textAlign: 'right' },
});
