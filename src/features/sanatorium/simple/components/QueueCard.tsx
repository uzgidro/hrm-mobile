// One card of the work queue: what happened, who, the one thing to do now (and a quiet second one).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { toneColors, type Tone } from '@/ui/Chip';
import { Badge, Button, Card, Text } from '@/ui';
import { PhoneLink } from '../../components/common';
import { fmtMoney } from '../../utils/sanatorium';
import type { QueueItem, QueueUrgency } from '../types';
import { hasDebt, queueActions, shownMissing } from '../utils';
import { useRoomText, useWhen } from './parts';

const TONE: Record<QueueUrgency, Tone> = { overdue: 'danger', today: 'info', soon: 'neutral' };
const ICON: Record<string, IconName> = {
  request_new: 'inbox', waitlist_offered: 'clock', arrival_overdue: 'bell', arrival_today: 'arrowDown', no_exam: 'user', no_room: 'building',
  service_request: 'gift', transfer_request: 'briefcase', departure_today: 'logout', overstay: 'clock', debt: 'wallet',
};
const short = (iso: string) => dayjs(iso).format('DD.MM');

export function QueueCard({ item, busy, readOnly = false, onAction, onOpen }: { item: QueueItem; busy?: boolean; readOnly?: boolean; onAction: (action: string) => void; onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const when = useWhen();
  const roomText = useRoomText();
  const { primary, secondary } = queueActions(item);
  const p = item.title_params ?? {};
  const name = item.guest?.full_name ?? String(p.name ?? '—');
  const size = item.group_size ?? 1;
  const people = size > 1 ? size : Number(p.count) > 1 ? Number(p.count) : 0;
  const tone = toneColors(c, TONE[item.urgency]);
  const dir = p.direction === 'from' || p.direction === 'departure' ? 'from' : p.direction === 'to' || p.direction === 'arrival' ? 'to' : null;
  const details = [
    item.room ? roomText(item.room) : null,
    item.planned_from && item.planned_to ? `${short(item.planned_from)} — ${short(item.planned_to)}` : null,
    // For a request the time is when it was sent, not when the guest comes.
    item.at ? (item.kind === 'request_new' || item.kind === 'waitlist_offered' ? t('sanFlow.queue.sentAt', { when: when(item.at) }) : when(item.at)) : null,
    typeof p.service === 'string' ? p.service : null,
    dir ? t(`sanFlow.today.direction.${dir}`) : null,
  ].filter(Boolean);
  const missing = shownMissing(item);
  return (
    <Card testID={`queue-${item.key}`}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: tone.soft }]}><Icon name={ICON[item.kind] ?? 'users'} size={20} color={tone.fg} /></View>
        <View style={styles.flex}>
          <Text variant="caption" weight="700" style={{ color: tone.fg }} testID={`queue-kind-${item.key}`}>{t(`sanSimple.kind.${item.kind}`, { defaultValue: item.kind })}</Text>
          <Text variant="heading" onPress={onOpen} testID={`queue-open-${item.key}`}>{name}</Text>
        </View>
        {people > 1 && <Badge label={t('sanFlow.common.peopleN', { n: people })} tone="brand" testID={`queue-people-${item.key}`} />}
      </View>
      {size > 1 && !!item.members?.length && <Text variant="caption" tone="muted">{item.members.map((m) => m.full_name).join(', ')}</Text>}
      {details.length > 0 && <Text variant="label" tone="muted" testID={`queue-details-${item.key}`}>{details.join(' · ')}</Text>}
      <PhoneLink phone={item.guest?.phone} />
      {(missing.length > 0 || hasDebt(item.debt)) && (
        <View style={styles.chips}>
          {missing.map((m) => <Badge key={m} label={t(`sanSimple.missing.${m}`, { defaultValue: m })} tone="warning" testID={`queue-missing-${m}`} />)}
          {hasDebt(item.debt) && <Badge label={t('sanFlow.queue.debt', { sum: fmtMoney(item.debt) })} tone="danger" testID={`queue-debt-${item.key}`} />}
        </View>
      )}
      {!readOnly && (
        <View style={styles.actions}>
          <Button testID={`queue-act-${item.key}`} label={t(`sanSimple.action.${primary}`, { defaultValue: primary })} size="lg" full loading={busy} onPress={() => onAction(primary)} />
          {!!secondary && <Button testID={`queue-act2-${item.key}`} label={t(`sanSimple.action.${secondary}`, { defaultValue: secondary })} variant="soft" full disabled={busy} onPress={() => onAction(secondary)} />}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  actions: { gap: 8, marginTop: 12 },
});
