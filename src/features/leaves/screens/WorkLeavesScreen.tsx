import { useState } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChipScroll } from '@/components/ChipScroll';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { useBreakpoint } from '@/utils/responsive';
import { subordinateIdsQuery } from '@/utils/employees';
import { availableLeaveScopes, type LeaveScope } from '@/utils/workLeaveScope';
import { Segmented } from '@/ui';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PagedList } from '@/components/PagedList';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { SearchBox } from '@/components/SearchBox';
import { WorkLeave } from '@/types';
import { leaveStatusGroup, leaveStatusKind } from '@/utils/leaveStatus';
import { statusColor } from '@/utils/orderStatus';
import { leavesListQuery } from '../api/queries';
import { canActOnLeave } from '../utils';
import { leaveTypeLabel } from '../components/LeaveTypeSheet';
import { useActiveBranchId } from '@/lib/useActiveBranch';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function statusMeta(status: string, c: ThemeColors, t: TFunction) {
  const group = leaveStatusGroup(status);
  const { fg, bg } = statusColor(leaveStatusKind(status), c);
  if (group === 'approved') return { label: t('leaves.statusApproved'), fg, bg };
  if (group === 'rejected') return { label: t('leaves.statusRejected'), fg, bg };
  return { label: t('leaves.statusPending'), fg, bg };
}

// Filter tabs carry a translation key; the label text is resolved at render so
// it switches with the app language.
const MY_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'pending', labelKey: 'leaves.statusPending' },
  { key: 'approved', labelKey: 'leaves.statusApproved' },
  { key: 'rejected', labelKey: 'leaves.statusRejected' },
];

// Web v2 RequestPermissionPage scope labels (Menga tegishli / Mening jamoam / Butun filial).
const SCOPE_LABEL: Record<LeaveScope, string> = {
  mine: 'leaves.scopeMine',
  team: 'leaves.scopeTeam',
  branch: 'leaves.scopeBranch',
};

function LeaveCard({ leave, showEmployee, actionNeeded, styles, colors }: {
  leave: WorkLeave; showEmployee?: boolean; actionNeeded?: boolean; styles: any; colors: ThemeColors;
}) {
  const { t } = useTranslation();
  const st = statusMeta(leave.status, colors, t);
  const sameDay = dayjs(leave.start_date).format('DD.MM.YYYY') === dayjs(leave.end_date).format('DD.MM.YYYY');
  return (
    <TouchableOpacity
      style={[styles.card, actionNeeded && styles.cardHighlight]}
      onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
      activeOpacity={0.8}
    >
      {actionNeeded && (
        <View style={styles.actionBadgeRow}>
          <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{t('leaves.actionNeeded')}</Text></View>
        </View>
      )}
      {showEmployee && leave.employee && (
        <View style={styles.empRow}>
          <EmployeeAvatar emp={leave.employee} size={30} />
          <Text style={styles.empName} numberOfLines={1}>{leave.employee.legal_name}</Text>
        </View>
      )}
      <View style={styles.cardTop}>
        <Text style={styles.categoryName} numberOfLines={1}>{leave.type ? leaveTypeLabel(t, leave.type) : t('leaves.typeFallback')}</Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
        </View>
      </View>
      <View style={styles.dateRow}>
        <Icon name="calendar" size={14} color={colors.textMuted} />
        {sameDay ? (
          <Text style={styles.dateText}>
            {dayjs(leave.start_date).format('DD.MM.YYYY')} {dayjs(leave.start_date).format('HH:mm')} – {dayjs(leave.end_date).format('HH:mm')}
          </Text>
        ) : (
          <Text style={styles.dateText}>
            {dayjs(leave.start_date).format('DD.MM.YYYY HH:mm')} – {dayjs(leave.end_date).format('DD.MM.YYYY HH:mm')}
          </Text>
        )}
      </View>
      {leave.description ? <Text style={styles.comment} numberOfLines={2}>{leave.description}</Text> : null}
      {leave.created_at ? <Text style={styles.createdAt}>{t('leaves.createdAtPrefix', { date: dayjs(leave.created_at).format('DD.MM.YYYY HH:mm') })}</Text> : null}
    </TouchableOpacity>
  );
}

