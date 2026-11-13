// An appointment line (time, guest, specialty, room, status) used by dashboard, doctor and nurse lists.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, ListRow, Text } from '@/ui';
import type { Appointment } from '../types';
import { apptTone, fmtTime } from '../utils/sanatorium';

export function ApptRow({ appt, onPress }: { appt: Appointment; onPress?: () => void }) {
  const { t } = useTranslation();
  const sub = [appt.specialty, appt.room_number ? `${t('sanatorium.room')} ${appt.room_number}` : null].filter(Boolean).join(' · ');
  return (
    <ListRow
      testID={`appt-${appt.id}`}
      title={appt.guest?.full_name ?? `#${appt.guest_id}`}
      subtitle={sub}
      left={
        <Text variant="heading" tone="brand">
          {fmtTime(appt.scheduled_at)}
        </Text>
      }
      right={<Badge label={t(`sanatorium.apptStatus.${appt.status}`)} tone={apptTone(appt.status)} />}
      chevron={!!onPress}
      onPress={onPress}
    />
  );
}
