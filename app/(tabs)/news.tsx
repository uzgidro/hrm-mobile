import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image,
} from 'react-native';
import dayjs from 'dayjs';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { NEWS_POSTS } from '../../src/api/urls';
import { COLORS } from '../../src/constants';
import { NewsPost } from '../../src/types';

export default function NewsScreen() {
  const { user } = useAuthStore();
  const branchId = user?.employee?.department?.organization_branch_id;

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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        <Text style={styles.pageTitle}>Yangiliklar lentasi</Text>

        {loading ? (
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyText}>Yuklanmoqda...</Text>
          </View>
        ) : news.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Yangiliklar yo'q</Text>
            <Text style={styles.emptyText}>Hozircha yangiliklar mavjud emas</Text>
          </View>
        ) : (
          news.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.8}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrapper}>
                  {item.author?.photo_path ? (
                    <Image source={{ uri: item.author.photo_path }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>
                        {(item.author?.legal_name || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{item.author?.legal_name || 'Admin'}</Text>
                  <Text style={styles.newsDate}>
                    {dayjs(item.created_at).format('DD.MM.YYYY HH:mm:ss')}
                  </Text>
                </View>
              </View>

              <Text style={styles.newsTitle}>{item.title}</Text>

              {item.description ? (
                <Text style={styles.newsDesc} numberOfLines={3}>{item.description}</Text>
              ) : null}

              {item.organization_branch ? (
                <View style={styles.tagWrapper}>
                  <Text style={styles.tag}>
                    {item.organization_branch.name || 'Barcha xodimlarga'}
                  </Text>
                </View>
              ) : (
                <View style={styles.tagWrapper}>
                  <Text style={styles.tag}>Barcha xodimlarga</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, paddingTop: 16, marginBottom: 16 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarWrapper: {},
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primaryLight },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  newsDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  newsTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 22, marginBottom: 8 },
  newsDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 10 },

  tagWrapper: { marginTop: 4 },
  tag: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },

  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
