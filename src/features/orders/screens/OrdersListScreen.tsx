import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { needsMyAction } from '@/utils/orderStatus';
import { ordersListQuery } from '../api/queries';
import { OrderListCard } from '../components/OrderListCard';

type Tab = 'action' | 'mine' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'action', label: 'Menda' },
  { key: 'mine', label: 'Mening' },
  { key: 'all', label: 'Barchasi' },
];

export default function OrdersListScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const employeeId = employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<Tab>('action');

  const orgBranchId =
    employee?.organization_branches?.[0]?.id ??
    employee?.department?.organization_branch_id;

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery(ordersListQuery(orgBranchId));

  const actionCount = useMemo(
    () => orders.filter((o) => needsMyAction(o, employeeId)).length,
    [orders, employeeId]
  );

  const filtered = useMemo(() => {
    let list = orders;
    if (tab === 'action') list = orders.filter((o) => needsMyAction(o, employeeId));
    else if (tab === 'mine') list = orders.filter((o) => o.created_by_id === employeeId || o.submitter_id === employeeId || o.employee_id === employeeId);
    return [...list].sort((a, b) =>
      (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))
    );
  }, [orders, tab, employeeId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Buyruqlar</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-order')}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={22} color={colors.onPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {t.key === 'action' && actionCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{actionCount > 9 ? '9+' : actionCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingView />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="doc"
                title={tab === 'action' ? "Sizdan amal kutilayotgan buyruqlar yo'q" : "Buyruqlar yo'q"}
              />
            </View>
          ) : (
            filtered.map((o) => (
              <OrderListCard key={o.id} order={o} action={needsMyAction(o, employeeId)} />
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { flex: 1, fontSize: 26, fontWeight: '800', color: c.text },
    fab: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    },

    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    tab: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder,
    },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: c.onPrimary },
    tabBadge: { backgroundColor: c.warning, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    content: { paddingHorizontal: 16, paddingTop: 4 },

    emptyWrap: { paddingTop: 60 },
  });
