// Jadval qatori (v2 «Bookings» qatori): chapda vaqt, o'ngda mavzu, holat/jonli belgisi,
// seriya «3/10» va so'ragan. Jonli yig'ilish qizil fonda — Zoom bo'yicha (`is_live`),
// jadval bo'yicha emas: Zoom'ning o'zidan ochilgani ham ko'rinadi.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Badge, Text } from '@/ui';
import { inTashkent, statusTone, type ZoomMeeting } from '../utils/zoom';

/** Qizil «Jonli» belgisi: qachondan beri va nechta ishtirokchi. */
export function LiveMark({ m }: { m: ZoomMeeting }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  if (!m.is_live) return null;
  const since = inTashkent(m.live_since)?.format('HH:mm');
  const people = m.participant_count ?? 0;
  return (
    <View
      testID={`zoom-live-${m.id}`}
      accessibilityLabel={since ? t('zoom.liveSince', { time: since }) : t('zoom.live')}
      style={[styles.live, { backgroundColor: c.dangerSoft }]}
    >
      <View style={[styles.dot, { backgroundColor: c.dangerMark }]} />
      <Text variant="caption" tone="danger" weight="600">
        {since ? `${t('zoom.live')} · ${since}` : t('zoom.live')}
      </Text>
      {people > 0 && (
        <>
          <Icon name="users" size={12} color={c.danger} />
          <Text variant="caption" tone="danger">
            {String(people)}
          </Text>
        </>
      )}
    </View>
  );
}

export function MeetingRow({ m, onPress }: { m: ZoomMeeting; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const start = inTashkent(m.start_at);
  const end = inTashkent(m.end_at);
  return (
    <Pressable
      testID={`zoom-row-${m.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={m.topic || '—'}
      style={({ pressed }) => [
        styles.row,
        m.is_live && { backgroundColor: c.dangerSoft },
        pressed && { backgroundColor: c.surface2 },
      ]}
    >
      <View style={styles.time}>
        <Text variant="heading" weight="700">
          {start ? start.format('HH:mm') : '—'}
        </Text>
        {!!end && (
          <Text variant="caption" tone="subtle">
            {`– ${end.format('HH:mm')}`}
          </Text>
        )}
      </View>
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={2}>
          {m.topic || '—'}
        </Text>
        <View style={styles.badges}>
          {m.is_live ? (
            <LiveMark m={m} />
          ) : (
            <Badge
              testID={`zoom-status-${m.id}`}
              label={t(`zoom.status_${m.status}`, { defaultValue: m.status })}
              tone={statusTone(m.status)}
            />
          )}
          {m.source === 'zoom' && <Badge label={t('zoom.sourceZoom')} tone="info" />}
          {!!m.series_id && (
            <Badge
              label={t('zoom.seriesBadge', { index: m.series_index ?? '?', total: m.series_total ?? '?' })}
              tone="info"
            />
          )}
        </View>
        {!!m.requested_by?.legal_name && (
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {`${t('zoom.requestedBy')}: ${m.requested_by.legal_name}`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radii.md },
  time: { width: 56, alignItems: 'flex-start' },
  body: { flex: 1, minWidth: 0, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
