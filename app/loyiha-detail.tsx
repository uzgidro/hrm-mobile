import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiClient } from '../src/api/client';
import { WORKSPACE_DETAIL, CARDS_LIST } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon } from '../src/components/Icon';
import type { Workspace, WorkspaceCard } from '../src/types';

export default function LoyihaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: ws, isLoading } = useQuery<Workspace>({
    queryKey: ['workspace', workspaceId],
    queryFn: () => apiClient.get(WORKSPACE_DETAIL(workspaceId)).then((r) => r.data),
    enabled: !!workspaceId,
  });

  const columns = useMemo(
    () => (ws?.columns ?? []).filter((c) => !c.is_archived),
    [ws]
  );

  const cardQueries = useQueries({
    queries: columns.map((col) => ({
      queryKey: ['cards', col.id],
      queryFn: () =>
        apiClient.get(CARDS_LIST, { params: { column_id: col.id } }).then((r) => {
          const d = r.data;
          return (Array.isArray(d) ? d : (d?.items ?? [])) as WorkspaceCard[];
        }),
      enabled: !!col.id,
      staleTime: 60 * 1000,
    })),
  });

  const members = ws?.members ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={ws?.name || 'Loyiha'} />
      {isLoading || !ws ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!ws.description && (
            <View style={styles.card}>
              <Text style={styles.desc}>{ws.description}</Text>
            </View>
          )}

          {members.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>A'zolar ({members.length})</Text>
              <View style={styles.card}>
                <View style={styles.memberWrap}>
                  {members.map((m, i) => (
                    <View key={m.id ?? i} style={styles.memberChip}>
                      {m.member?.photo_path ? (
                        <Image source={{ uri: m.member.photo_path }} style={styles.memberAv} />
                      ) : (
                        <View style={[styles.memberAv, styles.memberAvFallback]}>
                          <Text style={styles.memberAvText}>{(m.member?.legal_name || '?').charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={styles.memberName} numberOfLines={1}>{m.member?.legal_name || 'Xodim'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Ustunlar</Text>
          {columns.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}><Icon name="board" size={28} color={colors.textMuted} /></View>
              <Text style={styles.emptyText}>Ustunlar yo'q</Text>
            </View>
          ) : (
            columns.map((col, idx) => {
              const cards = (cardQueries[idx]?.data ?? []) as WorkspaceCard[];
              const loading = cardQueries[idx]?.isLoading;
              return (
                <View key={col.id} style={styles.column}>
                  <View style={styles.columnHeader}>
                    <View style={[styles.colDot, { backgroundColor: col.color || colors.primary }]} />
                    <Text style={styles.columnName} numberOfLines={1}>{col.name || 'Ustun'}</Text>
                    <Text style={styles.columnCount}>{cards.length}</Text>
                  </View>
                  {loading ? (
                    <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} />
                  ) : cards.length === 0 ? (
                    <Text style={styles.colEmpty}>Vazifa yo'q</Text>
                  ) : (
                    cards.map((cd) => (
                      <View key={cd.id} style={[styles.taskCard, cd.is_completed && styles.taskDone]}>
                        <View style={styles.taskTop}>
                          {cd.is_completed && <Icon name="check" size={15} color={colors.success} />}
                          <Text style={[styles.taskTitle, cd.is_completed && styles.taskTitleDone]} numberOfLines={2}>
                            {cd.title || 'Vazifa'}
                          </Text>
                        </View>
                        {!!cd.description && <Text style={styles.taskDesc} numberOfLines={2}>{cd.description}</Text>}
                        {!!cd.end_date && (
                          <View style={styles.taskMeta}>
                            <Icon name="calendar" size={12} color={colors.textMuted} />
                            <Text style={styles.taskDate}>{dayjs(cd.end_date).format('DD.MM.YYYY')}</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 16, marginBottom: 12 },
    desc: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },

    memberWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.bg, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 4, paddingRight: 12, borderWidth: 1, borderColor: c.cardBorder },
    memberAv: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.skeleton },
    memberAvFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    memberAvText: { fontSize: 11, fontWeight: '700', color: c.primary },
    memberName: { fontSize: 12, color: c.text, fontWeight: '600', maxWidth: 130 },

    column: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 12, marginBottom: 12 },
    columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    colDot: { width: 10, height: 10, borderRadius: 5 },
    columnName: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    columnCount: { fontSize: 12, fontWeight: '700', color: c.textMuted, backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    colEmpty: { fontSize: 13, color: c.textMuted, paddingVertical: 8, textAlign: 'center' },

    taskCard: { backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, padding: 12, marginTop: 8 },
    taskDone: { opacity: 0.7 },
    taskTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    taskTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    taskTitleDone: { textDecorationLine: 'line-through', color: c.textSecondary },
    taskDesc: { fontSize: 12, color: c.textSecondary, lineHeight: 17, marginTop: 4 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    taskDate: { fontSize: 12, color: c.textMuted },

    empty: { alignItems: 'center', paddingVertical: 30, gap: 10 },
    emptyIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textMuted, fontSize: 14 },
  });
