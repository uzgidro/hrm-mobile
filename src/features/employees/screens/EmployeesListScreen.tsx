import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, FlatList, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { AccessDenied } from '@/components/AccessDenied';
import { canAccessPage } from '@/utils/roles';
import { employeesListQuery } from '../api/queries';

export default function EmployeesListScreen() {
  const { user } = useAuthStore();
  const { onlySubordinates } = usePrefsStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const myId = user?.employee?.id;
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(employeesListQuery(orgBranchId));

  const employees = useMemo(() => {
    const list = data?.items ?? [];
    return onlySubordinates && myId ? list.filter((e) => e.supervisor_id === myId) : list;
  }, [data?.items, onlySubordinates, myId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.trim().toLowerCase();
    return employees.filter((e) =>
      e.legal_name.toLowerCase().includes(q) ||
      (e.job_position?.name?.toLowerCase().includes(q) ?? false) ||
      (e.department?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [employees, search]);

  const totalLabel = onlySubordinates ? employees.length : (data?.total ?? 0);

  if (!canAccessPage(user, 'employees')) {
    return <AccessDenied title="Xodimlar" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {onlySubordinates ? "Bo'ysunuvchilar" : 'Xodimlar'} {totalLabel ? `(${totalLabel})` : ''}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ism, lavozim, bo'lim..."
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

      {isLoading ? (
        <LoadingView />
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
              onPress={() => router.push({ pathname: '/profile-detail', params: { id: emp.id } })}
              activeOpacity={0.7}
            >
              {emp.photo_path ? (
                <Image source={{ uri: emp.photo_path }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{(emp.legal_name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.empInfo}>
                <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                <Text style={styles.empSub} numberOfLines={1}>{emp.job_position?.name ?? emp.department?.name ?? '—'}</Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState icon="users" title={search ? 'Topilmadi' : "Xodimlar yo'q"} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },

    searchWrapper: {
      paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card,
      borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, height: 46,
    },
    searchIcon: { fontSize: 15 },
    searchInput: { flex: 1, color: c.text, fontSize: 14 },
    clearIcon: { fontSize: 14, color: c.textMuted },

    list: { paddingTop: 4, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 76 },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bg },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: c.primaryLight },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '700', color: c.text },
    empSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    arrowIcon: { fontSize: 22, color: c.textMuted },
  });
