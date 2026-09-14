import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChipScroll } from '@/components/ChipScroll';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SplitLayout } from '@/components/SplitLayout';
import { EmptyState } from '@/components/StateViews';
import { FilterChip } from '@/components/FilterChip';
import { SearchBox } from '@/components/SearchBox';
import { PagedList, usePagedRows } from '@/components/PagedList';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { useBreakpoint } from '@/utils/responsive';
import { selectSplitId } from '@/utils/splitView';
import { needsMyAction, isOrderUnseen, orderStatusOptions } from '@/utils/orderStatus';
import { ordersListQuery, allOrderCategoriesQuery, type OrdersTab } from '../api/queries';
import { OrderListCard } from '../components/OrderListCard';
import { OrderDetailView } from '../components/OrderDetailView';

const TAB_KEYS: { key: OrdersTab; labelKey: string }[] = [
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
  // Landing tab: "Menda" only when the menu badge says something waits for
  // me, otherwise "Barchasi" (web default) — see LettersListScreen.
  const [tabChoice, setTabChoice] = useState<OrdersTab | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const bp = useBreakpoint();
  const split = bp.isTablet && bp.isLandscape;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Same server number the tab bar shows.
  const { data: badges } = useQuery(menuBadgesQuery());
  const actionCount = badges?.orders ?? 0;
  const tab: OrdersTab = tabChoice ?? (actionCount > 0 ? 'action' : 'all');
  const setTab = setTabChoice;

  // Server-paged; tab/chips/search are server params (see `ordersListServerParams`).
  const query = useInfiniteQuery(
    ordersListQuery({ tab, categoryId: categoryFilter, status: statusFilter, search: debouncedSearch, employeeId }),
  );
  const { rows: orders } = usePagedRows(query);

  const { data: categories = [] } = useQuery(allOrderCategoriesQuery());
  const categoryOptions = useMemo(
    () => [...categories].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'uz')),
    [categories],
  );
  const statusOptions = useMemo(() => orderStatusOptions(), []);

  // Auto-select the first row when entering split with nothing selected yet
  // (so the detail pane isn't blank on first tablet-landscape render); clear
  // the selection when leaving split (rotate back to portrait / phone) so
  // re-entering split starts fresh instead of resuming a stale id. Also
  // re-anchors to the first visible row whenever the currently selected id
  // falls out of the list (tab switch, or the order left the list after an
  // action) — otherwise the detail pane would keep showing a stale order that
  // no longer matches the current filter/tab.
  useEffect(() => {
    setSelectedId((current) => selectSplitId(orders, current, split));
  }, [split, orders]);

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
        <ChipScroll contentContainerStyle={styles.chipRow}>
          <FilterChip label={t('orders.filterAllCategories')} active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} styles={styles} />
          {categoryOptions.map((c) => (
            <FilterChip key={c.id} label={c.name} active={categoryFilter === c.id} onPress={() => setCategoryFilter(c.id)} styles={styles} />
          ))}
        </ChipScroll>
      )}

      <ChipScroll contentContainerStyle={styles.chipRow}>
        <FilterChip label={t('orders.filterAllStatuses')} active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} styles={styles} subtle />
        {statusOptions.map((s) => (
          <FilterChip key={s.value} label={s.label} active={statusFilter === s.value} onPress={() => setStatusFilter(s.value)} styles={styles} subtle />
        ))}
      </ChipScroll>

      <PagedList
        query={query}
        keyExtractor={(o) => String(o.id)}
        emptyIcon="doc"
        emptyTitle={tab === 'action' ? t('orders.emptyAction') : t('orders.emptyAll')}
        renderItem={(o) => (
          <OrderListCard
            order={o}
            action={needsMyAction(o, employeeId)}
            unseen={isOrderUnseen(o, employeeId)}
            onPress={split ? () => setSelectedId(o.id) : undefined}
            selected={split && o.id === selectedId}
          />
        )}
      />
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
