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
import { useBreakpoint } from '@/utils/responsive';
import { hasSupervisor } from '@/utils/roles';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { PagedList } from '@/components/PagedList';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { SearchBox } from '@/components/SearchBox';
import { WorkLeave } from '@/types';
import { leaveStatusGroup, leaveStatusKind } from '@/utils/leaveStatus';
import { statusColor } from '@/utils/orderStatus';
import { leavesListQuery, type IncomingFilter } from '../api/queries';
import { leaveTypeLabel } from '../components/LeaveTypeSheet';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function isPendingStatus(s: string) { return leaveStatusGroup(s) === 'pending'; }

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

const INCOMING_FILTERS: { key: IncomingFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'action', labelKey: 'leaves.statusPending' },
  { key: 'approved', labelKey: 'leaves.statusApproved' },
  { key: 'rejected', labelKey: 'leaves.statusRejected' },
];

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

export default function WorkLeavesScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const employeeId = employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const isSupervisor = !hasSupervisor(user);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;

  const [myFilter, setMyFilter] = useState<StatusFilter>('all');
  const [incomingFilter, setIncomingFilter] = useState<IncomingFilter>('action');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  // One server-paged list per role; chips/search are server params
  // (`workLeavesServerParams`).
  const query = useInfiniteQuery({
    ...leavesListQuery(
      isSupervisor
        ? { scope: 'assigned', status: incomingFilter, search: debouncedSearch }
        : { scope: 'mine', employeeId, status: myFilter, search: debouncedSearch },
    ),
    enabled: !!employeeId,
  });

  // "Kutilmoqda" count = the server's menu-badge number (same as the tab bar).
  const { data: badges } = useQuery(menuBadgesQuery());
  const pendingCount = badges?.leaves ?? 0;

  const filters = isSupervisor ? INCOMING_FILTERS : MY_FILTERS;
  const activeFilter = isSupervisor ? incomingFilter : myFilter;

  const fab = !isSupervisor ? (
    <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-leave')} activeOpacity={0.85}>
      <Icon name="plus" size={24} color={colors.onPrimary} strokeWidth={2.4} />
    </TouchableOpacity>
  ) : undefined;

  return (
    <Screen edges={['top', 'bottom']} overlay={fab}>
      <ScreenHeader
        title={isSupervisor ? t('leaves.incomingTitle') : t('leaves.myTitle')}
        count={isSupervisor ? pendingCount : undefined}
        countTone="attention"
        right={!isSupervisor ? <HeaderAction icon="plus" onPress={() => router.push('/create-leave')} /> : undefined}
      />

      <View style={styles.filterWrapper}>
        <ChipScroll contentContainerStyle={styles.filterRow}>
          {filters.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => isSupervisor ? setIncomingFilter(f.key as IncomingFilter) : setMyFilter(f.key as StatusFilter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {t(f.labelKey)}{isSupervisor && f.key === 'action' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                </Text>
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
          filtersActive={!!search.trim() || (isSupervisor ? incomingFilter !== 'action' : myFilter !== 'all')}
          onClearFilters={() => { setSearch(''); setIncomingFilter('action'); setMyFilter('all'); }}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.wrapRow : undefined}
          contentContainerStyle={styles.content}
          emptyIcon="checklist"
          emptyTitle={isSupervisor && incomingFilter === 'action' ? t('leaves.emptyPending') : t('leaves.emptyLeaves')}
          renderItem={(leave) => {
            const alreadySigned = leave.signers?.some((s) => s.id === employeeId);
            const actionNeeded = isSupervisor && isPendingStatus(leave.status) && !alreadySigned;
            return (
              <View style={cols > 1 ? { flex: 1 / cols } : undefined}>
                <LeaveCard leave={leave} showEmployee={isSupervisor} actionNeeded={actionNeeded} styles={styles} colors={colors} />
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
    filterWrapper: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0 },
    filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    filterTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterTabText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    filterTabTextActive: { color: c.onPrimary },

    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
    wrapRow: { gap: 12 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 14, marginBottom: 10, gap: 6 },
    cardHighlight: { borderColor: c.warning, backgroundColor: c.warningSoft },
    actionBadgeRow: { flexDirection: 'row' },
    actionBadge: { backgroundColor: c.warningSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionBadgeText: { fontSize: 11, fontWeight: '700', color: c.warning },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    empName: { flex: 1, fontSize: 13, color: c.textSecondary, fontWeight: '600' },

    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    categoryName: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateIcon: { fontSize: 13 },
    dateText: { fontSize: 13, color: c.textSecondary, flex: 1 },
    comment: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
    createdAt: { fontSize: 11, color: c.textMuted },

    fab: {
      position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },
    fabText: { fontSize: 24, color: c.onPrimary, fontWeight: '400' },
  });
