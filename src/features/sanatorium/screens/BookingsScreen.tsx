// Stays list for the registrar and the room keeper: web-style filters (status, guest type, room,
// date, search, left early), real pagination, «new booking» / «guest arrived» for the registrar and a
// bulk check-in of booked rows (registrar + room keeper).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Chip, EmptyState, ListRow, PageHeader, Screen, SearchField, Text } from '@/ui';
import { checkIn } from '../api/mutations';
import { roomsQuery, sanKeys, staysInfinite, type StayFilter } from '../api/queries';
import { BookingSheet } from '../components/BookingSheet';
import { StayMoneyLine, TypeBadge } from '../components/GuestParts';
import { Denied, PagedBlock, useSanAccess } from '../components/common';
import { ChoiceField, DateField } from '../components/forms';
import { warningText } from '../simple/warnings';
import { warningsOf } from '../simple/utils';
import { useSimpleAvailable } from '../simple/useSimpleAvailable';
import { GUEST_TYPES, type StayFull } from '../types';
import { runBulk } from '../utils/guests';
import { canSanWrite, fmtDate, sanErrorMessage, stayTone } from '../utils/sanatorium';

type F = 'all' | 'booked' | 'checked_in' | 'checked_out' | 'left_early' | 'cancelled';
const FILTERS: F[] = ['all', 'booked', 'checked_in', 'checked_out', 'left_early', 'cancelled'];

