import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Image, ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { NEWS_POSTS } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { NewsPost } from '../src/types';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon } from '../src/components/Icon';

export default function NewsScreen() {
  const { user } = useAuthStore();
  const branchId = user?.employee?.department?.organization_branch_id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = useCallback(async () => {
    try {
      const res = await apiClient.get(NEWS_POSTS, {
        params: branchId ? { organization_branch_id: branchId } : {},
      });
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setNews(items);
    } catch {} finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadNews(); }, [loadNews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNews();
    setRefreshing(false);
  }, [loadNews]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Yangiliklar" />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {news.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <View style={styles.emptyIconWrap}><Icon name="news" size={30} color={colors.textMuted} /></View>
              <Text style={styles.emptyTitle}>Yangiliklar yo'q</Text>
              <Text style={styles.emptyText}>Hozircha yangiliklar mavjud emas</Text>
            </View>
          ) : (
            news.map((item) => (
              <View key={item.id} style={styles.card}>
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
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

    emptyWrapper: { alignItems: 'center', paddingTop: 90, gap: 10 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 14, color: c.textSecondary },
  });
