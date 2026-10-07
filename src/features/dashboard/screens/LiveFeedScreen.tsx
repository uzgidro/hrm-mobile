// «Jonli tashrif» to'liq ekrani (2026-10-07, foydalanuvchi: «ustiga bosib batafsil ko'radigan,
// eventdagi rasmi va scroll qilib boshqa eventlarni ham ko'radigan»). Kunning barcha o'tishlari
// (web v2 LiveFeed bilan bir manba — `day-board?latest=-1`), qidiruv, kirish/chiqish filtri, kun
// tanlash. Qator bosilsa — o'tish surati, joy, xarita (LiveEventRow → AttendanceEventDetailModal).
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBox } from '@/components/SearchBox';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { useActiveBranchId } from '@/lib/useActiveBranch';
import { foldText } from '@/utils/searchFold';
import { EmptyState, ErrorState, Segmented, Skeleton, Text } from '@/ui';
import { dayFeedQuery } from '../api/queries';
import { hydrateDayBoard, isExitEvent, type BoardEvent } from '../utils/attendanceBoard';
import { eventPerson, LiveEventRow } from '../components/leader/LiveEventRow';

type Dir = 'all' | 'in' | 'out';

export default function LiveFeedScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const branchId = useActiveBranchId();
  // `?day=YYYY-MM-DD` — bildirishnoma/havoladan aniq kunni ochish uchun (bo'lmasa bugun).
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(() =>
    typeof params.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.day) && !dayjs(params.day).isAfter(dayjs(), 'day')
      ? params.day
      : dayjs().format('YYYY-MM-DD'),
  );
  const [dir, setDir] = useState<Dir>('all');
  const [search, setSearch] = useState('');
  const isToday = day === dayjs().format('YYYY-MM-DD');
  const q = useQuery(dayFeedQuery(branchId, day, isToday));
  const board = useMemo(() => hydrateDayBoard(q.data), [q.data]);

  const rows = useMemo(() => {
    const needle = foldText(search);
    return board.latest.filter((e: BoardEvent) => {
      if (dir === 'in' && isExitEvent(e)) return false;
      if (dir === 'out' && !isExitEvent(e)) return false;
      if (!needle) return true;
      const who = eventPerson(e);
      return foldText(`${who.name} ${who.sub ?? ''}`).includes(needle);
    });
  }, [board.latest, dir, search]);

  const shift = (n: number) => setDay((d) => dayjs(d).add(n, 'day').format('YYYY-MM-DD'));
  const dateNav = (
    <View style={styles.nav}>
      <TouchableOpacity onPress={() => shift(-1)} style={[styles.navBtn, { borderColor: c.border }]} accessibilityLabel={t('common.back')} testID="feed-prev">
        <Icon name="chevronLeft" size={18} color={c.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => shift(1)}
        disabled={isToday}
        style={[styles.navBtn, { borderColor: c.border }, isToday && styles.disabled]}
        testID="feed-next"
      >
        <Icon name="chevronRight" size={18} color={isToday ? c.textMuted : c.text} />
      </TouchableOpacity>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: BoardEvent }) => <LiveEventRow e={item} />, []);

  const header = (
    <View style={styles.head}>
      <View style={styles.counters}>
        <View style={[styles.counter, { backgroundColor: c.successSoft }]}>
          <Text variant="caption" tone="muted">{t('dashboard.home.entries')}</Text>
          <Text variant="number" testID="feed-entries">{String(board.entries)}</Text>
        </View>
        <View style={[styles.counter, { backgroundColor: c.brandSoft }]}>
          <Text variant="caption" tone="muted">{t('dashboard.home.exits')}</Text>
          <Text variant="number" testID="feed-exits">{String(board.exits)}</Text>
        </View>
      </View>
      <SearchBox value={search} onChangeText={setSearch} placeholder={t('dashboard.home.feedSearch')} testID="feed-search" />
      <Segmented<Dir>
        testID="feed-dir"
        value={dir}
        onChange={setDir}
        options={[
          { value: 'all', label: t('dashboard.home.feedAll') },
          { value: 'in', label: t('dashboard.home.feedIn') },
          { value: 'out', label: t('dashboard.home.feedOut') },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title={t('dashboard.home.live')}
        subtitle={isToday ? t('dashboard.home.today') : dayjs(day).format('DD.MM.YYYY')}
        right={dateNav}
      />
      {q.isError ? (
        <ErrorState message={getApiErrorMessage(q.error, t('errors.refreshFailed'))} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          testID="feed-list"
          data={q.isPending ? [] : rows}
          keyExtractor={(e, i) => String(e.id ?? i)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            q.isPending ? <Skeleton height={240} /> : <EmptyState title={t('dashboard.home.feedEmpty')} />
          }
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          maxToRenderPerBatch={30}
          windowSize={11}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  head: { gap: 10, paddingTop: 8, paddingBottom: 6 },
  counters: { flexDirection: 'row', gap: 10 },
  counter: { flex: 1, borderRadius: radii.md, padding: 12 },
  nav: { flexDirection: 'row', gap: 6 },
  navBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
});
