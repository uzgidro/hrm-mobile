import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, FlatList, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { fetchAllEmployees, employeesQueryKey } from '@/utils/employees';
import { monthName } from '@/i18n/dates';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { birthdaysListQuery } from '../api/queries';

export default function BirthdaysScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { onlySubordinates } = usePrefsStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const myId = user?.employee?.id;
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const [search, setSearch] = useState('');

  const { data: birthdays = [], isLoading } = useQuery(birthdaysListQuery(orgBranchId));

  // The birthdays endpoint returns the whole branch (no subordinate filter), so
  // when "Faqat bo'ysunuvchilar" is on we intersect with the user's subordinates
  // (resolved from the employees list, which carries supervisor_id).
  const { data: empData } = useQuery({
    queryKey: employeesQueryKey(orgBranchId),
    queryFn: () => fetchAllEmployees(orgBranchId),
    enabled: onlySubordinates && !!myId,
    staleTime: 5 * 60 * 1000,
  });

  const subordinateIds = useMemo(() => {
    if (!onlySubordinates || !myId) return null;
    return new Set((empData?.items ?? []).filter((e) => e.supervisor_id === myId).map((e) => e.id));
  }, [onlySubordinates, myId, empData]);

  const base = useMemo(
    () => (subordinateIds ? birthdays.filter((b) => subordinateIds.has(b.id)) : birthdays),
    [birthdays, subordinateIds]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((e) => e.legal_name.toLowerCase().includes(q) || (e.job_position?.name?.toLowerCase().includes(q) ?? false));
  }, [base, search]);

  const today = dayjs();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('birthdays.title')}{base.length ? ` (${base.length})` : ''}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput style={styles.searchInput} placeholder={t('common.search')} placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} returnKeyType="search" />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item: emp }) => {
            const isToday = emp.days_left === 0;
            const isSoon = emp.days_left !== undefined && emp.days_left > 0 && emp.days_left <= 7;
            const birthDay = emp.birth_date ? dayjs(emp.birth_date) : null;
            return (
              <TouchableOpacity style={styles.empRow} onPress={() => router.push({ pathname: '/profile-detail', params: { id: emp.id } })} activeOpacity={0.7}>
                {emp.photo_path ? (
                  <Image source={{ uri: emp.photo_path }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{(emp.legal_name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.empInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                    {isToday && (
                      <View style={styles.todayBadgeRow}>
                        <Icon name="gift" size={13} color={colors.warning} />
                        <Text style={styles.todayBadge}>{t('birthdays.today')}</Text>
                      </View>
                    )}
                    {isSoon && !isToday && <Text style={styles.soonBadge}>{t('birthdays.daysLeft', { count: emp.days_left })}</Text>}
                  </View>
                  <Text style={styles.empSub} numberOfLines={1}>{emp.job_position?.name ?? '—'}</Text>
                  {birthDay && (
                    <View style={styles.birthDateRow}>
                      <Icon name="cake" size={14} color={isToday ? colors.warning : colors.textSecondary} />
                      <Text style={[styles.birthDate, isToday && styles.birthDateToday]}>
                        {birthDay.date()} {monthName(birthDay.month())}
                        <Text style={styles.yearLabel}>{' · '}{t('birthdays.age', { count: today.year() - birthDay.year() })}</Text>
                      </Text>
                    </View>
                  )}
                </View>
                <Icon name="chevronRight" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="cake" title={search ? t('common.notFound') : t('birthdays.empty')} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },

    searchWrapper: { paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, height: 46 },
    searchIcon: { fontSize: 15 },
    searchInput: { flex: 1, color: c.text, fontSize: 14 },
    clearIcon: { fontSize: 14, color: c.textMuted },

    list: { paddingTop: 4, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 76 },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bg },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: c.primaryLight },
    empInfo: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    empName: { fontSize: 14, fontWeight: '700', color: c.text, flexShrink: 1 },
    empSub: { fontSize: 12, color: c.textMuted },
    birthDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    birthDate: { fontSize: 12, color: c.textSecondary },
    birthDateToday: { color: c.warning },
    yearLabel: { color: c.textMuted },
    todayBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    todayBadge: { fontSize: 11, color: c.warning, fontWeight: '700' },
    soonBadge: { fontSize: 11, color: c.primaryLight, fontWeight: '700', backgroundColor: c.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    arrowIcon: { fontSize: 22, color: c.textMuted },
  });
