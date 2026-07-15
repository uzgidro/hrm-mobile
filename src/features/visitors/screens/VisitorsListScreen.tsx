import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  RefreshControl, Image, FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { visitorsListQuery } from '../api/queries';

export default function MehmonlarScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');

  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;

  const { data: visitors = [], isLoading, refetch, isFetching } = useQuery(visitorsListQuery(orgBranchId));

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
        <Text style={styles.title}>{t('visitors.listTitle')}</Text>
        {visitors.length > 0 && <Text style={styles.count}>{visitors.length}</Text>}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/mehmon-form')} activeOpacity={0.85}>
          <Icon name="plus" size={22} color={colors.onPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('visitors.searchPlaceholder')}
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
        <LoadingView />
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
                onPress={() => router.push({ pathname: '/mehmon-detail', params: { id: String(item.id) } })}
              >
                {item.photo_path ? (
                  <Image source={{ uri: item.photo_path }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{(item.legal_name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.legal_name || t('visitors.nameFallback')}</Text>
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
                      {active ? t('visitors.statusActive') : t('visitors.statusInactive')}
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
            <EmptyState icon="guest" title={search ? t('visitors.emptySearch') : t('visitors.emptyList')} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    count: { fontSize: 14, fontWeight: '700', color: c.textMuted, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    addBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },

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
  });
