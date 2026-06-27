import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { VISITORS_LIST } from '../../src/api/urls';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon } from '../../src/components/Icon';
import type { Visitor } from '../../src/types';

export default function MehmonlarScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');

  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;

  const { data: visitors = [], isLoading, refetch, isFetching } = useQuery<Visitor[]>({
    queryKey: ['visitors', orgBranchId],
    queryFn: () =>
      apiClient.get(VISITORS_LIST, {
        params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter((v) =>
      (v.legal_name ?? '').toLowerCase().includes(q) ||
      (v.organization_name ?? '').toLowerCase().includes(q) ||
      (v.host_employee_name ?? '').toLowerCase().includes(q)
    );
  }, [visitors, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mehmonlar</Text>
        {visitors.length > 0 && <Text style={styles.count}>{visitors.length}</Text>}
      </View>

      <View style={styles.searchWrap}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ism, tashkilot yoki qabul qiluvchi..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const active = item.is_active !== false;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/mehmon-detail', params: { id: item.id } } as any)}
              >
                {item.photo_path ? (
                  <Image source={{ uri: item.photo_path }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{(item.legal_name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.legal_name || 'Mehmon'}</Text>
                  {!!(item.organization_name || item.job_position) && (
                    <Text style={styles.sub} numberOfLines={1}>
                      {[item.organization_name, item.job_position].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {!!item.host_employee_name && (
                    <View style={styles.hostRow}>
                      <Icon name="user" size={12} color={colors.textMuted} />
                      <Text style={styles.host} numberOfLines={1}>{item.host_employee_name}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.right}>
                  <View style={[styles.badge, { backgroundColor: active ? colors.successSoft : colors.errorSoft }]}>
                    <Text style={[styles.badgeText, { color: active ? colors.success : colors.error }]}>
                      {active ? 'Aktiv' : 'Nofaol'}
                    </Text>
                  </View>
                  {!!item.valid_until && (
                    <Text style={styles.validText}>{dayjs(item.valid_until).format('DD.MM.YYYY')}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}><Icon name="guest" size={30} color={colors.textMuted} /></View>
              <Text style={styles.emptyText}>{search ? 'Hech narsa topilmadi' : "Mehmonlar yo'q"}</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    count: { fontSize: 14, fontWeight: '700', color: c.textMuted, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },

    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, height: 44,
      backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.text, paddingVertical: 0 },

    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10,
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.skeleton },
    avatarFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: c.primary },
    name: { fontSize: 15, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    host: { fontSize: 12, color: c.textMuted, flex: 1 },
    right: { alignItems: 'flex-end', gap: 6 },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    validText: { fontSize: 11, color: c.textMuted },

    empty: { alignItems: 'center', paddingTop: 90, gap: 10 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textMuted, fontSize: 15 },
  });
