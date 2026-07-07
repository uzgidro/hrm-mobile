import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/api/errors';
import { routeForNotification, notificationMeta } from '@/services/notifications';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Notification } from '@/types';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { notificationKeys, notificationsListQuery } from '../api/queries';
import { markNotificationRead, markAllNotificationsRead } from '../api/mutations';

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const { data: items = [], isLoading, refetch, isFetching } = useQuery(
    notificationsListQuery(user?.employee?.id)
  );

  const unread = items.filter((n) => !n.is_read).length;

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
      } catch (e) {
        // Best-effort: keep the tap flowing even if the read call fails.
        getApiErrorMessage(e);
      }
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (e) {
      getApiErrorMessage(e);
    }
    qc.invalidateQueries({ queryKey: notificationKeys.all });
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
        <LoadingView />
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
            <EmptyState icon="bell" title="Bildirishnomalar yo'q" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
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
  });
