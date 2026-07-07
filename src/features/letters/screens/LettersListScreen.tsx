import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { canSignLetter } from '@/utils/letterStatus';
import { lettersListQuery, type LettersTab } from '../api/queries';
import { LetterListCard } from '../components/LetterListCard';

const TABS: { key: LettersTab; label: string }[] = [
  { key: 'action', label: 'Menda' },
  { key: 'mine', label: 'Mening' },
  { key: 'all', label: 'Barchasi' },
];

export default function LettersListScreen() {
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<LettersTab>('action');

  const { data: letters = [], isLoading, refetch, isFetching } = useQuery(lettersListQuery(tab));

  const actionCount = useMemo(
    () => letters.filter((l) => canSignLetter(l, employeeId)).length,
    [letters, employeeId]
  );

  const sorted = useMemo(
    () => [...letters].sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id))),
    [letters]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Xatlar</Text>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-letter')} activeOpacity={0.8}>
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
              {t.key === 'action' && tab === 'action' && actionCount > 0 && (
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
                title={tab === 'action' ? "Imzolash kutilayotgan xatlar yo'q" : "Xatlar yo'q"}
              />
            </View>
          ) : (
            sorted.map((l) => (
              <LetterListCard key={l.id} letter={l} action={canSignLetter(l, employeeId)} />
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
