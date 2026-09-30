// «Bugungi yo'lim»: 07–23 oynasida ichkarida bo'lgan oraliqlar (brand pill),
// hozirgi vaqt — qizil chiziq.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Badge, Card, Text } from '@/ui';
import type { DayTimeline } from '../../utils/dayTimeline';

const FROM = 7;
const TO = 23;
const TICKS = [7, 9, 11, 13, 15, 17, 19, 21, 23];

export function DayTimelineCard({ timeline, now = new Date() }: { timeline: DayTimeline; now?: Date }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const nowFrac = Math.min(1, Math.max(0, (now.getHours() * 60 + now.getMinutes() - FROM * 60) / ((TO - FROM) * 60)));
  return (
    <Card title={t('dashboard.home.todayPath')} icon="clock" tint="violet">
      <View style={styles.statusRow}>
        {timeline.segments.length === 0 ? (
          <Text variant="caption" tone="subtle">
            {t('dashboard.home.noPasses')}
          </Text>
        ) : (
          <Badge
            label={timeline.inside ? t('dashboard.home.inside') : t('dashboard.home.outside')}
            tone={timeline.inside ? 'success' : 'neutral'}
          />
        )}
      </View>
      <View
        style={[styles.track, { backgroundColor: c.surface2 }]}
        accessible
        accessibilityLabel={t('dashboard.home.todayPath')}
      >
        {timeline.segments.map((s, i) => (
          <View
            key={i}
            style={[
              styles.seg,
              { left: `${s.start * 100}%`, width: `${Math.max(1, (s.end - s.start) * 100)}%`, backgroundColor: c.brand },
            ]}
          />
        ))}
        <View style={[styles.now, { left: `${nowFrac * 100}%`, backgroundColor: c.dangerMark }]} />
      </View>
      <View style={styles.ticks}>
        {TICKS.map((h) => (
          <Text key={h} variant="caption" tone="subtle" style={styles.tick}>
            {String(h).padStart(2, '0')}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', marginBottom: 10 },
  track: { height: 18, borderRadius: radii.pill, overflow: 'hidden' },
  seg: { position: 'absolute', top: 3, bottom: 3, borderRadius: radii.pill },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tick: { fontSize: 10, fontVariant: ['tabular-nums'] },
});
