import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { AccessDenied } from '@/components/AccessDenied';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { FilterChip } from '@/components/FilterChip';
import { SearchBox } from '@/components/SearchBox';
import { canAccessPage } from '@/utils/roles';
import { employeesListQuery } from '../api/queries';

export default function EmployeesListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { onlySubordinates } = usePrefsStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const myId = user?.employee?.id;
  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [posFilter, setPosFilter] = useState<string>('all');

  const { data, isLoading } = useQuery(employeesListQuery(orgBranchId));

  const employees = useMemo(() => {
    const list = data?.items ?? [];
    return onlySubordinates && myId ? list.filter((e) => e.supervisor_id === myId) : list;
  }, [data?.items, onlySubordinates, myId]);

  const deptOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) { const n = e.department?.name; if (n) set.add(n); }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uz'));
  }, [employees]);
  const posOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) { const n = e.job_position?.name; if (n) set.add(n); }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uz'));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (deptFilter !== 'all' && e.department?.name !== deptFilter) return false;
      if (posFilter !== 'all' && e.job_position?.name !== posFilter) return false;
      if (!q) return true;
      return (
        e.legal_name.toLowerCase().includes(q) ||
        (e.job_position?.name?.toLowerCase().includes(q) ?? false) ||
        (e.department?.name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [employees, search, deptFilter, posFilter]);

  const totalLabel = onlySubordinates ? employees.length : (data?.total ?? 0);

  if (!canAccessPage(user, 'employees')) {
    return <AccessDenied title={t('employees.accessTitle')} />;
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={onlySubordinates ? t('employees.subordinatesTitle') : t('employees.listTitle')}
        count={totalLabel}
      />

      <View style={styles.searchWrapper}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('employees.searchPlaceholder')} />
      </View>

      {(deptOptions.length > 1 || posOptions.length > 1) && (
        <View style={styles.filtersWrap}>
          {deptOptions.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <FilterChip label={t('employees.filterAllDepartments')} active={deptFilter === 'all'} onPress={() => setDeptFilter('all')} styles={styles} />
              {deptOptions.map((d) => (
                <FilterChip key={d} label={d} active={deptFilter === d} onPress={() => setDeptFilter(d)} styles={styles} />
              ))}
            </ScrollView>
          )}
          {posOptions.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <FilterChip label={t('employees.filterAllPositions')} active={posFilter === 'all'} onPress={() => setPosFilter('all')} styles={styles} subtle />
              {posOptions.map((p) => (
                <FilterChip key={p} label={p} active={posFilter === p} onPress={() => setPosFilter(p)} styles={styles} subtle />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={filtered}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={cols > 1 ? undefined : () => <View style={styles.separator} />}
          renderItem={({ item: emp }) => (
            <TouchableOpacity
              style={[styles.empRow, cols > 1 && styles.empRowGrid]}
              onPress={() => router.push({ pathname: '/profile-detail', params: { id: emp.id } })}
              activeOpacity={0.7}
            >
              <EmployeeAvatar emp={emp} size={48} />
              <View style={styles.empInfo}>
                <Text style={styles.empName} numberOfLines={1}>{emp.legal_name}</Text>
                <Text style={styles.empSub} numberOfLines={1}>{emp.job_position?.name ?? emp.department?.name ?? '—'}</Text>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState icon="users" title={search ? t('employees.notFound') : t('employees.empty')} />
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    searchWrapper: {
      paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },

    filtersWrap: { paddingTop: 8, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, maxWidth: 240 },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onPrimary },
    chipSubtle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, maxWidth: 240 },
    chipSubtleActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipSubtleText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    chipSubtleTextActive: { color: c.primary },

    list: { paddingTop: 4, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 76 },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bg },
    gridRow: { gap: 12, paddingHorizontal: 16 },
    empRowGrid: { flex: 1, marginHorizontal: 0, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '700', color: c.text },
    empSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    arrowIcon: { fontSize: 22, color: c.textMuted },
  });
