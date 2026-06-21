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
import { LETTERS_LIST } from '../../src/api/urls';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import type { Letter } from '../../src/types';
import { statusColor } from '../../src/utils/orderStatus';
import { letterStatusMeta, letterTypeLabel, canSignLetter } from '../../src/utils/letterStatus';

type Tab = 'action' | 'mine' | 'all';
const TABS: { key: Tab; label: string }[] = [
  { key: 'action', label: 'Menda' },
  { key: 'mine', label: 'Mening' },
  { key: 'all', label: 'Barchasi' },
];

export default function LettersScreen() {
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<Tab>('action');

  const params = useMemo(() => {
    if (tab === 'action') return { assigned_signer: true };
    if (tab === 'mine') return { signer: true };
    return {};
  }, [tab]);

  const { data: letters = [], isLoading, refetch, isFetching } = useQuery<Letter[]>({
    queryKey: ['letters', tab],
    queryFn: () =>
      apiClient.get(LETTERS_LIST, { params }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

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
        <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
        >
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✉️</Text>
              <Text style={styles.emptyText}>{tab === 'action' ? "Imzolash kutilayotgan xatlar yo'q" : "Xatlar yo'q"}</Text>
            </View>
          ) : (
            sorted.map((l) => {
              const meta = letterStatusMeta(l);
              const sc = statusColor(meta.kind, colors);
              const action = canSignLetter(l, employeeId);
              return (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.card, action && styles.cardAction]}
                  onPress={() => router.push({ pathname: '/letter-detail', params: { id: l.id } } as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardType} numberOfLines={1}>
                      {letterTypeLabel(l.letter_type)}{l.letter_number ? `  №${l.letter_number}` : ''}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
                    </View>
                  </View>
                  {!!l.description && <Text style={styles.cardDesc} numberOfLines={2}>{l.description}</Text>}
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {l.employee?.legal_name || l.submitter?.legal_name || ''}
                    </Text>
                    {!!l.created_at && <Text style={styles.cardMetaText}>{dayjs(l.created_at).format('DD.MM.YYYY')}</Text>}
                  </View>
                  {action && (
                    <View style={styles.actionTag}><Text style={styles.actionTagText}>Sizning imzoyingiz kutilmoqda</Text></View>
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
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: c.onPrimary },
    tabBadge: { backgroundColor: c.warning, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    content: { paddingHorizontal: 16, paddingTop: 4 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyIcon: { fontSize: 48 },
    emptyText: { color: c.textMuted, fontSize: 15, textAlign: 'center', paddingHorizontal: 30 },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    cardAction: { borderColor: c.warning },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardType: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    cardMetaText: { fontSize: 12, color: c.textMuted, flexShrink: 1 },
    actionTag: { alignSelf: 'flex-start', backgroundColor: c.warningSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
    actionTagText: { fontSize: 11, fontWeight: '700', color: c.warning },
  });
