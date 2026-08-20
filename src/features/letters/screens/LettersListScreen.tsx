import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
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
import { letterNeedsMyAction, letterTypeLabel, letterStatusMeta, normalizeLetterType } from '@/utils/letterStatus';
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: letters = [], isLoading, refetch, isFetching } = useQuery(lettersListQuery(tab));

  const actionCount = useMemo(
    () => letters.filter((l) => letterNeedsMyAction(l, employeeId)).length,
    [letters, employeeId]
  );

  const sorted = useMemo(
    () => [...letters].sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))),
    [letters]
  );

  // Status filter options are derived from what's actually loaded so the chips
  // are always relevant to the current tab (the full status set is large and
  // type-dependent). Label via letterStatusMeta so it matches the badges.
  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of sorted) {
      const key = l.status ?? '';
      if (key && !seen.has(key)) seen.set(key, letterStatusMeta(l).label);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((l) => {
      // "Amal" tabi endi mijozda ajratiladi (server `assigned_signer` filtri
      // devonxona/KADR/kelishuv amallarini tashlab ketardi) — web bilan bir xil.
      if (tab === 'action' && !letterNeedsMyAction(l, employeeId)) return false;
      if (typeFilter !== 'all' && normalizeLetterType(l.letter_type) !== typeFilter) return false;
      if (statusFilter !== 'all' && (l.status ?? '') !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.letter_number?.toLowerCase().includes(q) ?? false) ||
        letterTypeLabel(l.letter_type).toLowerCase().includes(q) ||
        (l.employee?.legal_name?.toLowerCase().includes(q) ?? false) ||
        (l.submitter?.legal_name?.toLowerCase().includes(q) ?? false) ||
        (l.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [sorted, search, typeFilter, statusFilter, tab, employeeId]);

  // Auto-select the first row when entering split with nothing selected yet
  // (so the detail pane isn't blank on first tablet-landscape render); clear
  // the selection when leaving split (rotate back to portrait / phone) so
  // re-entering split starts fresh instead of resuming a stale id. Also
  // re-anchors to the first visible row whenever the currently selected id
  // falls out of `filtered` (tab switch, or the letter left the list after an
  // action) — otherwise the detail pane would keep showing a stale letter
  // that no longer matches the current tab.
  useEffect(() => {
    setSelectedId((current) => selectSplitId(filtered, current, split));
  }, [split, filtered]);

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
              {tItem.key === 'action' && tab === 'action' && actionCount > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{actionCount > 9 ? '9+' : actionCount}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('letters.searchPlaceholder')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {TYPE_FILTERS.map((tf) => (
          <FilterChip
            key={tf}
            label={tf === 'all' ? t('letters.filterAllTypes') : letterTypeLabel(tf)}
            active={typeFilter === tf}
            onPress={() => setTypeFilter(tf)}
            styles={styles}
          />
        ))}
      </ScrollView>

      {statusOptions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip label={t('letters.filterAllStatuses')} active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} styles={styles} subtle />
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
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="mail"
                title={tab === 'action' ? t('letters.emptyAction') : t('letters.empty')}
              />
            </View>
          ) : (
            filtered.map((l) => (
              <LetterListCard
                key={l.id}
                letter={l}
                action={letterNeedsMyAction(l, employeeId)}
                onPress={split ? () => setSelectedId(l.id) : undefined}
                selected={split ? selectedId === l.id : undefined}
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
