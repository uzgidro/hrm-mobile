// Stays list for the registrar and the room keeper: web-style filters (status, guest type, room,
// date, search, left early), real pagination and — for the registrar — «new booking».
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Chip, EmptyState, ListRow, PageHeader, Screen, SearchField } from '@/ui';
import { roomsQuery, staysInfinite, type StayFilter } from '../api/queries';
import { BookingSheet } from '../components/BookingSheet';
import { Denied, PagedBlock, useSanAccess } from '../components/common';
import { ChoiceField, DateField } from '../components/forms';
import { GUEST_TYPES } from '../types';
import { fmtDate, hasSanRole, stayTone } from '../utils/sanatorium';

type F = 'all' | 'booked' | 'checked_in' | 'checked_out' | 'left_early' | 'cancelled';
const FILTERS: F[] = ['all', 'booked', 'checked_in', 'checked_out', 'left_early', 'cancelled'];

export default function BookingsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar', 'room_keeper');
  const registrar = hasSanRole(useAuthStore((s) => s.user), 'registrar');
  const [f, setF] = useState<F>('all');
  const [term, setTerm] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const q = useDebouncedValue(term);
  const rooms = useQuery(roomsQuery(allowed));
  const filter: StayFilter = {
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(f === 'left_early' ? { left_early: true } : f !== 'all' ? { status: f } : {}),
    ...(type ? { guest_type: type } : {}),
    ...(roomId ? { room_id: roomId } : {}),
    ...(date ? { on_date: date } : {}),
  };
  const list = useInfiniteQuery(staysInfinite(filter, allowed));
  if (!allowed) return <Denied />;
  const filtered = !!(type || roomId || date);
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()} testID="sanatorium-bookings-screen">
      <PageHeader
        title={t('sanatorium.nav.bookings')}
        right={registrar ? <Button testID="booking-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setBooking(true)} /> : undefined}
      />
      <SearchField testID="bookings-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
      <View style={styles.chips}>
        {FILTERS.map((x) => (
          <Chip key={x} testID={`bf-${x}`} label={t(`sanatorium.filter.${x}`)} selected={f === x} onPress={() => setF(x)} />
        ))}
      </View>
      <ChoiceField
        label={t('sanatorium.guestTypeLabel')}
        value={type}
        noneLabel={t('sanatorium.filter.all')}
        options={GUEST_TYPES.map((g) => ({ value: g as string, label: t(`sanatorium.guestType.${g}`) }))}
        onChange={setType}
        testID="bf-type"
      />
      <ChoiceField
        label={t('sanatorium.room')}
        value={roomId}
        noneLabel={t('sanatorium.filter.all')}
        options={(rooms.data ?? []).map((r) => ({ value: r.id, label: [r.number, r.building].filter(Boolean).join(' · ') }))}
        onChange={setRoomId}
        loading={rooms.isPending}
        testID="bf-room"
      />
      <DateField label={t('sanatorium.onDate')} value={date} onChange={setDate} testID="bf-date" />
      {filtered && (
        <Button testID="bf-clear" label={t('sanatorium.clearFilters')} variant="link" size="sm" onPress={() => { setType(null); setRoomId(null); setDate(null); }} />
      )}
      <PagedBlock query={list}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('sanatorium.noStays')} />
          ) : (
            <View style={styles.stack} testID="bookings-list">
              {items.map((s) => (
                <ListRow
                  key={s.id}
                  pressable
                  testID={`booking-${s.id}`}
                  title={s.guest?.full_name ?? '—'}
                  subtitle={[`${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`, s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom')].filter(Boolean).join(' · ')}
                  right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} />}
                  chevron
                  onPress={() => router.push({ pathname: '/sanatorium-stay', params: { id: String(s.id) } })}
                />
              ))}
            </View>
          )
        }
      </PagedBlock>
      <BookingSheet open={booking ? { guests: [] } : null} onClose={() => setBooking(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  stack: { gap: 8, marginTop: 8, marginBottom: 8 },
});
