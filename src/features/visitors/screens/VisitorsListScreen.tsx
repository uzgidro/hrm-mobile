import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  RefreshControl, FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { SplitLayout } from '@/components/SplitLayout';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { visitorsListQuery } from '../api/queries';
import { VisitorDetailView } from '../components/VisitorDetailView';

export default function MehmonlarScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const split = bp.isTablet && bp.isLandscape;
  // Task 10's multi-column grid (2 cols portrait tablet, 3 cols landscape
  // tablet) only applies when the master list has the full screen width to
  // itself. In split mode the master pane is a narrow ~36% column (SplitLayout)
  // — a grid there would squeeze cards unreadably, so split always forces a
  // single column, same as phones. Tablet-portrait (not split) keeps the
  // Task 10 2-column grid unchanged.
  const cols = split ? 1 : bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  // Auto-select the first row when entering split with nothing selected yet
  // (so the detail pane isn't blank on first tablet-landscape render); clear
  // the selection when leaving split (rotate back to portrait / phone) so
  // re-entering split starts fresh instead of resuming a stale id. Also
  // re-anchors to the first visible row whenever the currently selected id
  // falls out of `filtered` (search narrows the list) — otherwise the detail
  // pane would keep showing a stale visitor that's no longer listed. Mirrors
  // OrdersListScreen (T15) / LettersListScreen 1:1.
  useEffect(() => {
    if (!split) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !filtered.some((v) => v.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, filtered]);

  const listPane = (
    <>
      <View style={styles.header}>
        {/* Guests is a bottom-bar tab, but it's also opened from the Modules
            grid — the chevron walks the visited-tab history back (Modules →
            Guests → back = Modules; as a cold tab it lands on Home). */}
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </TouchableOpacity>
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
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const active = item.is_active !== false;
            return (
              <TouchableOpacity
                style={[styles.card, cols > 1 && styles.cardGrid, split && item.id === selectedId && styles.cardSelected]}
                activeOpacity={0.8}
                onPress={
                  split
                    ? () => setSelectedId(item.id)
                    : () => router.push({ pathname: '/mehmon-detail', params: { id: String(item.id) } })
                }
              >
                <EmployeeAvatar emp={item} size={48} />
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
    </>
  );

  if (split) {
    return (
      <Screen edges={['top']} maxWidth="full">
        <SplitLayout
          master={listPane}
          detail={selectedId != null ? <VisitorDetailView id={selectedId} embedded /> : null}
          placeholder={<EmptyState icon="guest" title={t('visitors.emptyList')} />}
        />
      </Screen>
    );
  }

  return <Screen edges={['top']}>{listPane}</Screen>;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -8, marginRight: -4 },
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
    gridRow: { gap: 12 },
    cardGrid: { flex: 1 },
    cardSelected: { borderColor: c.primary, borderWidth: 1.5 },
    name: { fontSize: 15, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    host: { fontSize: 12, color: c.textMuted, flex: 1 },
    right: { alignItems: 'flex-end', gap: 6 },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    validText: { fontSize: 11, color: c.textMuted },
  });
