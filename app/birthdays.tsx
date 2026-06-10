import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, FlatList, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { EMPLOYEES_BIRTHDAYS } from '../src/api/urls';
import { COLORS } from '../src/constants';
import { EmployeeBirthday } from '../src/types';

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export default function BirthdaysScreen() {
  const { user } = useAuthStore();
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const [search, setSearch] = useState('');

  const { data: birthdays = [], isLoading } = useQuery<EmployeeBirthday[]>({
    queryKey: ['birthdays-all', orgBranchId],
    queryFn: () =>
      apiClient.get(EMPLOYEES_BIRTHDAYS, {
        params: orgBranchId ? { organization_branch_id: orgBranchId } : {},
      }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    staleTime: 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return birthdays;
    const q = search.trim().toLowerCase();
    return birthdays.filter((e) =>
      e.legal_name.toLowerCase().includes(q) ||
      (e.job_position?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [birthdays, search]);

  const today = dayjs();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Tug'ilgan kunlar{birthdays.length ? ` (${birthdays.length})` : ''}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Qidirish..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
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
            const thisYearBirthday = birthDay
              ? dayjs().year(today.year()).month(birthDay.month()).date(birthDay.date())
              : null;

            return (
              <TouchableOpacity
                style={styles.empRow}
                onPress={() =>
                  router.push({ pathname: '/profile-detail', params: { id: emp.id } })
                }
                activeOpacity={0.7}
              >
                {emp.photo_path ? (
                  <Image source={{ uri: emp.photo_path }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>
                      {(emp.legal_name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.empInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                    {isToday && <Text style={styles.todayBadge}>🎉 Bugun!</Text>}
                    {isSoon && !isToday && (
                      <Text style={styles.soonBadge}>{emp.days_left} kun</Text>
                    )}
                  </View>
                  <Text style={styles.empSub} numberOfLines={1}>
                    {emp.job_position?.name ?? '—'}
                  </Text>
                  {birthDay && (
                    <Text style={[styles.birthDate, isToday && styles.birthDateToday]}>
                      🎂 {birthDay.date()} {MONTHS_UZ[birthDay.month()]}
                      {thisYearBirthday && (
                        <Text style={styles.yearLabel}>
                          {' · '}
                          {today.year() - birthDay.year()} yosh
                        </Text>
                      )}
                    </Text>
                  )}
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyIcon}>🎂</Text>
              <Text style={styles.emptyText}>
                {search ? 'Topilmadi' : "Tug'ilgan kun yo'q"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, paddingLeft: 4 },

  searchWrapper: {
    paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  clearIcon: { fontSize: 14, color: COLORS.textMuted },

  list: { paddingTop: 4, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: COLORS.cardBorder, marginLeft: 76 },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primaryLight },
  empInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  empName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  empSub: { fontSize: 12, color: COLORS.textMuted },
  birthDate: { fontSize: 12, color: COLORS.textSecondary },
  birthDateToday: { color: COLORS.warning },
  yearLabel: { color: COLORS.textMuted },
  todayBadge: {
    fontSize: 11, color: COLORS.warning, fontWeight: '700',
  },
  soonBadge: {
    fontSize: 11, color: COLORS.primaryLight, fontWeight: '700',
    backgroundColor: COLORS.primary + '22', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 8,
  },
  arrowIcon: { fontSize: 22, color: COLORS.textMuted },

  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
});
