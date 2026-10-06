// Kadr: «Mobil belgilar» — xizmat safaridagi xodimlarning telefondan qo'ygan «Keldim / Ketdim»
// belgilari (v2 `/mobil-belgilar` bilan bir modul: `mobileCheckins`). Server ko'lami — kadrning o'z
// filiallari; uzoqdan belgi rad etilmaydi, shu yerda «Uzoqdan» bo'lib ko'rinadi va kerak bo'lsa
// sabab bilan bekor qilinadi (davomatdagi hodisa o'chadi, xodimga xabar boradi).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
} from '@/ui';
import { hrCheckinsQuery, type HrCheckinFilter } from '../api/queries';
import { CheckinRow } from './CheckinScreen';
import { CheckinDetailSheet } from '../components/CheckinDetailSheet';

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
      {viewing !== null && <CheckinDetailSheet key={viewing} id={viewing} canCancel onClose={() => setViewing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
