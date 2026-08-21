import { memo, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  type ListRenderItem,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import type { NewsPost } from '@/types';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { Screen } from '@/components/Screen';
import { router } from 'expo-router';
import { isNewsManager } from '@/utils/roles';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { newsListQuery, newsBranchesQuery } from '../api/queries';

type Styles = ReturnType<typeof makeStyles>;

const NewsCard = memo(function NewsCard(
  { item, styles, grid, branchName }:
  { item: NewsPost; styles: Styles; grid?: boolean; branchName?: string },
) {
  const { t } = useTranslation();
  // MUALLIF: `GET news-posts` muallifni QAYTARMAYDI (web ham ko'rsatmaydi) —
  // shu bois avatar+ism faqat backend uni bergan holatda chiziladi, aks holda
  // sana yolg'iz sarlavha bo'ladi. Ilgari bu yerda har doim "Admin" degan
  // soxta muallif va bo'sh avatar turardi.
  const author = item.author;
  return (
    <View style={[styles.card, grid && styles.cardGrid]}>
      <View style={styles.cardHeader}>
        {author ? <EmployeeAvatar emp={author} size={42} /> : null}
        <View style={styles.authorInfo}>
          {author ? <Text style={styles.authorName}>{author.legal_name}</Text> : null}
          <Text style={styles.newsDate}>{dayjs(item.created_at).format('DD.MM.YYYY HH:mm')}</Text>
        </View>
      </View>

      <Text style={styles.newsTitle}>{item.title}</Text>
      {item.description ? <Text style={styles.newsDesc} numberOfLines={4}>{item.description}</Text> : null}

      <View style={styles.tagWrapper}>
        {/* Filial NOMI ro'yxat javobida yo'q (faqat organization_branch_id) —
            web ham uni filiallar ro'yxatidan qidiradi (NewsPage branchName).
            Aks holda filialga yo'naltirilgan yangilik ham "Barcha xodimlarga"
            deb ko'rinardi. */}
        <Text style={styles.tag}>
          {item.organization_branch?.name || branchName || t('news.allEmployees')}
        </Text>
      </View>
    </View>
  );
});

export default function NewsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.employee?.department?.organization_branch_id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const canManage = isNewsManager(user);

  const { data: news = [], isLoading, refetch, isFetching } = useQuery(newsListQuery(branchId));
  // Filial nomlari — yangilik qaysi filialga yo'naltirilganini yozish uchun
  // (ro'yxat javobida faqat `organization_branch_id` bor). Forma ham shu
  // keshdan foydalanadi.
  const { data: branches = [] } = useQuery(newsBranchesQuery(true));
  const branchNameById = useMemo(
    () => new Map(branches.map((b) => [Number(b.id), b.name])),
    [branches],
  );

  const renderItem = useCallback<ListRenderItem<NewsPost>>(
    ({ item }) => (
      <NewsCard
        item={item}
        styles={styles}
        grid={cols > 1}
        branchName={item.organization_branch_id != null
          ? branchNameById.get(Number(item.organization_branch_id))
          : undefined}
      />
    ),
    [styles, cols, branchNameById],
  );

  const keyExtractor = useCallback((item: NewsPost) => String(item.id), []);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t('news.title')}
        right={canManage ? <HeaderAction icon="plus" onPress={() => router.push('/create-news')} /> : undefined}
      />
      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={news}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="news"
              title={t('news.empty')}
              message={t('news.emptyMessage')}
            />
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
    gridRow: { gap: 12 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardGrid: { flex: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    authorInfo: { flex: 1 },
    authorName: { fontSize: 14, fontWeight: '700', color: c.text },
    newsDate: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    newsTitle: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 23, marginBottom: 8 },
    newsDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 10 },

    tagWrapper: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: c.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    tag: { fontSize: 12, color: c.primary, fontWeight: '600' },
  });
