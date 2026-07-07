import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { ORDER_ACTS } from '../../src/api/urls';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon } from '../../src/components/Icon';
import { OrderAct } from '../../src/types';
import { statusMeta, statusColor, needsMyAction } from '../../src/utils/orderStatus';

type Tab = 'action' | 'mine' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'action', label: 'Menda' },
  { key: 'mine', label: 'Mening' },
  { key: 'all', label: 'Barchasi' },
];

export default function OrdersScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const employeeId = employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<Tab>('action');

  const orgBranchId =
    employee?.organization_branches?.[0]?.id ??
    employee?.department?.organization_branch_id;

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery<OrderAct[]>({
    queryKey: ['order-acts', orgBranchId],
    queryFn: () =>
      apiClient.get(ORDER_ACTS, {
        params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

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
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}><Icon name="doc" size={30} color={colors.textMuted} /></View>
              <Text style={styles.emptyText}>
                {tab === 'action' ? "Sizdan amal kutilayotgan buyruqlar yo'q" : "Buyruqlar yo'q"}
              </Text>
            </View>
          ) : (
            filtered.map((o) => {
              const meta = statusMeta(o.status);
              const sc = statusColor(meta.kind, colors);
              const action = needsMyAction(o, employeeId);
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.card, action && styles.cardAction]}
                  onPress={() => router.push({ pathname: '/order-detail', params: { id: o.id } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardCategory} numberOfLines={1}>
                      {o.category_rel?.name || 'Buyruq'}
                      {o.act_number ? `  №${o.act_number}` : ''}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
                    </View>
                  </View>

                  {!!o.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{o.description}</Text>
                  )}

                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>
                      {o.employee?.legal_name || o.submitter?.legal_name || ''}
                    </Text>
                    {!!o.created_at && (
                      <Text style={styles.cardMetaText}>{dayjs(o.created_at).format('DD.MM.YYYY')}</Text>
                    )}
                  </View>

                  {action && (
                    <View style={styles.actionTag}>
                      <Text style={styles.actionTagText}>Sizdan amal kutilmoqda</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

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

    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textMuted, fontSize: 15, textAlign: 'center', paddingHorizontal: 30 },

    card: {
      backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: c.cardBorder, gap: 8,
    },
    cardAction: { borderColor: c.warning },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardCategory: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    cardMetaText: { fontSize: 12, color: c.textMuted },

    actionTag: { alignSelf: 'flex-start', backgroundColor: c.warningSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
    actionTagText: { fontSize: 11, fontWeight: '700', color: c.warning },
  });
