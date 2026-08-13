import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SplitLayout } from '@/components/SplitLayout';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { FilterChip } from '@/components/FilterChip';
import { SearchBox } from '@/components/SearchBox';
import { useBreakpoint } from '@/utils/responsive';
import { selectSplitId } from '@/utils/splitView';
import { needsMyAction, statusMeta } from '@/utils/orderStatus';
import { ordersListQuery } from '../api/queries';
import { OrderListCard } from '../components/OrderListCard';
import { OrderDetailView } from '../components/OrderDetailView';

type Tab = 'action' | 'mine' | 'all';

const TAB_KEYS: { key: Tab; labelKey: string }[] = [
  { key: 'action', labelKey: 'orders.tabAction' },
  { key: 'mine', labelKey: 'orders.tabMine' },
  { key: 'all', labelKey: 'common.all' },
];

export default function OrdersListScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const employeeId = employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('action');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const bp = useBreakpoint();
  const split = bp.isTablet && bp.isLandscape;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const orgBranchId =
    employee?.organization_branches?.[0]?.id ??
    employee?.department?.organization_branch_id;

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery(ordersListQuery(orgBranchId));

  const actionCount = useMemo(
    () => orders.filter((o) => needsMyAction(o, employeeId)).length,
    [orders, employeeId]
  );

  const tabList = useMemo(() => {
    let list = orders;
    if (tab === 'action') list = orders.filter((o) => needsMyAction(o, employeeId));
    else if (tab === 'mine') list = orders.filter((o) => o.created_by_id === employeeId || o.submitter_id === employeeId || o.employee_id === employeeId);
    return [...list].sort((a, b) =>
      (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))
    );
  }, [orders, tab, employeeId]);

  // Category + status chip options derived from the tab list so they stay
  // relevant. Category value = the category name (stable, human-readable).
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of tabList) { const n = o.category_rel?.name; if (n) set.add(n); }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uz'));
  }, [tabList]);
  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of tabList) { const s = o.status ?? ''; if (s && !seen.has(s)) seen.set(s, statusMeta(o.status).label); }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [tabList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabList.filter((o) => {
      if (categoryFilter !== 'all' && o.category_rel?.name !== categoryFilter) return false;
      if (statusFilter !== 'all' && (o.status ?? '') !== statusFilter) return false;
      if (!q) return true;
      return (
        (String(o.act_number ?? '').toLowerCase().includes(q)) ||
        (o.category_rel?.name?.toLowerCase().includes(q) ?? false) ||
        (o.summary?.toLowerCase().includes(q) ?? false) ||
        (o.description?.toLowerCase().includes(q) ?? false) ||
        (o.created_by?.legal_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tabList, search, categoryFilter, statusFilter]);

  // Auto-select the first row when entering split with nothing selected yet
  // (so the detail pane isn't blank on first tablet-landscape render); clear
  // the selection when leaving split (rotate back to portrait / phone) so
  // re-entering split starts fresh instead of resuming a stale id. Also
  // re-anchors to the first visible row whenever the currently selected id
  // falls out of `filtered` (tab switch, or the order left the list after an
  // action) — otherwise the detail pane would keep showing a stale order that
  // no longer matches the current filter/tab.
  useEffect(() => {
    setSelectedId((current) => selectSplitId(filtered, current, split));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, filtered]);

  const listPane = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('orders.title')}</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-order')}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={22} color={colors.onPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {TAB_KEYS.map((tabItem) => {
          const active = tab === tabItem.key;
          return (
            <TouchableOpacity
              key={tabItem.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(tabItem.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(tabItem.labelKey)}</Text>
              {tabItem.key === 'action' && actionCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{actionCount > 9 ? '9+' : actionCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('orders.searchPlaceholder')} />
      </View>

      {categoryOptions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label={t('orders.filterAllCategories')} active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} styles={styles} />
          {categoryOptions.map((c) => (
            <FilterChip key={c} label={c} active={categoryFilter === c} onPress={() => setCategoryFilter(c)} styles={styles} />
          ))}
        </ScrollView>
      )}

      {statusOptions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label={t('orders.filterAllStatuses')} active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} styles={styles} subtle />
          {statusOptions.map((s) => (
            <FilterChip key={s.value} label={s.label} active={statusFilter === s.value} onPress={() => setStatusFilter(s.value)} styles={styles} subtle />
          ))}
        </ScrollView>
      )}

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
                title={tab === 'action' ? t('orders.emptyAction') : t('orders.emptyAll')}
              />
            </View>
          ) : (
            filtered.map((o) => (
              <OrderListCard
                key={o.id}
                order={o}
                action={needsMyAction(o, employeeId)}
                onPress={split ? () => setSelectedId(o.id) : undefined}
                selected={split && o.id === selectedId}
              />
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </>
  );

  if (split) {
    return (
      <Screen edges={['top']} maxWidth="full">
        <SplitLayout
          master={listPane}
          detail={selectedId != null ? <OrderDetailView id={selectedId} embedded /> : null}
          placeholder={<EmptyState icon="doc" title={t('orders.emptyAction')} />}
        />
      </Screen>
    );
  }

  return <Screen edges={['top']}>{listPane}</Screen>;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
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

    searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onPrimary },
    chipSubtle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipSubtleActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipSubtleText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    chipSubtleTextActive: { color: c.primary },
  });
