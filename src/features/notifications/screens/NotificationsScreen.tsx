import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/api/errors';
import { routeForNotification, notificationMeta } from '@/services/notifications';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import type { Notification } from '@/types';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SplitLayout } from '@/components/SplitLayout';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { OrderDetailView } from '@/features/orders/components/OrderDetailView';
import { LetterDetailView } from '@/features/letters/components/LetterDetailView';
import { notificationKeys, notificationsListQuery } from '../api/queries';
import { markNotificationRead, markAllNotificationsRead } from '../api/mutations';

// A tapped notification's route target, resolved once and reused both to
// decide whether it can be shown inline (split pane) and, if not, where to
// push. Only order/letter targets have an embeddable DetailView (T13/T15);
// everything else (news/kpi/workspace/card, and letters reached via a list
// route rather than a concrete id) has no embeddable body yet, so it always
// falls back to `router.push` even while split — the split pane simply stays
// on the placeholder/previous selection.
type Target = { kind: 'order'; id: number } | { kind: 'letter'; id: number } | null;

function targetForNotification(n: Notification): Target {
  const route = routeForNotification(n as any);
  if (!route) return null;
  const orderMatch = /^\/order-detail\?id=(\d+)$/.exec(route);
  if (orderMatch) return { kind: 'order', id: Number(orderMatch[1]) };
  const letterMatch = /^\/letter-detail\?id=(\d+)$/.exec(route);
  if (letterMatch) return { kind: 'letter', id: Number(letterMatch[1]) };
  return null;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const split = bp.isTablet && bp.isLandscape;
  const cols = split ? 1 : bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Target>(null);

  const { data: items = [], isLoading, refetch, isFetching } = useQuery(
    notificationsListQuery(user?.employee?.id)
  );

  const unread = items.filter((n) => !n.is_read).length;

  // Clear the split selection when leaving split (rotate back to portrait /
  // phone) so re-entering split starts fresh instead of resuming a stale
  // target; re-anchor to null whenever the previously-selected notification
  // is no longer in `items` (e.g. it was the last unread one and a refetch
  // dropped it) — otherwise the detail pane would keep showing a target that
  // no longer has a backing row. Mirrors OrdersListScreen/LettersListScreen
  // (T15/T13) 1:1, including the I-1 stale-selection lesson from Wave 1.
  useEffect(() => {
    if (!split) {
      setSelected(null);
      return;
    }
    if (selected != null && !items.some((n) => targetEquals(targetForNotification(n), selected))) {
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, items]);

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
    const target = targetForNotification(n);
    if (split && target) {
      setSelected(target);
      return;
    }
    const route = routeForNotification(n as any);
    if (route) router.push(route as Href);
  };

  const listPane = (
    <>
      <ScreenHeader
        title={t('notifications.screenTitle')}
        right={
          unread > 0 ? (
            <TouchableOpacity onPress={markAllRead} hitSlop={8} accessibilityLabel={t('notifications.markAllRead')}>
              <Icon name="checkDouble" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={items}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
          renderItem={({ item }) => {
            const meta = notificationMeta(item.notification_type);
            const itemTarget = targetForNotification(item);
            const isSelected = split && itemTarget != null && targetEquals(itemTarget, selected);
            return (
              <TouchableOpacity
                style={[styles.card, !item.is_read && styles.cardUnread, cols > 1 && styles.cardGrid, isSelected && styles.cardSelected]}
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
            <EmptyState icon="bell" title={t('notifications.empty')} />
          }
        />
      )}
    </>
  );

  if (split) {
    return (
      <Screen edges={['top']} maxWidth="full">
        <SplitLayout
          master={listPane}
          detail={
            selected == null ? null
            : selected.kind === 'order' ? <OrderDetailView id={selected.id} embedded />
            : <LetterDetailView id={selected.id} embedded />
          }
          placeholder={<EmptyState icon="bell" title={t('notifications.empty')} />}
        />
      </Screen>
    );
  }

  return <Screen edges={['top', 'bottom']}>{listPane}</Screen>;
}

function targetEquals(a: Target, b: Target): boolean {
  if (a == null || b == null) return a === b;
  return a.kind === b.kind && a.id === b.id;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 10 },
    gridRow: { gap: 12 },
    card: { flexDirection: 'row', gap: 12, backgroundColor: c.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.cardBorder },
    cardGrid: { flex: 1 },
    cardUnread: { borderColor: c.primary, backgroundColor: c.primarySoft },
    cardSelected: { borderColor: c.primary, borderWidth: 2 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    iconWrapUnread: { backgroundColor: c.card },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    title: { fontSize: 14, fontWeight: '700', color: c.text, flexShrink: 1 },
    body: { fontSize: 13, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    date: { fontSize: 11, color: c.textMuted, marginTop: 6 },
  });
