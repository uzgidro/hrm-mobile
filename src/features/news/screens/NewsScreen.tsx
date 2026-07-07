import { SafeAreaView } from 'react-native-safe-area-context';
import { memo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Image,
  type ListRenderItem,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { NewsPost } from '@/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { newsListQuery } from '../api/queries';

type Styles = ReturnType<typeof makeStyles>;

const NewsCard = memo(function NewsCard({ item, styles }: { item: NewsPost; styles: Styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.author?.photo_path ? (
          <Image source={{ uri: item.author.photo_path }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(item.author?.legal_name || 'A').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author?.legal_name || 'Admin'}</Text>
          <Text style={styles.newsDate}>{dayjs(item.created_at).format('DD.MM.YYYY HH:mm')}</Text>
        </View>
      </View>

      <Text style={styles.newsTitle}>{item.title}</Text>
      {item.description ? <Text style={styles.newsDesc} numberOfLines={4}>{item.description}</Text> : null}

      <View style={styles.tagWrapper}>
        <Text style={styles.tag}>{item.organization_branch?.name || 'Barcha xodimlarga'}</Text>
      </View>
    </View>
  );
});

export default function NewsScreen() {
  const branchId = useAuthStore((s) => s.user?.employee?.department?.organization_branch_id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: news = [], isLoading, refetch, isFetching } = useQuery(newsListQuery(branchId));

  const renderItem = useCallback<ListRenderItem<NewsPost>>(
    ({ item }) => <NewsCard item={item} styles={styles} />,
    [styles],
  );

  const keyExtractor = useCallback((item: NewsPost) => String(item.id), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Yangiliklar" />
      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={news}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="news"
              title="Yangiliklar yo'q"
              message="Hozircha yangiliklar mavjud emas"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21 },
    avatarFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 17, fontWeight: '700', color: c.primary },
    authorInfo: { flex: 1 },
    authorName: { fontSize: 14, fontWeight: '700', color: c.text },
    newsDate: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    newsTitle: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 23, marginBottom: 8 },
    newsDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 10 },

    tagWrapper: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: c.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    tag: { fontSize: 12, color: c.primary, fontWeight: '600' },
  });
