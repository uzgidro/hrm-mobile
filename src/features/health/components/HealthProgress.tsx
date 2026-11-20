// One progress card instead of four stat tiles: «12 / 40 checked», a bar, and the
// three grade counts in a line. Used on the health screen and the home card.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, ProgressBar, Text, toneColors } from '@/ui';
import { HEALTH_STATUSES, STATUS_TONE, type rosterCounts } from '../utils/health';

type Counts = ReturnType<typeof rosterCounts>;

export function HealthCounts({ counts }: { counts: Counts }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  return (
    <View style={styles.counts}>
      {HEALTH_STATUSES.map((s) => (
        <View key={s} style={styles.count} testID={`health-count-${s}`}>
          <View style={[styles.dot, { backgroundColor: toneColors(c, STATUS_TONE[s] ?? 'neutral').fg }]} />
          <Text variant="caption" tone="muted">
            {t(`health.short_${s}`)} {counts[s]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function HealthProgress({ counts }: { counts: Counts }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const done = counts.total > 0 && counts.unchecked === 0;
  return (
    <Card style={styles.card} testID="health-progress">
      <View style={styles.head}>
        <Text variant="title">{t('health.progress', { checked: counts.checked, total: counts.total })}</Text>
        <Text variant="label" tone={done ? 'success' : 'muted'}>
          {done ? t('health.allDoneShort') : t('health.waiting', { count: counts.unchecked })}
        </Text>
      </View>
      <ProgressBar value={counts.total ? counts.checked / counts.total : 0} color={done ? c.success : undefined} />
      <HealthCounts counts={counts} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
