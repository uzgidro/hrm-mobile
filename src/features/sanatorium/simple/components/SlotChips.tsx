// Free appointment slots of one doctor for one day as tappable chips (hidden when the server has none).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/ui';
import { slotsQuery } from '../api';

export function SlotChips({ staffId, day, minutes, value, onPick }: { staffId: number | null; day: string; minutes: number; value: string; onPick: (iso: string) => void }) {
  const { t } = useTranslation();
  const q = useQuery(slotsQuery(staffId ?? 0, day, minutes, !!staffId));
  if (!staffId || q.isPending || !q.data) return null;
  if (q.data.length === 0) return <Text variant="caption" tone="muted" testID="slots-none">{t('sanSimple.slots.none')}</Text>;
  return (
    <View style={styles.wrap} testID="slot-chips">
      {q.data.slice(0, 12).map((s) => (
        <Button key={s} label={dayjs(s).format('HH:mm')} size="sm" variant={dayjs(s).isSame(dayjs(value)) ? 'primary' : 'soft'} onPress={() => onPick(s)} testID={`slot-${dayjs(s).format('HHmm')}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 } });
