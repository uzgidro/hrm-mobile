import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
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
import {
  letterNeedsMyAction, letterTypeLabel, isLetterUnseen, letterStatusOptions,
} from '@/utils/letterStatus';
import { lettersListQuery, type LettersTab } from '../api/queries';
import { LetterListCard } from '../components/LetterListCard';
import { LetterDetailView } from '../components/LetterDetailView';

const TYPE_FILTERS = ['all', 'explanatory', 'application', 'business_trip'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const TABS: { key: LettersTab; labelKey: string }[] = [
  { key: 'action', labelKey: 'letters.tabAction' },
  { key: 'mine', labelKey: 'letters.tabMine' },
  { key: 'all', labelKey: 'common.all' },
];

export default function LettersListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<LettersTab>('action');
  const bp = useBreakpoint();
  const split = bp.isTablet && bp.isLandscape;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  // "Menda" count = the same server number the tab bar shows (menu-badges),
  // not a JS count over the loaded page.
  const { data: badges } = useQuery(menuBadgesQuery());
  const actionCount = badges?.letters ?? 0;

  const statusOptions = useMemo(() => letterStatusOptions(typeFilter), [typeFilter]);
  // A status chip that does not exist for the picked type reads as "all"
  // (derived at render, no effect) so the server never gets an impossible filter.
  const effectiveStatus = statusOptions.some((o) => o.value === statusFilter) ? statusFilter : 'all';

  // Every filter is a SERVER param (tab → action_required / employee_id, chips
  // → letter_type / status, box → search); the page is 30 rows, the next page
  // loads on scroll. See `lettersListServerParams`.
  const query = useInfiniteQuery(
    lettersListQuery({ tab, letterType: typeFilter, status: effectiveStatus, search: debouncedSearch, employeeId }),
  );
  const { rows: letters } = usePagedRows(query);

  // Auto-select the first row when entering split with nothing selected yet
  // (so the detail pane isn't blank on first tablet-landscape render); clear
  // the selection when leaving split (rotate back to portrait / phone) so
  // re-entering split starts fresh instead of resuming a stale id. Also
  // re-anchors to the first visible row whenever the currently selected id
  // falls out of the list (tab switch, or the letter left the list after an
  // action) — otherwise the detail pane would keep showing a stale letter
  // that no longer matches the current tab.
  useEffect(() => {
    setSelectedId((current) => selectSplitId(letters, current, split));
  }, [split, letters]);

  const listPane = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('letters.listTitle')}</Text>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-letter')} activeOpacity={0.8}>
          <Icon name="plus" size={22} color={colors.onPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tItem) => {
          const active = tab === tItem.key;
          return (
            <TouchableOpacity
              key={tItem.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(tItem.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(tItem.labelKey)}</Text>
              {tItem.key === 'action' && actionCount > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{actionCount > 9 ? '9+' : actionCount}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('letters.searchPlaceholder')} />
      </View>

      <ChipScroll contentContainerStyle={styles.chipRow}>
        {TYPE_FILTERS.map((tf) => (
          <FilterChip
            key={tf}
            label={tf === 'all' ? t('letters.filterAllTypes') : letterTypeLabel(tf)}
            active={typeFilter === tf}
            onPress={() => setTypeFilter(tf)}
            styles={styles}
          />
        ))}
      </ChipScroll>

      <ChipScroll contentContainerStyle={styles.chipRow}>
        <FilterChip label={t('letters.filterAllStatuses')} active={effectiveStatus === 'all'} onPress={() => setStatusFilter('all')} styles={styles} subtle />
        {statusOptions.map((s) => (
          <FilterChip key={s.value} label={s.label} active={effectiveStatus === s.value} onPress={() => setStatusFilter(s.value)} styles={styles} subtle />
        ))}
      </ChipScroll>

      <PagedList
        query={query}
        keyExtractor={(l) => String(l.id)}
        emptyIcon="mail"
        emptyTitle={tab === 'action' ? t('letters.emptyAction') : t('letters.empty')}
        renderItem={(l) => (
          <LetterListCard
            letter={l}
            action={letterNeedsMyAction(l, employeeId)}
            unseen={isLetterUnseen(l, employeeId, user)}
            onPress={split ? () => setSelectedId(l.id) : undefined}
            selected={split ? selectedId === l.id : undefined}
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
          detail={selectedId != null ? <LetterDetailView id={selectedId} embedded /> : null}
          placeholder={<EmptyState icon="mail" title={t('letters.emptyAction')} />}
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
    fab: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
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
