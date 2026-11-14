// Room keeper's desk (the registrar sees it too): today's arrivals and departures with
// check-in / check-out / early leave, and the room availability list.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Badge, Card, EmptyState, PageHeader, Screen, Segmented, Text } from '@/ui';
import { availabilityQuery, dashboardQuery } from '../api/queries';
import { useCheckIn, useCheckOut } from '../api/mutations';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import { EarlyLeaveSheet } from '../components/EarlyLeaveSheet';
import { StayCard } from '../components/StayCard';
import type { AvailabilityRoom, Stay } from '../types';
import { fmtDate, sanErrorInfo, sanErrorMessage, todayIso } from '../utils/sanatorium';

type Seg = 'arrivals' | 'departures' | 'rooms';

export default function StaysScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('room_keeper', 'registrar');
  const [seg, setSeg] = useState<Seg>('arrivals');
  const [early, setEarly] = useState<Stay | null>(null);
  const dash = useQuery(dashboardQuery(allowed));
  const rooms = useQuery(availabilityQuery(todayIso(), 1, allowed && seg === 'rooms'));
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = async (stay: Stay, kind: 'in' | 'out') => {
    setBusyId(stay.id);
    try {
      await (kind === 'in' ? checkIn : checkOut).mutateAsync(stay.id);
      toast.success(t(kind === 'in' ? 'sanatorium.checkedIn' : 'sanatorium.checkedOut'));
    } catch (e) {
      // Leaving before the planned date is not a plain check-out: the server asks for the reason.
      if (kind === 'out' && sanErrorInfo(e).code === 'use_early_leave') setEarly(stay);
      else toast.error(sanErrorMessage(e, t('errors.generic')));
    } finally {
      setBusyId(null);
    }
  };

  const options = useMemo(
    () => [
      { value: 'arrivals' as const, label: t('sanatorium.arrivals'), count: dash.data?.arrivals?.length },
      { value: 'departures' as const, label: t('sanatorium.departures'), count: dash.data?.departures?.length },
      { value: 'rooms' as const, label: t('sanatorium.rooms') },
    ],
    [t, dash.data],
  );
  if (!allowed) return <Denied />;

  const openGuest = (s: Stay) => s.guest && router.push({ pathname: '/sanatorium-guest', params: { id: String(s.guest.id) } });
  const list = (items: Stay[], emptyKey: string) =>
    items.length === 0 ? (
      <EmptyState title={t(emptyKey)} />
    ) : (
      <View style={styles.stack}>
        {items.map((s) => (
          <StayCard
            key={s.id}
            stay={s}
            canAct
            busy={busyId === s.id}
            onCheckIn={() => void run(s, 'in')}
            onCheckOut={() => void run(s, 'out')}
            onEarlyLeave={() => setEarly(s)}
            onOpen={() => openGuest(s)}
          />
        ))}
      </View>
    );

  return (
    <Screen
      refreshing={dash.isRefetching || rooms.isRefetching}
      onRefresh={() => {
        void dash.refetch();
        if (seg === 'rooms') void rooms.refetch();
      }}
      testID="sanatorium-stays-screen"
    >
      <PageHeader title={t('sanatorium.nav.stays')} subtitle={fmtDate(todayIso())} />
      <Segmented options={options} value={seg} onChange={setSeg} testID="stays-seg" />
      <View style={styles.body}>
        {seg !== 'rooms' && (
          <QueryBlock query={dash}>
            {(d) => (seg === 'arrivals' ? list(d.arrivals ?? [], 'sanatorium.noArrivals') : list(d.departures ?? [], 'sanatorium.noDepartures'))}
          </QueryBlock>
        )}
        {seg === 'rooms' && (
          <QueryBlock query={rooms}>
            {(a) =>
              a.rooms.length === 0 ? <EmptyState title={t('sanatorium.noRooms')} /> : (
                <View style={styles.stack}>{a.rooms.map((r) => <RoomCard key={r.id} room={r} />)}</View>
              )
            }
          </QueryBlock>
        )}
      </View>
      <EarlyLeaveSheet stay={early} onClose={() => setEarly(null)} />
    </Screen>
  );
}

function RoomCard({ room }: { room: AvailabilityRoom }) {
  const { t } = useTranslation();
  const free = room.out_of_service ? 0 : room.free_today;
  return (
    <Card testID={`room-${room.id}`}>
      <View style={styles.roomHead}>
        <View style={styles.flex}>
          <Text variant="heading">{t('sanatorium.room')} {room.number}</Text>
          <Text variant="caption" tone="muted">
            {[room.building, room.floor != null ? `${room.floor}-${t('sanatorium.floor')}` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {room.out_of_service ? (
          <Badge label={t('sanatorium.outOfService')} tone="danger" />
        ) : (
          <Badge label={`${t('sanatorium.freeBeds')}: ${free}/${room.capacity}`} tone={free > 0 ? 'success' : 'warning'} />
        )}
      </View>
      {!room.out_of_service && free === 0 && room.free_from && (
        <Text variant="caption" tone="muted">{t('sanatorium.freeFrom')}: {fmtDate(room.free_from)}</Text>
      )}
      {room.stays.map((s) => (
        <View key={s.stay_id} style={styles.guestLine}>
          <Text variant="body" onPress={() => router.push({ pathname: '/sanatorium-guest', params: { id: String(s.guest.id) } })}>
            {s.guest.full_name}
          </Text>
          <PhoneLink phone={s.guest.phone} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { marginTop: 12 },
  stack: { gap: 10 },
  roomHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  guestLine: { paddingTop: 6 },
});