export default function BookingsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { colors: c } = useTheme();
  const allowed = useSanAccess('registrar', 'room_keeper');
  const user = useAuthStore((s) => s.user);
  const registrar = canSanWrite(user, 'registrar');
  const canBulk = canSanWrite(user, 'registrar', 'room_keeper');
  const simple = useSimpleAvailable(allowed && registrar);
  const [f, setF] = useState<F>('all');
  const [term, setTerm] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const q = useDebouncedValue(term);
  const rooms = useQuery(roomsQuery(allowed));
  const early = f === 'left_early';
  const filter: StayFilter = {
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(early ? { left_early: true } : f !== 'all' ? { status: f } : {}),
    ...(type ? { guest_type: type } : {}),
    ...(roomId ? { room_id: roomId } : {}),
    ...(date ? { on_date: date } : {}),
  };
  const list = useInfiniteQuery(staysInfinite(filter, allowed));
  if (!allowed) return <Denied />;
  const filtered = !!(type || roomId || date);
  const rows: StayFull[] = list.data?.pages.flatMap((p) => p.items) ?? [];
  const bookedIds = rows.filter((r) => r.status === 'booked').map((r) => r.id);

  const toggle = (id: number) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const stopSelect = () => {
    setSelecting(false);
    setPicked([]);
  };
  const bulkCheckIn = async () => {
    if (progress || picked.length === 0) return;
    const names = new Map(rows.map((r) => [r.id, r.guest?.full_name ?? `#${r.id}`]));
    setProgress({ done: 0, total: picked.length });
    const res = await runBulk(picked, (id) => checkIn(id), (e) => sanErrorMessage(e, t('errors.generic')), (done, total) => setProgress({ done, total }));
    setProgress(null);
    void qc.invalidateQueries({ queryKey: sanKeys.all });
    // One toast per distinct warning (room not ready, room full ...), not one per stay.
    const texts = new Set(res.warnings.flatMap((w) => warningsOf(w)).filter((w) => w.code !== 'debt' && w.code !== 'overpaid').map(warningText));
    texts.forEach((x) => toast.info(x, 8000));
    if (res.ok.length > 0) toast.success(t('sanGuests.bulkDone', { count: res.ok.length }));
    if (res.failed.length > 0) {
      const list = res.failed.map((x) => `${names.get(x.id)}: ${x.error}`).join('; ');
      toast.error(t('sanGuests.bulkFailed', { count: res.failed.length, list }), 10000);
    }
    // Failed ones stay selected so the keeper can retry after fixing the room.
    setPicked(res.failed.map((x) => x.id));
    if (res.failed.length === 0) stopSelect();
  };

  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()} testID="sanatorium-bookings-screen">
      <PageHeader
        title={t('sanatorium.nav.bookings')}
        right={
          registrar ? (
            <View style={styles.headRight}>
              {simple && <Button testID="booking-arrive" label={t('sanGuests.arrived')} icon="check" size="sm" onPress={() => router.push('/sanatorium-arrive')} />}
              <Button testID="booking-add" label={t('sanatorium.add')} icon="plus" size="sm" variant={simple ? 'soft' : 'primary'} onPress={() => setBooking(true)} />
            </View>
          ) : undefined
        }
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
      {canBulk && bookedIds.length > 0 && (
        <View style={styles.selectBar}>
          {selecting ? (
            <>
              <Text variant="label" testID="bulk-count">{t('sanGuests.selected', { count: picked.length })}</Text>
              <Button testID="bulk-all" label={t('sanGuests.selectAll')} variant="link" size="sm" onPress={() => setPicked(bookedIds)} />
              <Button testID="bulk-cancel" label={t('common.cancel')} variant="link" size="sm" onPress={stopSelect} />
            </>
          ) : (
            <Button testID="bulk-select" label={t('sanGuests.select')} icon="checklist" variant="soft" size="sm" onPress={() => setSelecting(true)} />
          )}
        </View>
      )}
      <PagedBlock query={list}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('sanatorium.noStays')} />
          ) : (
            <View style={styles.stack} testID="bookings-list">
              {items.map((s) => {
                const booked = s.status === 'booked';
                const on = picked.includes(s.id);
                return (
                  <ListRow
                    key={s.id}
                    pressable
                    testID={`booking-${s.id}`}
                    title={s.guest?.full_name ?? '—'}
                    subtitle={[`${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`, s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom')].filter(Boolean).join(' · ')}
                    left={
                      selecting && booked ? (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          onPress={() => toggle(s.id)}
                          hitSlop={8}
                          testID={`booking-check-${s.id}`}
                          style={[styles.box, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brand : c.surface }]}
                        >
                          {on && <Icon name="check" size={14} color={c.fgOnBrand} />}
                        </Pressable>
                      ) : undefined
                    }
                    below={
                      <View style={styles.meta}>
                        <View style={styles.badges}>
                          <TypeBadge type={s.guest_type} testID={`booking-type-${s.id}`} />
                        </View>
                        {early && (
                          <Text variant="caption" tone="muted" testID={`booking-early-${s.id}`}>
                            {t('sanGuests.earlyDate')}: {fmtDate(s.early_leave_date)}{s.early_leave_reason ? ` · ${s.early_leave_reason}` : ''}
                          </Text>
                        )}
                        {registrar && <StayMoneyLine id={s.id} total={s.total_amount} debt={s.debt} status={s.payment_status} />}
                      </View>
                    }
                    right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} />}
                    chevron={!selecting}
                    onPress={() => (selecting ? (booked ? toggle(s.id) : undefined) : router.push({ pathname: '/sanatorium-stay', params: { id: String(s.id) } }))}
                  />
                );
              })}
            </View>
          )
        }
      </PagedBlock>
      {selecting && (
        <View style={styles.bulk} testID="bulk-bar">
          {progress && <Text variant="label" testID="bulk-progress">{t('sanGuests.bulkProgress', { done: progress.done, total: progress.total })}</Text>}
          <Button
            testID="bulk-checkin"
            label={t('sanGuests.bulkCheckIn')}
            icon="check"
            full
            disabled={picked.length === 0}
            loading={!!progress}
            onPress={() => void bulkCheckIn()}
          />
        </View>
      )}
      <BookingSheet open={booking ? { guests: [] } : null} onClose={() => setBooking(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRight: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 },
  stack: { gap: 8, marginTop: 8, marginBottom: 8 },
  selectBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bulk: { gap: 6, marginVertical: 8 },
  meta: { gap: 3, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
