// Registrar's bookings: every stay with status filters (incl. «left early»), search and a
// «new booking» action.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, Chip, EmptyState, ListRow, PageHeader, Screen, SearchField } from '@/ui';
import { staysQuery, type StayFilter } from '../api/queries';
import { BookingSheet } from '../components/BookingSheet';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import { fmtDate, stayTone } from '../utils/sanatorium';

type F = 'all' | 'booked' | 'checked_in' | 'checked_out' | 'left_early' | 'cancelled';
const FILTERS: F[] = ['all', 'booked', 'checked_in', 'checked_out', 'left_early', 'cancelled'];

export default function BookingsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const [f, setF] = useState<F>('all');
  const [term, setTerm] = useState('');
  const [size, setSize] = useState(30);
  const [booking, setBooking] = useState(false);
  const q = useDebouncedValue(term);
  const filter: StayFilter = { size, ...(q.trim() ? { q: q.trim() } : {}), ...(f === 'left_early' ? { left_early: true } : f !== 'all' ? { status: f } : {}) };
  const list = useQuery(staysQuery(filter, allowed));
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()} testID="sanatorium-bookings-screen">
      <PageHeader title={t('sanatorium.nav.bookings')} right={<Button testID="booking-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setBooking(true)} />} />
      <SearchField testID="bookings-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
      <View style={styles.chips}>
        {FILTERS.map((x) => (
          <Chip key={x} testID={`bf-${x}`} label={t(`sanatorium.filter.${x}`)} selected={f === x} onPress={() => { setF(x); setSize(30); }} />
        ))}
      </View>
      <QueryBlock query={list}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('sanatorium.noStays')} />
          ) : (
            <View style={styles.stack}>
              {items.map((s) => (
                <ListRow
                  key={s.id}
                  pressable
                  testID={`booking-${s.id}`}
                  title={s.guest?.full_name ?? '—'}
                  subtitle={[`${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`, s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom')].join(' · ')}
                  right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} />}
                  chevron
                  onPress={() => router.push({ pathname: '/sanatorium-stay', params: { id: String(s.id) } })}
                />
              ))}
              {items.length >= size && size < 100 && <Button label={t('sanatorium.showMore')} variant="soft" full onPress={() => setSize((n) => n + 30)} />}
            </View>
          )
        }
      </QueryBlock>
      <BookingSheet open={booking ? { guests: [] } : null} onClose={() => setBooking(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  stack: { gap: 8 },
});
