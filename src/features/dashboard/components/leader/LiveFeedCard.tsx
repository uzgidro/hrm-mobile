// «Jonli tashrif»: bugungi kirish/chiqish soni + so'nggi harakatlar (v2 LiveFeed).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { Avatar, Badge, Card, ListRow, Skeleton, Text } from '@/ui';
import { formatTime, isExitEvent, type HydratedBoard } from '../../utils/attendanceBoard';

export function LiveFeedCard({ board, loading, limit = 8 }: { board: HydratedBoard; loading: boolean; limit?: number }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const g = moduleTint(c, 'green');
  const v = moduleTint(c, 'violet');
  return (
    <Card
      title={t('dashboard.home.live')}
      icon="eye"
      tint="green"
      testID="card-live"
      action={{ label: t('common.all'), onPress: () => router.push('/attendance-detail' as Href) }}
    >
      <View style={styles.counters}>
        <View style={[styles.counter, { backgroundColor: g.wash }]} testID="live-entries">
          <Text variant="caption" tone="muted">
            {t('dashboard.home.entries')}
          </Text>
          <Text variant="number">{String(board.entries)}</Text>
        </View>
        <View style={[styles.counter, { backgroundColor: v.wash }]} testID="live-exits">
          <Text variant="caption" tone="muted">
            {t('dashboard.home.exits')}
          </Text>
          <Text variant="number">{String(board.exits)}</Text>
        </View>
      </View>
      {loading ? (
        <Skeleton height={160} />
      ) : board.latest.length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('dashboard.home.noLive')}
        </Text>
      ) : (
        board.latest.slice(0, limit).map((e, i) => {
          const name = e.employee?.legal_name ?? '—';
          const out = isExitEvent(e);
          return (
            <ListRow
              key={e.id ?? i}
              title={name}
              subtitle={e.employee?.job_position?.name ?? e.turnstile_name}
              left={<Avatar name={name} uri={e.employee?.photo_path} size={36} />}
              right={
                <View style={styles.right}>
                  <Text variant="label" style={styles.time}>
                    {formatTime(e.happen_time)}
                  </Text>
                  <Badge label={out ? t('dashboard.home.exited') : t('dashboard.home.entered')} tone={out ? 'brand' : 'success'} />
                </View>
              }
            />
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  counters: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  counter: { flex: 1, borderRadius: radii.md, padding: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontVariant: ['tabular-nums'], fontWeight: '700' },
});
