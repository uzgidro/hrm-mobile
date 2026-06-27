import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Image, FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '../src/api/client';
import { WORKSPACES_LIST } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Icon } from '../src/components/Icon';
import type { Workspace } from '../src/types';

function Stat({ icon, value, styles, colors }: { icon: any; value: number; styles: any; colors: ThemeColors }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

export default function LoyihalarScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: items = [], isLoading, refetch, isFetching } = useQuery<Workspace[]>({
    queryKey: ['workspaces', 'mine'],
    queryFn: () =>
      apiClient.get(WORKSPACES_LIST, { params: { only_member: true, exclude_member: false } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Loyihalar" />
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const members = item.members ?? [];
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/loyiha-detail', params: { id: item.id } } as any)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}><Icon name="board" size={22} color={colors.primary} /></View>
                  <Text style={styles.name} numberOfLines={1}>{item.name || 'Loyiha'}</Text>
                </View>
                {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
                <View style={styles.metaRow}>
                  <View style={styles.stats}>
                    <Stat icon="board" value={item.columns_count ?? 0} styles={styles} colors={colors} />
                    <Stat icon="checklist" value={item.cards_count ?? 0} styles={styles} colors={colors} />
                    <Stat icon="users" value={item.members_count ?? members.length} styles={styles} colors={colors} />
                  </View>
                  <View style={styles.avatars}>
                    {members.slice(0, 3).map((m, i) => (
                      m.member?.photo_path ? (
                        <Image key={m.id ?? i} source={{ uri: m.member.photo_path }} style={[styles.av, { marginLeft: i ? -8 : 0 }]} />
                      ) : (
                        <View key={m.id ?? i} style={[styles.av, styles.avFallback, { marginLeft: i ? -8 : 0 }]}>
                          <Text style={styles.avText}>{(m.member?.legal_name || '?').charAt(0).toUpperCase()}</Text>
                        </View>
                      )
                    ))}
                    {members.length > 3 && (
                      <View style={[styles.av, styles.avMore, { marginLeft: -8 }]}>
                        <Text style={styles.avMoreText}>+{members.length - 3}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}><Icon name="board" size={30} color={colors.textMuted} /></View>
              <Text style={styles.emptyText}>Loyihalar yo'q</Text>
            </View>
          }
        />
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
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    desc: { fontSize: 13, color: c.textSecondary, lineHeight: 19, marginTop: 10 },

    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
    stats: { flexDirection: 'row', gap: 14 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },

    avatars: { flexDirection: 'row', alignItems: 'center' },
    av: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.skeleton, borderWidth: 2, borderColor: c.card },
    avFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avText: { fontSize: 10, fontWeight: '700', color: c.primary },
    avMore: { backgroundColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    avMoreText: { fontSize: 9, fontWeight: '700', color: c.textSecondary },

    empty: { alignItems: 'center', paddingTop: 90, gap: 10 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textMuted, fontSize: 15 },
  });