// Web v2 RequestPermissionPage parity (2026-10-05). ONE list for everybody, with
// v2's scope switch — «Menga tegishli» (default: what I filed AND what is mine
// to decide), «Mening jamoam» (direct reports, `supervised=true`) for someone
// with subordinates, «Butun filial» for HR / admins — and the status chips.
//
// ⚠️ It used to pick ONE of two views by `!hasSupervisor(user)`: a person
// without a supervisor got an incoming queue filtered by `assigned_signer=true`
// (which never matches a request routed to its supervisor with no signer
// named — QA: empty list, badge 3) and NO create button (v2 always offers it;
// the server routes such a request to the department head / HR).
export default function WorkLeavesScreen() {
  const { user } = useAuthStore();
  const activeBranchId = useActiveBranchId();
  const employee = user?.employee;
  const employeeId = employee?.id;
  const branchId = activeBranchId;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;

  const [scope, setScope] = useState<LeaveScope>('mine');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  // «Mening jamoam» only for someone who supervises anyone (v2 useHasSubordinates).
  const { data: subordinateIds } = useQuery(subordinateIdsQuery(employeeId));
  const scopes = availableLeaveScopes(user, (subordinateIds?.size ?? 0) > 0);
  const activeScope: LeaveScope = scopes.includes(scope) ? scope : 'mine';

  // Server-paged; scope / status / search are server params (`workLeavesServerParams`).
  const query = useInfiniteQuery({
    ...leavesListQuery({ scope: activeScope, status: statusFilter, search: debouncedSearch, branchId }),
    enabled: !!user,
  });

  // How many wait for MY decision = the server's menu-badge number (same as the tab bar).
  const { data: badges } = useQuery(menuBadgesQuery());
  const pendingCount = badges?.leaves ?? 0;

  // ONE create affordance — the FAB, like the other v3 list screens. A request
  // belongs to a PERSON (v2: `myEmployeeId &&`), so only an employee card gets it.
  const fab = employeeId ? (
    <TouchableOpacity testID="leaves-create" style={styles.fab} onPress={() => router.push('/create-leave')} activeOpacity={0.85}>
      <Icon name="plus" size={24} color={colors.onPrimary} strokeWidth={2.4} />
    </TouchableOpacity>
  ) : undefined;

  return (
    <Screen edges={['top', 'bottom']} overlay={fab}>
      <ScreenHeader
        title={t('leaves.myTitle')}
        count={pendingCount > 0 ? pendingCount : undefined}
        countTone="attention"
      />

      {scopes.length > 1 && (
        <View style={styles.scopeWrap}>
          <Segmented<LeaveScope>
            testID="leaves-scope"
            value={activeScope}
            onChange={setScope}
            options={scopes.map((sc) => ({ value: sc, label: t(SCOPE_LABEL[sc]) }))}
          />
        </View>
      )}

      <View style={styles.filterWrapper}>
        <ChipScroll contentContainerStyle={styles.filterRow}>
          {MY_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                testID={`leaves-filter-${f.key}`}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{t(f.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </ChipScroll>
      </View>

      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('leaves.searchPlaceholder')} />
      </View>

      <View style={{ flex: 1 }}>
        <PagedList
          query={query}
          keyExtractor={(l) => String(l.id)}
          filtersActive={!!search.trim() || statusFilter !== 'all'}
          onClearFilters={() => { setSearch(''); setStatusFilter('all'); }}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.wrapRow : undefined}
          contentContainerStyle={styles.content}
          emptyIcon="checklist"
          emptyTitle={statusFilter === 'pending' ? t('leaves.emptyPending') : t('leaves.emptyLeaves')}
          renderItem={(leave) => {
            const own = (leave.employee_id ?? leave.employee?.id) === employeeId;
            const actionNeeded = canActOnLeave(leave, user).canSign;
            return (
              <View style={cols > 1 ? { flex: 1 / cols } : undefined}>
                <LeaveCard leave={leave} showEmployee={!own} actionNeeded={actionNeeded} styles={styles} colors={colors} />
              </View>
            );
          }}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scopeWrap: { paddingHorizontal: 16, paddingTop: 10, flexShrink: 0 },
    filterWrapper: { flexShrink: 0, borderBottomWidth: 2, borderBottomColor: c.cardBorder },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0 },
    filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 2, borderColor: c.cardBorder },
    filterTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterTabText: { fontSize: 13, color: c.textSecondary, ...ff('700') },
    filterTabTextActive: { color: c.onPrimary },

    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
    wrapRow: { gap: 12 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder, padding: 14, marginBottom: 10, gap: 6 },
    cardHighlight: { borderColor: c.warning, backgroundColor: c.warningSoft },
    actionBadgeRow: { flexDirection: 'row' },
    actionBadge: { backgroundColor: c.warningSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionBadgeText: { fontSize: 11, ...ff('800'), color: c.warning },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    empName: { flex: 1, fontSize: 13, color: c.textSecondary, ...ff('700') },

    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    categoryName: { fontSize: 15, ...ff('800'), color: c.text, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, ...ff('800') },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateIcon: { fontSize: 13, ...ff('700') },
    dateText: { fontSize: 13, color: c.textSecondary, flex: 1, ...ff('700') },
    comment: { fontSize: 13, color: c.textMuted, lineHeight: 18, ...ff('700') },
    createdAt: { fontSize: 11, color: c.textMuted, ...ff('700') },

    fab: {
      position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },
    fabText: { fontSize: 24, color: c.onPrimary, ...ff('600') },
  });
