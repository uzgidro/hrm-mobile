import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, } from 'react-native';
import { ChipScroll } from '@/components/ChipScroll';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PagedList, usePagedRows } from '@/components/PagedList';
import { AccessDenied } from '@/components/AccessDenied';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { FilterChip } from '@/components/FilterChip';
import { SearchBox } from '@/components/SearchBox';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { canAccessPage } from '@/utils/roles';
import { employeesPagedQuery, departmentsQuery, jobPositionsQuery } from '@/utils/employees';

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
    resolveEmployeeBranchId(user?.employee);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [deptFilter, setDeptFilter] = useState<number | 'all'>('all');
  const [posFilter, setPosFilter] = useState<number | 'all'>('all');

  // Server-paged: chips → department_id / job_position_id, "only my team" →
  // supervisor_id, search → server (name/position/department, folded).
  const query = useInfiniteQuery(employeesPagedQuery({
    branchId: orgBranchId,
    departmentId: deptFilter,
    jobPositionId: posFilter,
    supervisorId: onlySubordinates && myId ? myId : undefined,
    search: debouncedSearch,
  }));
  const { total } = usePagedRows(query);

  const { data: departments = [] } = useQuery(departmentsQuery(orgBranchId));
  const { data: positions = [] } = useQuery(jobPositionsQuery(orgBranchId));
  const deptOptions = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name, 'uz')),
    [departments],
  );
  const posOptions = useMemo(
    () => [...positions].sort((a, b) => a.name.localeCompare(b.name, 'uz')),
    [positions],
  );

  if (!canAccessPage(user, 'employees')) {
    return <AccessDenied title={t('employees.accessTitle')} />;
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={onlySubordinates ? t('employees.subordinatesTitle') : t('employees.listTitle')}
        count={total ?? 0}
      />

      <View style={styles.searchWrapper}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('employees.searchPlaceholder')} />
      </View>

      {(deptOptions.length > 1 || posOptions.length > 1) && (
        <View style={styles.filtersWrap}>
          {deptOptions.length > 1 && (
            <ChipScroll contentContainerStyle={styles.chipRow}>
              <FilterChip label={t('employees.filterAllDepartments')} active={deptFilter === 'all'} onPress={() => setDeptFilter('all')} styles={styles} />
              {deptOptions.map((d) => (
                <FilterChip key={d.id} label={d.name} active={deptFilter === d.id} onPress={() => setDeptFilter(d.id)} styles={styles} />
              ))}
            </ChipScroll>
          )}
          {posOptions.length > 1 && (
            <ChipScroll contentContainerStyle={styles.chipRow}>
              <FilterChip label={t('employees.filterAllPositions')} active={posFilter === 'all'} onPress={() => setPosFilter('all')} styles={styles} subtle />
              {posOptions.map((p) => (
                <FilterChip key={p.id} label={p.name} active={posFilter === p.id} onPress={() => setPosFilter(p.id)} styles={styles} subtle />
              ))}
            </ChipScroll>
          )}
        </View>
      )}

      <PagedList
        query={query}
        keyExtractor={(item) => String(item.id)}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={cols > 1 ? undefined : () => <View style={styles.separator} />}
        emptyIcon="users"
        emptyTitle={search ? t('employees.notFound') : t('employees.empty')}
        hideCount
        renderItem={(emp) => (
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
      />
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

    list: { paddingHorizontal: 0, paddingTop: 4, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 76 },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bg },
    gridRow: { gap: 12, paddingHorizontal: 16 },
    empRowGrid: { flex: 1, marginHorizontal: 0, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder },
    empInfo: { flex: 1 },
    empName: { fontSize: 14, fontWeight: '700', color: c.text },
    empSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    arrowIcon: { fontSize: 22, color: c.textMuted },
  });
