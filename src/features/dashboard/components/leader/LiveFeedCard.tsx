// «Jonli tashrif»: bugungi kirish/chiqish soni + so'nggi harakatlar (v2 LiveFeed).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { Card, Skeleton, Text } from '@/ui';
import { type HydratedBoard } from '../../utils/attendanceBoard';
import { LiveEventRow } from './LiveEventRow';

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
      // «Barchasi» — kunning barcha o'tishlari (ilgari xodimlar ro'yxatiga olib borardi).
      action={{ label: t('common.all'), onPress: () => router.push('/jonli-tashrif' as Href) }}
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
        // Qator bosilsa — o'tish surati, joy, xarita (2026-10-07).
        board.latest.slice(0, limit).map((e, i) => <LiveEventRow key={e.id ?? i} e={e} />)
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  counters: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  counter: { flex: 1, borderRadius: radii.md, padding: 12 },
});
