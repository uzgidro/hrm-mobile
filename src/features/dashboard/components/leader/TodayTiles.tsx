// 4 ta bugungi tile (maket b-light o'ng ustuni): tabelda / kelganlar / kech / kelmadi.
// Har biri filtrlangan davomat ro'yxatiga olib boradi.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StatTile } from '@/ui';
import type { StatusCounts } from '../../utils/attendanceBoard';
import { pct } from './useBoardDay';

export function TodayTiles({ counts, columns = 2 }: { counts: StatusCounts; columns?: 2 | 4 }) {
  const { t } = useTranslation();
  const go = (filter: string) => () => router.push(`/attendance-detail?filter=${filter}` as Href);
  const tiles = [
    <StatTile key="r" testID="tile-roster" label={t('dashboard.home.tileRoster')} value={counts.total} sub={t('dashboard.home.tileRosterSub')} icon="users" tint="violet" progress={counts.total ? 1 : 0} onPress={go('all')} />,
    <StatTile key="a" testID="tile-arrived" label={t('dashboard.home.tileArrived')} value={counts.arrived} sub={t('dashboard.home.tileArrivedSub', { pct: pct(counts.arrived, counts.total) })} icon="check" tint="green" progress={counts.total ? counts.arrived / counts.total : 0} onPress={go('present')} />,
    <StatTile key="l" testID="tile-late" label={t('dashboard.home.tileLate')} value={counts.late} sub={t('dashboard.home.tileLateSub', { pct: pct(counts.late, counts.total) })} icon="clock" tint="amber" progress={counts.total ? counts.late / counts.total : 0} onPress={go('late')} />,
    <StatTile key="x" testID="tile-absent" label={t('dashboard.home.tileAbsent')} value={counts.absent} sub={t('dashboard.home.tileAbsentSub', { pct: pct(counts.absent, counts.total) })} icon="close" tint="pink" progress={counts.total ? counts.absent / counts.total : 0} onPress={go('absent')} />,
  ];
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.key} style={{ flexBasis: columns === 4 ? '23%' : '47%', flexGrow: 1 }}>
          {tile}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
