import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Screen } from '@/components/Screen';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { PagedList } from '@/components/PagedList';
import { SearchBox } from '@/components/SearchBox';
import { FilterChip } from '@/components/FilterChip';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { canMonitorTerminals } from '@/utils/roles';
import { ticketStatusKey, ticketStatusKind, ticketPriorityKey, type StatusKind } from '@/utils/supportStatus';
import { ticketsListQuery, type SupportScope, type SupportStatusFilter } from '../api/queries';

const statusColors = (kind: StatusKind, c: ThemeColors): { bg: string; fg: string } => {
  switch (kind) {
    case 'progress': return { bg: c.primarySoft, fg: c.primary };
    case 'done': return { bg: c.successSoft, fg: c.success };
    case 'rated': return { bg: c.successSoft, fg: c.success };
    default: return { bg: c.card, fg: c.textMuted };
  }
};

const STATUS_CHIPS: { key: SupportStatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'support.filterAll' },
  { key: 'open', labelKey: 'support.statusOpen' },
  { key: 'in_progress', labelKey: 'support.statusInProgress' },
  { key: 'done', labelKey: 'support.statusDone' },
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
  const debouncedSearch = useDebouncedValue(search);

  const query = useInfiniteQuery(ticketsListQuery({ scope, status, search: debouncedSearch }));

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={t('support.title')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        right={<HeaderAction icon="plus" onPress={() => router.push('/texnik-yordam-form')} />}
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUS_CHIPS.map((c) => (
          <FilterChip key={c.key} label={t(c.labelKey)} active={status === c.key} onPress={() => setStatus(c.key)} styles={styles} subtle />
        ))}
      </ScrollView>

      <PagedList
        query={query}
        keyExtractor={(x) => String(x.id)}
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
    subtitle: { fontSize: 13, color: c.textMuted, paddingHorizontal: 16, marginBottom: 8 },
    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: c.onPrimary },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onPrimary },
    chipSubtle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipSubtleActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipSubtleText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    chipSubtleTextActive: { color: c.primary },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unread: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    unreadText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    card: { padding: 14, marginBottom: 10, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    priority: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    desc: { fontSize: 14, color: c.text, lineHeight: 20 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    metaText: { fontSize: 12, color: c.textMuted },
  });
