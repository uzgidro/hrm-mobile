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
import { useBreakpoint } from '@/utils/responsive';
import { canSignLetter } from '@/utils/letterStatus';
import { lettersListQuery, type LettersTab } from '../api/queries';
import { LetterListCard } from '../components/LetterListCard';
import { LetterDetailView } from '../components/LetterDetailView';

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

  const { data: letters = [], isLoading, refetch, isFetching } = useQuery(lettersListQuery(tab));

  const actionCount = useMemo(
    () => letters.filter((l) => canSignLetter(l, employeeId)).length,
    [letters, employeeId]
  );

  const sorted = useMemo(
    () => [...letters].sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))),
    [letters]
  );

  // Auto-select the first row when entering split with nothing selected yet
  // (so the detail pane isn't blank on first tablet-landscape render); clear
  // the selection when leaving split (rotate back to portrait / phone) so
  // re-entering split starts fresh instead of resuming a stale id. Mirrors
  // OrdersListScreen (T15) 1:1.
  useEffect(() => {
    if (split && selectedId == null && sorted.length > 0) setSelectedId(sorted[0].id);
    if (!split) setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, sorted]);

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

      {isLoading ? (
        <LoadingView />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
        >
          {sorted.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="mail"
                title={tab === 'action' ? t('letters.emptyAction') : t('letters.empty')}
              />
            </View>
          ) : (
            sorted.map((l) => (
              <LetterListCard
                key={l.id}
                letter={l}
                action={canSignLetter(l, employeeId)}
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
  });
