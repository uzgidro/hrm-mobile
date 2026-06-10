import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, FlatList, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants';
import { Employee } from '../src/types';
import { fetchAllEmployees, employeesQueryKey } from '../src/utils/employees';

interface EmployeePage { items: Employee[]; total: number }

export default function EmployeesListScreen() {
  const { user } = useAuthStore();
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<EmployeePage>({
    queryKey: employeesQueryKey(orgBranchId),
    queryFn: () => fetchAllEmployees(orgBranchId),
    staleTime: 5 * 60 * 1000,
  });

  const employees = data?.items ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.trim().toLowerCase();
    return employees.filter((e) =>
      e.legal_name.toLowerCase().includes(q) ||
      (e.job_position?.name?.toLowerCase().includes(q) ?? false) ||
      (e.department?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [employees, search]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Xodimlar {data?.total ? `(${data.total})` : ''}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ism, lavozim, bo'lim..."
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
          renderItem={({ item: emp }) => (
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
                <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                <Text style={styles.empSub} numberOfLines={1}>
                  {emp.job_position?.name ?? emp.department?.name ?? '—'}
                </Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>
                {search ? 'Topilmadi' : 'Xodimlar yo\'q'}
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
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  empSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  arrowIcon: { fontSize: 22, color: COLORS.textMuted },

  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
});
