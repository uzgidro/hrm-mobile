// Xodim panelidagi 4 ta StatTile. Faqat haqiqiy manbalardan: oyning o'z
// voqealari, o'z so'rovlari, menu-badges (hujjatlar, o'qilmagan bildirishnomalar).
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StatTile } from '@/ui';
import { useBreakpoint } from '@/utils/responsive';

export type MyStats = { daysPresent: number; pendingRequests: number; docsWaiting: number; unread: number };

export function MyStatsStrip({ stats }: { stats: MyStats }) {
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  const tiles = [
    <StatTile
      key="days"
      testID="stat-days"
      label={t('dashboard.home.statDays')}
      value={stats.daysPresent}
      sub={t('dashboard.home.statDaysSub', { count: stats.daysPresent })}
      icon="calendar"
      tint="green"
      onPress={() => router.push('/(tabs)/attendance' as Href)}
    />,
    <StatTile
      key="req"
      testID="stat-requests"
      label={t('dashboard.home.statRequests')}
      value={stats.pendingRequests}
      sub={t('dashboard.home.statRequestsSub')}
      icon="checklist"
      tint="amber"
      onPress={() => router.push('/work-leaves' as Href)}
    />,
    <StatTile
      key="docs"
      testID="stat-docs"
      label={t('dashboard.home.statDocs')}
      value={stats.docsWaiting}
      sub={t('dashboard.home.statDocsSub')}
      icon="orders"
      tint="orange"
      onPress={() => router.push('/(tabs)/documents' as Href)}
    />,
    <StatTile
      key="notif"
      testID="stat-notif"
      label={t('dashboard.home.statNotif')}
      value={stats.unread}
      sub={t('dashboard.home.statNotifSub')}
      icon="bell"
      tint="drop"
      onPress={() => router.push('/notifications' as Href)}
    />,
  ];

  if (sizeClass === 'compact') {
    // Telefonda gorizontal lenta (160dp tile'lar) — ekran uzunligi tejaladi.
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {tiles.map((tile) => (
          <View key={tile.key} style={styles.stripItem}>
            {tile}
          </View>
        ))}
      </ScrollView>
    );
  }
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.key} style={styles.gridItem}>
          {tile}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 10, paddingRight: 16 },
  stripItem: { width: 160 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexGrow: 1, flexBasis: '46%' },
});
