// One stay in the room keeper's arrivals / departures lists: guest, room, dates, status and the
// check-in / check-out / early-leave actions.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Text } from '@/ui';
import type { Stay } from '../types';
import { fmtDate, stayTone } from '../utils/sanatorium';
import { PhoneLink } from './common';

export function StayCard({
  stay,
  busy,
  canAct,
  onCheckIn,
  onCheckOut,
  onEarlyLeave,
  onOpen,
}: {
  stay: Stay;
  busy: boolean;
  canAct: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onEarlyLeave: () => void;
  onOpen?: () => void;
}) {
  const { t } = useTranslation();
  const room = stay.room ? [stay.room.number, stay.room.building].filter(Boolean).join(' · ') : t('sanatorium.noRoom');
  return (
    <Card testID={`stay-${stay.id}`}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="heading" numberOfLines={2} onPress={onOpen}>
            {stay.guest?.full_name ?? '—'}
          </Text>
          <Text variant="caption" tone="muted">
            {t('sanatorium.room')}: {room}
          </Text>
          <Text variant="caption" tone="muted">
            {fmtDate(stay.planned_from)} → {fmtDate(stay.planned_to)}
          </Text>
        </View>
        <Badge label={t(`sanatorium.stayStatus.${stay.status}`)} tone={stayTone(stay.status)} />
      </View>
      <PhoneLink phone={stay.guest?.phone} />
      {canAct && (stay.status === 'booked' || stay.status === 'checked_in') && (
        <View style={styles.actions}>
          {stay.status === 'booked' ? (
            <Button testID="stay-checkin" label={t('sanatorium.checkIn')} icon="check" size="sm" loading={busy} onPress={onCheckIn} />
          ) : (
            <>
              <Button testID="stay-checkout" label={t('sanatorium.checkOut')} icon="logout" size="sm" loading={busy} onPress={onCheckOut} />
              <Button testID="stay-early" label={t('sanatorium.earlyLeave')} variant="soft" size="sm" onPress={onEarlyLeave} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
