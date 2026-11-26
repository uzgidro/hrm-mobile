// Kitchen / room keeper: today's arrivals and departures in one strip (no money, no phone).
// Renders nothing when the server has no work queue yet.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, ListRow, SectionHeader, Text } from '@/ui';
import { fmtDate } from '../../utils/sanatorium';
import { todayQuery } from '../api';
import type { QueueItem } from '../types';

const KINDS = ['arrival_today', 'arrival_overdue', 'departure_today', 'overstay'];

export function ArrivalsStrip({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const q = useQuery(todayQuery(enabled));
  if (!enabled || !q.data) return null;
  const items = q.data.items.filter((i: QueueItem) => KINDS.includes(i.kind));
  const arrivals = items.filter((i) => i.kind.startsWith('arrival'));
  const leaving = items.filter((i) => !i.kind.startsWith('arrival'));
  const line = (i: QueueItem) => (
    <ListRow
      key={i.key}
      title={`${i.guest?.full_name ?? '—'}${(i.group_size ?? 1) > 1 ? ` +${(i.group_size ?? 1) - 1}` : ''}`}
      subtitle={[i.room ? `${t('sanatorium.room')} ${i.room.number}` : t('sanatorium.noRoom'), i.planned_to ? fmtDate(i.planned_to) : null].filter(Boolean).join(' · ')}
      chevron={!!i.stay_id}
      onPress={i.stay_id ? () => router.push({ pathname: '/sanatorium-stay', params: { id: String(i.stay_id) } }) : undefined}
    />
  );
  return (
    <View style={styles.stack} testID="arrivals-strip">
      <SectionHeader title={`${t('sanSimple.strip.arrivals')} (${arrivals.length})`} />
      <Card>{arrivals.length === 0 ? <Text variant="body" tone="muted">{t('sanatorium.noArrivals')}</Text> : arrivals.map(line)}</Card>
      <SectionHeader title={`${t('sanSimple.strip.departures')} (${leaving.length})`} />
      <Card>{leaving.length === 0 ? <Text variant="body" tone="muted">{t('sanatorium.noDepartures')}</Text> : leaving.map(line)}</Card>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 4 } });
