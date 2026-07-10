import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { WorkLeave } from '@/types';
import { myLeavesQuery, assignedLeavesQuery } from '../api/queries';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function isPendingStatus(s: string) { return s === 'pending' || s === 'yuborildi'; }
function isApprovedStatus(s: string) { return s === 'approved' || s === 'tasdiqlangan' || s === 'signed'; }
function isRejectedStatus(s: string) { return s === 'rejected' || s === 'rad_etilgan'; }

function statusMeta(status: string, c: ThemeColors, t: TFunction) {
  if (isApprovedStatus(status)) return { label: t('leaves.statusApproved'), fg: c.success, bg: c.successSoft };
  if (isRejectedStatus(status)) return { label: t('leaves.statusRejected'), fg: c.error, bg: c.errorSoft };
  return { label: t('leaves.statusPending'), fg: c.warning, bg: c.warningSoft };
}

// Filter tabs carry a translation key; the label text is resolved at render so
// it switches with the app language.
const MY_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'pending', labelKey: 'leaves.statusPending' },
  { key: 'approved', labelKey: 'leaves.statusApproved' },
  { key: 'rejected', labelKey: 'leaves.statusRejected' },
];

const INCOMING_FILTERS: { key: 'all' | 'action' | 'approved' | 'rejected'; labelKey: string }[] = [
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
          {leave.employee.photo_path ? (
            <Image source={{ uri: leave.employee.photo_path }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{(leave.employee.legal_name || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.empName} numberOfLines={1}>{leave.employee.legal_name}</Text>
        </View>
      )}
      <View style={styles.cardTop}>
        <Text style={styles.categoryName} numberOfLines={1}>{leave.type ?? t('leaves.typeFallback')}</Text>
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
  const isSupervisor = !employee?.supervisor;

  const [myFilter, setMyFilter] = useState<StatusFilter>('all');
  const [incomingFilter, setIncomingFilter] = useState<'all' | 'action' | 'approved' | 'rejected'>('action');

  const { data: myLeaves = [], isLoading: myLoading, refetch: myRefetch, isFetching: myFetching } =
    useQuery({
      ...myLeavesQuery(employeeId),
      enabled: !!employeeId && !isSupervisor,
      staleTime: 2 * 60 * 1000,
    });

  const { data: allLeaves = [], isLoading: allLoading, refetch: allRefetch, isFetching: allFetching } =
    useQuery({
      ...assignedLeavesQuery(employeeId),
      enabled: !!employeeId && isSupervisor,
      staleTime: 30 * 1000,
      refetchInterval: 60 * 1000,
    });

  const isLoading = isSupervisor ? allLoading : myLoading;
  const isFetching = isSupervisor ? allFetching : myFetching;
  const refetch = isSupervisor ? allRefetch : myRefetch;

  const filteredMyLeaves = useMemo(() => {
    const base = myFilter === 'all' ? myLeaves : myLeaves.filter((l) => {
      if (myFilter === 'pending') return isPendingStatus(l.status);
      if (myFilter === 'approved') return isApprovedStatus(l.status);
      if (myFilter === 'rejected') return isRejectedStatus(l.status);
      return true;
    });
    return [...base].sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)));
  }, [myLeaves, myFilter]);

  const filteredIncoming = useMemo(() => {
    const base = allLeaves.filter((l) => {
      if (incomingFilter === 'all') return true;
      const alreadySigned = l.signers?.some((s) => s.id === employeeId);
      if (incomingFilter === 'action') return isPendingStatus(l.status) && !alreadySigned;
      if (incomingFilter === 'approved') return isApprovedStatus(l.status) || alreadySigned;
      if (incomingFilter === 'rejected') return isRejectedStatus(l.status);
      return true;
    });
    return [...base].sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)));
  }, [allLeaves, incomingFilter, employeeId]);

  const pendingCount = useMemo(
    () => allLeaves.filter((l) => isPendingStatus(l.status) && !l.signers?.some((s) => s.id === employeeId)).length,
    [allLeaves, employeeId]
  );

  const filters = isSupervisor ? INCOMING_FILTERS : MY_FILTERS;
  const activeFilter = isSupervisor ? incomingFilter : myFilter;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{isSupervisor ? t('leaves.incomingTitle') : t('leaves.myTitle')}</Text>
          {isSupervisor && pendingCount > 0 && (
            <View style={styles.countBadge}><Text style={styles.countBadgeText}>{pendingCount}</Text></View>
          )}
        </View>
        {!isSupervisor ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-leave')} activeOpacity={0.7}>
            <Icon name="plus" size={22} color={colors.primary} strokeWidth={2.4} />
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => isSupervisor ? setIncomingFilter(f.key as any) : setMyFilter(f.key as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {t(f.labelKey)}{isSupervisor && f.key === 'action' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <LoadingView />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
          >
            {isSupervisor ? (
              filteredIncoming.length === 0 ? (
                <EmptyState
                  icon="checklist"
                  title={incomingFilter === 'action' ? t('leaves.emptyPending') : t('leaves.emptyLeaves')}
                />
              ) : (
                filteredIncoming.map((leave) => {
                  const alreadySigned = leave.signers?.some((s) => s.id === employeeId);
                  const actionNeeded = isPendingStatus(leave.status) && !alreadySigned;
                  return <LeaveCard key={leave.id} leave={leave} showEmployee actionNeeded={actionNeeded} styles={styles} colors={colors} />;
                })
              )
            ) : (
              filteredMyLeaves.length === 0 ? (
                <EmptyState icon="checklist" title={t('leaves.emptyLeaves')} />
              ) : (
                filteredMyLeaves.map((leave) => <LeaveCard key={leave.id} leave={leave} styles={styles} colors={colors} />)
              )
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {!isSupervisor && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-leave')} activeOpacity={0.85}>
          <Icon name="plus" size={24} color={colors.onPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
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
    headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 4, gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: c.text },
    countBadge: { backgroundColor: c.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
    countBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    addBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { fontSize: 24, color: c.primaryLight, fontWeight: '400' },

    filterWrapper: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    filterTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterTabText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    filterTabTextActive: { color: c.onPrimary },

    content: { paddingHorizontal: 16, paddingTop: 8 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 14, marginBottom: 10, gap: 6 },
    cardHighlight: { borderColor: c.warning, backgroundColor: c.warningSoft },
    actionBadgeRow: { flexDirection: 'row' },
    actionBadge: { backgroundColor: c.warningSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionBadgeText: { fontSize: 11, fontWeight: '700', color: c.warning },

    empRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    avatar: { width: 30, height: 30, borderRadius: 15 },
    avatarPlaceholder: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 12, fontWeight: '700', color: c.primaryLight },
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
