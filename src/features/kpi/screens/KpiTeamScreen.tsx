import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl, Image, FlatList, TextInput, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import { myTeamQuery } from '../api/queries';
import { resultColorKey, filterTeamMembers } from '../utils';

// «Xodimlarim samaradorligi» — the supervisor's direct reports with per-member
// aggregates (web KpiPage team tab). Tapping a member opens their scorecard
// (my-scorecard?employee_id=) where submitted tasks can be reviewed.
export default function KpiTeamScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<'all' | 'pending' | 'done'>('all');

  // Current month; historical periods live on the member's card.
  const { data, isLoading, isError, refetch, isFetching } = useQuery(myTeamQuery());

  const members = useMemo(
    () => filterTeamMembers(data?.employees, search, statusF),
    [data?.employees, search, statusF],
  );

  const STATUS_CHIPS: { key: 'all' | 'pending' | 'done'; labelKey: string }[] = [
    { key: 'all', labelKey: 'kpi.teamFilterAll' },
    { key: 'pending', labelKey: 'kpi.teamFilterPending' },
    { key: 'done', labelKey: 'kpi.teamFilterDone' },
  ];

  const resultColor = (v: number | null | undefined) => {
    const key = resultColorKey(v);
    return key === 'good' ? colors.success : key === 'mid' ? colors.warning : key === 'bad' ? colors.error : colors.textMuted;
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title={t('kpi.teamTitle')} />

      {!isLoading && !isError && (
        <>
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Icon name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('kpi.teamSearchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STATUS_CHIPS.map((s) => {
              const active = statusF === s.key;
              return (
                <TouchableOpacity key={s.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatusF(s.key)} activeOpacity={0.75}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(s.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('kpi.loadError')} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={members}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          keyExtractor={(m) => String(m.employee_id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            data?.period_begin ? (
              <Text style={styles.periodNote}>
                {dayjs(data.period_begin).format('DD.MM.YYYY')} — {data.period_end ? dayjs(data.period_end).format('DD.MM.YYYY') : ''}
              </Text>
            ) : null
          }
          renderItem={({ item: m }) => {
            const pending = Number(m.pending_tasks || 0);
            return (
              <TouchableOpacity
                style={[styles.card, cols > 1 && styles.cardGrid]}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({ pathname: '/kpi', params: { employeeId: String(m.employee_id) } })
                }
              >
                {m.photo_path ? (
                  <Image source={{ uri: m.photo_path }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{(m.legal_name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{m.legal_name || '—'}</Text>
                  {!!(m.job_position_name || m.department_name) && (
                    <Text style={styles.sub} numberOfLines={1}>
                      {[m.job_position_name, m.department_name].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {t('kpi.teamEntries')}: {Number(m.entries_count || 0)}
                    </Text>
                    {pending > 0 && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>
                          {t('kpi.teamPending')}: {pending}
                        </Text>
                      </View>
                    )}
                    {!!m.all_done && (
                      <View style={styles.doneRow}>
                        <Icon name="check" size={12} color={colors.success} />
                        <Text style={styles.doneText}>{t('kpi.teamAllDone')}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.right}>
                  <Text style={[styles.result, { color: resultColor(m.result_percent) }]}>
                    {m.result_percent != null ? `${Number(m.result_percent).toFixed(0)}%` : '—'}
                  </Text>
                  <Icon name="chevronRight" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState icon="users" title={t('kpi.teamEmpty')} />}
        />
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
    periodNote: { fontSize: 12, color: c.textMuted, marginBottom: 10, marginLeft: 2 },
    gridRow: { gap: 12 },

    searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card,
      borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, height: 44,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 14 },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onPrimary },

    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10,
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
    },
    cardGrid: { flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.skeleton },
    avatarFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: c.primary },
    name: { fontSize: 15, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
    metaText: { fontSize: 11.5, color: c.textMuted },
    pendingBadge: {
      backgroundColor: c.warningSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    },
    pendingBadgeText: { fontSize: 10.5, fontWeight: '700', color: c.warning },
    doneRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    doneText: { fontSize: 10.5, fontWeight: '600', color: c.success },

    right: { alignItems: 'flex-end', gap: 4 },
    result: { fontSize: 16, fontWeight: '800' },
  });
