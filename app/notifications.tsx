import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  FlatList, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { NOTIFICATIONS_LIST, NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } from '../src/api/urls';
import { routeForNotification, notificationMeta } from '../src/services/notifications';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import type { Notification } from '../src/types';
import { Icon } from '../src/components/Icon';

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const { data: items = [], isLoading, refetch, isFetching } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.employee?.id],
    queryFn: () =>
      apiClient.get(NOTIFICATIONS_LIST).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 30 * 1000,
  });

  const unread = items.filter((n) => !n.is_read).length;

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      try { await apiClient.post(NOTIFICATION_READ(n.id)); } catch {}
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  const markAllRead = async () => {
    try { await apiClient.post(NOTIFICATIONS_READ_ALL); } catch {}
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const onPressItem = async (n: Notification) => {
    await markRead(n);
    const route = routeForNotification(n as any);
    if (route) router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirishnomalar</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAll}>O'qildi</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
          renderItem={({ item }) => {
            const meta = notificationMeta(item.notification_type);
            return (
              <TouchableOpacity
                style={[styles.card, !item.is_read && styles.cardUnread]}
                activeOpacity={0.8}
                onPress={() => onPressItem(item)}
              >
                <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
                  <Icon name={meta.icon} size={20} color={item.is_read ? colors.textSecondary : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{meta.title}</Text>
                    {!item.is_read && <View style={styles.dot} />}
                  </View>
                  {!!item.description && <Text style={styles.body} numberOfLines={3}>{item.description}</Text>}
                  {!!item.created_at && (
                    <Text style={styles.date}>{dayjs(item.created_at).format('DD.MM.YYYY HH:mm')}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}><Icon name="bell" size={30} color={colors.textMuted} /></View>
              <Text style={styles.emptyText}>Bildirishnomalar yo'q</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    markAll: { fontSize: 13, color: c.primary, fontWeight: '700', width: 56, textAlign: 'right' },

    content: { padding: 16, gap: 10 },
    card: { flexDirection: 'row', gap: 12, backgroundColor: c.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.cardBorder },
    cardUnread: { borderColor: c.primary, backgroundColor: c.primarySoft },
    iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    iconWrapUnread: { backgroundColor: c.card },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    title: { fontSize: 14, fontWeight: '700', color: c.text, flexShrink: 1 },
    body: { fontSize: 13, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    date: { fontSize: 11, color: c.textMuted, marginTop: 6 },

    empty: { alignItems: 'center', paddingTop: 100, gap: 12 },
    emptyIcon: { fontSize: 48 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textMuted, fontSize: 15 },
  });
