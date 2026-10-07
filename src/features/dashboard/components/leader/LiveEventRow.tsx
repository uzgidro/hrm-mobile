// «Jonli tashrif» hodisa qatori: o'tish surati (turniket kamerasi; bo'lmasa profil rasmi), kim,
// vaqt, kirdi/chiqdi. Bosilsa — tafsilot (katta surat, joy, xarita), 2026-10-07.
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AttendanceEventDetailModal } from '@/components/AttendanceEventRow';
import { formatDistance } from '@/features/checkin/lib/capture';
import { Avatar, Badge, ListRow, Text } from '@/ui';
import type { AttendanceEvent } from '@/types';
import { formatTime, isExitEvent, type BoardEvent } from '../../utils/attendanceBoard';

export function eventPerson(e: BoardEvent): { name: string; sub: string | null; guest: boolean } {
  if (e.employee) {
    return {
      name: e.employee.legal_name ?? '—',
      sub: e.employee.job_position?.name ?? e.employee.department?.name ?? null,
      guest: false,
    };
  }
  if (e.visitor) return { name: e.visitor.legal_name ?? '—', sub: e.visitor.organization_name ?? null, guest: true };
  return { name: '—', sub: null, guest: false };
}

export const LiveEventRow = memo(function LiveEventRow({ e }: { e: BoardEvent }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const out = isExitEvent(e);
  const who = eventPerson(e);
  const phone = e.mobile_checkin;
  const subtitle = phone
    ? [t('checkin.viaPhone'), phone.nearest_location?.name || phone.destination_branch?.name].filter(Boolean).join(' · ')
    : [who.sub, e.turnstile_name].filter(Boolean).join(' · ');
  const farNote = phone?.is_far ? t('dashboard.home.phoneFar', { distance: formatDistance(phone.distance_m) ?? '' }) : null;
  return (
    <>
      <ListRow
        testID={`live-event-${e.id}`}
        title={who.name}
        subtitle={subtitle || undefined}
        // O'tish surati (kamera ko'rgan yuz: kichik nusxa, bo'lmasa to'liq) — u ham bo'lmasa profil
        // rasmi (web v2 LiveFeed tartibi). Hodisalarning ko'pida kichik nusxa yo'q (TEST 09-03).
        left={
          <Avatar
            name={who.name}
            thumb={e.photo_thumb_path || null}
            uri={e.photo_path || e.employee?.photo_thumb_path || e.employee?.photo_path || e.visitor?.photo_path}
            size={40}
          />
        }
        right={
          <View style={styles.right}>
            <Text variant="label" style={styles.time}>
              {formatTime(e.happen_time)}
            </Text>
            <Badge label={out ? t('dashboard.home.exited') : t('dashboard.home.entered')} tone={out ? 'brand' : 'success'} />
            {who.guest && <Badge label={t('dashboard.home.guest')} tone="info" />}
            {phone?.is_far && <Badge label={t('checkin.far')} tone="warning" />}
          </View>
        }
        onPress={() => setOpen(true)}
      />
      {open && (
        <AttendanceEventDetailModal
          visible
          event={e as unknown as AttendanceEvent}
          onClose={() => setOpen(false)}
          person={{
            name: who.name,
            subtitle: [who.sub, e.employee?.department?.name !== who.sub ? e.employee?.department?.name : null].filter(Boolean).join(' · ') || null,
            photo: e.employee?.photo_path ?? e.visitor?.photo_path,
            photoThumb: e.employee?.photo_thumb_path,
          }}
          note={farNote}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontVariant: ['tabular-nums'], fontWeight: '700' },
});
