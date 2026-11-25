// One card of the work queue: what happened, who, one main button (and a quiet second one).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Tone } from '@/ui/Chip';
import { Badge, Button, Card, Text } from '@/ui';
import { PhoneLink } from '../../components/common';
import { fmtDate, fmtMoney, fmtTime } from '../../utils/sanatorium';
import type { QueueItem, QueueUrgency } from '../types';
import { hasDebt, queueActions } from '../utils';

const TONE: Record<QueueUrgency, Tone> = { overdue: 'danger', today: 'info', soon: 'neutral' };

export function QueueCard({ item, busy, readOnly = false, onAction, onOpen }: { item: QueueItem; busy?: boolean; readOnly?: boolean; onAction: (action: string) => void; onOpen: () => void }) {
  const { t } = useTranslation();
  const { primary, secondary } = queueActions(item);
  const name = item.guest?.full_name ?? String(item.title_params?.name ?? '—');
  const size = item.group_size ?? 1;
  const dates = item.planned_from && item.planned_to ? `${fmtDate(item.planned_from)} → ${fmtDate(item.planned_to)}` : null;
  const kindLabel = t(`sanSimple.kind.${item.kind}`, { defaultValue: item.kind });
  return (
    <Card testID={`queue-${item.key}`}>
      <View style={styles.head}>
        <Badge label={kindLabel} tone={TONE[item.urgency]} testID={`queue-kind-${item.key}`} />
        {!!item.at && <Text variant="caption" tone="muted">{fmtTime(item.at)}</Text>}
      </View>
      <Text variant="heading" onPress={onOpen} style={styles.name}>
        {name}{size > 1 ? ` ${t('sanSimple.plusMore', { count: size - 1 })}` : ''}
      </Text>
      {size > 1 && !!item.members?.length && (
        <Text variant="caption" tone="muted">{item.members.map((m) => m.full_name).join(', ')}</Text>
      )}
      <PhoneLink phone={item.guest?.phone} />
      <Text variant="caption" tone="muted">
        {[item.room ? `${t('sanatorium.room')} ${item.room.number}` : null, dates].filter(Boolean).join(' · ')}
      </Text>
      {(item.missing ?? []).length > 0 && (
        <View style={styles.chips}>
          {item.missing!.map((m) => <Badge key={m} label={t(`sanSimple.missing.${m}`)} tone="warning" />)}
        </View>
      )}
      {hasDebt(item.debt) && <Text variant="label" tone="danger">{t('sanatorium.debt')}: {fmtMoney(item.debt)}</Text>}
      {!readOnly && <View style={styles.actions}>
        <Button testID={`queue-act-${item.key}`} label={t(`sanSimple.action.${primary}`, { defaultValue: primary })} size="lg" full loading={busy} onPress={() => onAction(primary)} />
        {!!secondary && (
          <Button testID={`queue-act2-${item.key}`} label={t(`sanSimple.action.${secondary}`, { defaultValue: secondary })} variant="soft" full disabled={busy} onPress={() => onAction(secondary)} />
        )}
      </View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { marginBottom: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  actions: { gap: 8, marginTop: 12 },
});
