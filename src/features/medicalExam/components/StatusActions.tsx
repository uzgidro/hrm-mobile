// The three one-tap door actions of a doctor: Joyida / Tashqarida / Kelmagan.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip } from '@/ui';
import { MANUAL_STATIONS, stationTone, type ManualStationStatus, type StationStatus } from '../utils/medicalExam';

export function StatusActions({
  stationId,
  current,
  disabled,
  onSet,
}: {
  stationId: number;
  current: StationStatus;
  disabled?: boolean;
  onSet: (stationId: number, status: ManualStationStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {MANUAL_STATIONS.map((s) => (
        <Chip
          key={s}
          testID={`station-${stationId}-set-${s}`}
          label={t(`medicalExam.station.${s}`)}
          tone={stationTone(s)}
          selected={current === s}
          tintSelected
          onPress={disabled || current === s ? undefined : () => onSet(stationId, s)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
