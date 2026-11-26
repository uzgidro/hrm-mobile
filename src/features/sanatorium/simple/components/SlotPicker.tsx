// Free times of one doctor as chips. The nearest ones come with the doctor, «another day» asks the server.
// Only free times are ever offered, so «the doctor is busy» cannot be the answer to a pick.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Chip, Text } from '@/ui';
import { DateField } from '../../components/forms';
import { todayIso } from '../../utils/sanatorium';
import { slotsQuery } from '../api';
import { sameTime } from '../utils';
import { useWhen } from './parts';

export function SlotPicker({
  staffId, slots, value, onChange, min, max, minutes = 20, taken = [], testID = 'slots',
}: {
  staffId: number;
  slots: string[];
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  minutes?: number;
  /** Times given to other people of the same family. */
  taken?: string[];
  testID?: string;
}) {
  const { t } = useTranslation();
  const when = useWhen();
  const inList = !value || slots.some((s) => sameTime(s, value));
  const [day, setDay] = useState(inList ? '' : dayjs(value).format('YYYY-MM-DD'));
  const q = useQuery(slotsQuery(staffId, day, minutes, !!day));
  const shown = day ? (q.data ?? []) : slots;
  const floor = min && min > todayIso() ? min : todayIso();
  const pickDay = (v: string) => setDay(v < floor ? floor : max && v > max ? (max < floor ? floor : max) : v);
  return (
    <View style={styles.stack} testID={testID}>
      <View style={styles.wrap}>
        {shown.map((s) => {
          const other = !sameTime(s, value) && taken.some((x) => sameTime(x, s));
          return other ? (
            <Chip key={s} label={`${day ? dayjs(s).format('HH:mm') : when(s)} ×`} testID={`${testID}-taken-${dayjs(s).format('HHmm')}`} />
          ) : (
            <Chip key={s} label={day ? dayjs(s).format('HH:mm') : when(s)} selected={sameTime(s, value)} onPress={() => onChange(s)} testID={`${testID}-${dayjs(s).format('DDHHmm')}`} />
          );
        })}
        {!day && !inList && <Chip label={when(value)} selected testID={`${testID}-current`} />}
      </View>
      {!!day && !q.isPending && shown.length === 0 && <Text variant="caption" tone="muted" testID={`${testID}-none`}>{t('sanFlow.doctor.noSlotsDay')}</Text>}
      {!day && shown.length === 0 && <Text variant="caption" tone="muted" testID={`${testID}-none`}>{t('sanFlow.doctor.noSlots')}</Text>}
      <DateField label={t('sanFlow.doctor.otherDay')} value={day || null} onChange={pickDay} testID={`${testID}-day`} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 6 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
