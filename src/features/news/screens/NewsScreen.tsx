import { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
import { PagedList } from '@/components/PagedList';
import { SearchBox } from '@/components/SearchBox';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { newsListQuery, newsBranchesQuery } from '../api/queries';
import { useDeleteNewsPost } from '../api/mutations';
import { Icon } from '@/components/Icon';
import { confirm } from '@/lib/confirm';

type Styles = ReturnType<typeof makeStyles>;

const NewsCard = memo(function NewsCard(
  { item, styles, grid, branchName, onEdit, onDelete }:
  { item: NewsPost; styles: Styles; grid?: boolean; branchName?: string; onEdit?: () => void; onDelete?: () => void },
) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // `GET news-posts` has no author (web does not show one either) — the card
  // leads with the date; the branch tag below says who it was addressed to.
  return (
    <View style={[styles.card, grid && styles.cardGrid]}>
      <View style={styles.cardHeader}>
        <View style={styles.authorInfo}>
          <Text style={styles.newsDate}>{dayjs(item.created_at).format('DD.MM.YYYY HH:mm')}</Text>
        </View>
        {/* Manager actions (web NewsPage edit/delete parity). */}
        {!!onEdit && (
          <TouchableOpacity onPress={onEdit} hitSlop={8} accessibilityLabel={t('common.edit')} style={styles.cardAction}>
            <Icon name="edit" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        {!!onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8} accessibilityLabel={t('common.delete')} style={styles.cardAction}>
            <Icon name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.newsTitle}>{item.title}</Text>
      {item.description ? <Text style={styles.newsDesc} numberOfLines={4}>{item.description}</Text> : null}

      <View style={styles.tagWrapper}>
        {/* Filial NOMI ro'yxat javobida yo'q (faqat organization_branch_id) —
            web ham uni filiallar ro'yxatidan qidiradi (NewsPage branchName).
            Aks holda filialga yo'naltirilgan yangilik ham "Barcha xodimlarga"
            deb ko'rinardi. */}
        <Text style={styles.tag}>
          {branchName || t('news.allEmployees')}
        </Text>
      </View>
    </View>
  );
});

export default function NewsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.employee?.department?.organization_branch_id;
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const canManage = isNewsManager(user);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const query = useInfiniteQuery(newsListQuery(branchId, debouncedSearch));
  const deleteM = useDeleteNewsPost();
  const onDelete = async (item: NewsPost) => {
    if (deleteM.isPending) return;
    const ok = await confirm({
      title: t('news.deleteConfirmTitle'),
      message: item.title,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) deleteM.mutate(item.id);
  };
  // Filial nomlari — yangilik qaysi filialga yo'naltirilganini yozish uchun
  // (ro'yxat javobida faqat `organization_branch_id` bor). Forma ham shu
  // keshdan foydalanadi.
  const { data: branches = [] } = useQuery(newsBranchesQuery(true));
  const branchNameById = useMemo(
    () => new Map(branches.map((b) => [Number(b.id), b.name])),
    [branches],
  );

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t('news.title')}
        right={canManage ? <HeaderAction icon="plus" onPress={() => router.push('/create-news')} /> : undefined}
      />
      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('news.searchPlaceholder')} />
      </View>
      <PagedList
        query={query}
        keyExtractor={(item) => String(item.id)}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.content}
        emptyIcon="news"
        emptyTitle={search ? t('common.notFound') : t('news.empty')}
        emptyMessage={search ? undefined : t('news.emptyMessage')}
        hideCount
        renderItem={(item) => (
          <NewsCard
            item={item}
            styles={styles}
            grid={cols > 1}
            branchName={item.organization_branch_id != null
              ? branchNameById.get(Number(item.organization_branch_id))
              : undefined}
            onEdit={canManage ? () => router.push({ pathname: '/create-news', params: { id: String(item.id) } }) : undefined}
            onDelete={canManage ? () => onDelete(item) : undefined}
          />
        )}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
    gridRow: { gap: 12 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardGrid: { flex: 1 },
    cardAction: { padding: 6, borderRadius: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    authorInfo: { flex: 1 },
    newsDate: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    newsTitle: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 23, marginBottom: 8 },
    newsDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginBottom: 10 },

    tagWrapper: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: c.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    tag: { fontSize: 12, color: c.primary, fontWeight: '600' },
  });
