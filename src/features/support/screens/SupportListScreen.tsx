import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChipScroll } from '@/components/ChipScroll';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { Screen } from '@/components/Screen';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { PagedList } from '@/components/PagedList';
import { SearchBox } from '@/components/SearchBox';
import { FilterChip } from '@/components/FilterChip';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { canMonitorTerminals } from '@/utils/roles';
import { ticketStatusKey, ticketStatusKind, ticketPriorityKey, type StatusKind } from '@/utils/supportStatus';
import {
  ticketsListQuery, supportSummaryQuery,
  type SupportScope, type SupportSort, type SupportStatusFilter, type SupportSummary,
} from '../api/queries';

const statusColors = (kind: StatusKind, c: ThemeColors): { bg: string; fg: string } => {
  switch (kind) {
    case 'progress': return { bg: c.primarySoft, fg: c.primary };
    case 'done': return { bg: c.successSoft, fg: c.success };
    case 'rated': return { bg: c.successSoft, fg: c.success };
    default: return { bg: c.card, fg: c.textMuted };
  }
};

// Each chip carries its folder count from support-tickets/summary (web v2).
const STATUS_CHIPS: { key: SupportStatusFilter; labelKey: string; count: keyof SupportSummary }[] = [
  { key: 'all', labelKey: 'support.filterAll', count: 'all' },
  { key: 'open', labelKey: 'support.statusOpen', count: 'new' },
  { key: 'in_progress', labelKey: 'support.statusInProgress', count: 'taken' },
  { key: 'done', labelKey: 'support.statusDone', count: 'done' },
];

export default function SupportListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const user = useAuthStore((s) => s.user);
  // AKT specialists (branch leaders with role `akt`), admins and the site
  // master-admin service a QUEUE besides their own tickets — the backend
  // returns it for `GET /support-tickets` without `mine`. Same predicate as
  // the terminal monitor (`require_system_admin` mirror).
  const hasQueue = canMonitorTerminals(user);
  const [scope, setScope] = useState<SupportScope>(hasQueue ? 'queue' : 'mine');
  const [status, setStatus] = useState<SupportStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SupportSort>('recent');
  const debouncedSearch = useDebouncedValue(search);

  const query = useInfiniteQuery(ticketsListQuery({ scope, status, search: debouncedSearch, sort }));
  const { data: summary } = useQuery(supportSummaryQuery(scope, debouncedSearch));
  // No AKT specialist in the branch → the server refuses new tickets (web v2 hides the button).
  const canCreate = summary?.can_create !== false;

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t('support.title')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        right={canCreate ? <HeaderAction icon="plus" onPress={() => router.push('/texnik-yordam-form')} /> : undefined}
      />
      {hasQueue ? (
        <View style={styles.tabsRow}>
          {(['queue', 'mine'] as SupportScope[]).map((key) => {
            const active = scope === key;
            return (
              <TouchableOpacity key={key} style={[styles.tab, active && styles.tabActive]} onPress={() => setScope(key)} activeOpacity={0.8}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t(key === 'queue' ? 'support.tabQueue' : 'support.tabMine')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
      )}

      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('support.searchPlaceholder')} />
      </View>
      <ChipScroll contentContainerStyle={styles.chipRow}>
        {STATUS_CHIPS.map((c) => {
          const n = summary?.[c.count];
          return (
            <FilterChip
              key={c.key}
              label={typeof n === 'number' ? `${t(c.labelKey)} · ${n}` : t(c.labelKey)}
              active={status === c.key}
              onPress={() => setStatus(c.key)}
              styles={styles}
              subtle
            />
          );
        })}
        <FilterChip
          label={t('support.sortPriority')}
          active={sort === 'priority'}
          onPress={() => setSort(sort === 'priority' ? 'recent' : 'priority')}
          styles={styles}
        />
      </ChipScroll>

      <PagedList
        query={query}
        keyExtractor={(x) => String(x.id)}
        filtersActive={!!search.trim() || status !== 'all'}
        onClearFilters={() => { setSearch(''); setStatus('all'); }}
        contentContainerStyle={styles.content}
        emptyIcon="help"
        emptyTitle={t('support.empty')}
        renderItem={(item) => {
          const sc = statusColors(ticketStatusKind(item.status), colors);
          const unread = item.unread_count ?? 0;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/texnik-yordam-detail', params: { id: String(item.id) } })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.priority}>{t(ticketPriorityKey(item.priority))}</Text>
                <View style={styles.badges}>
                  {unread > 0 && (
                    <View style={styles.unread}><Text style={styles.unreadText}>{unread}</Text></View>
                  )}
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.fg }]}>{t(ticketStatusKey(item.status))}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              {/* In the queue the REQUESTER matters (who to walk to); in "mine" the specialist. */}
              {scope === 'queue' && !!item.creator?.legal_name && (
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.creator.legal_name}{item.creator_internal_number ? ` · ${item.creator_internal_number}` : ''}
                  {item.room_number ? ` · ${t('support.fieldRoom')} ${item.room_number}` : ''}
                </Text>
              )}
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>{item.assignee?.legal_name || t('support.noAssignee')}</Text>
                {!!item.created_at && <Text style={styles.metaText}>{dayjs(item.created_at).format('DD.MM.YYYY')}</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    subtitle: { fontSize: 13.5, color: c.textSecondary, paddingHorizontal: 16, marginBottom: 8, ...ff('700') },
    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    tab: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: c.card,
      borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder,
    },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.tabBarActiveBorder },
    tabText: { fontSize: 13.5, color: c.textSecondary, ...ff('900') },
    tabTextActive: { color: c.primaryLight },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: c.card, borderWidth: 2, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.warningSoft, borderColor: c.warning },
    chipText: { fontSize: 13, color: c.textSecondary, ...ff('800') },
    chipTextActive: { color: c.warning },
    chipSubtle: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: c.card, borderWidth: 2, borderColor: c.cardBorder },
    chipSubtleActive: { backgroundColor: c.primarySoft, borderColor: c.tabBarActiveBorder },
    chipSubtleText: { fontSize: 13, color: c.textSecondary, ...ff('800') },
    chipSubtleTextActive: { color: c.primaryLight },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    unreadText: { fontSize: 11, color: '#fff', ...ff('900') },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    card: {
      padding: 14, marginBottom: 10, backgroundColor: c.card, borderRadius: 16,
      borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    priority: { fontSize: 13, color: c.textSecondary, ...ff('900') },
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, letterSpacing: 0.3, ...ff('900') },
    desc: { fontSize: 15, color: c.text, lineHeight: 21, ...ff('700') },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    metaText: { fontSize: 12.5, color: c.textMuted, ...ff('700') },
  });
