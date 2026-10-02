// «Jamoam» — rahbar paneli: bugungi davomat (donut), so'nggi so'rovlar, jamoa va
// tug'ilgan kunlar. To'rt domen: davomat + so'rovlar shu feature fabrikalaridan;
// xodimlar `useDayRoster` (umumiy); tug'ilgan kunlar `['birthdays', 'list', branch]`
// kalitida — BirthdaysScreen bilan bitta kesh, feature'lararo importsiz.
// v3: `src/ui` primitivlarida; planshetda ikki ustun.
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { EMPLOYEES_BIRTHDAYS } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { useBreakpoint } from '@/utils/responsive';
import { canAccessPage, hasSupervisor } from '@/utils/roles';
import { useDayRoster } from '@/lib/useDayRoster';
import { leaveStatusGroup } from '@/utils/leaveStatus';
import { Icon } from '@/components/Icon';
import type { EmployeeBirthday, WorkLeave } from '@/types';
import { Avatar, Badge, Button, Card, Donut, ListRow, PageHeader, Screen, Skeleton, Text, type Tone } from '@/ui';
import { teamLeavesQuery } from '../api/queries';

const birthdaysListKey = (orgBranchId?: number) => ['birthdays', 'list', orgBranchId ?? null] as const;
const STATUS_TONE: Record<'pending' | 'approved' | 'rejected', Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function TeamScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const onlySubordinates = usePrefsStore((s) => s.onlySubordinates);
  const { colors } = useTheme();
  const { sizeClass } = useBreakpoint();
  const wide = sizeClass !== 'compact';
  const myId = user?.employee?.id;
  const orgBranchId = resolveEmployeeBranchId(user?.employee);
  const today = dayjs().format('YYYY-MM-DD');

  // Bugungi ro'yxat: filial kategoriyalari (web employee-dashboard manbai) + kirish vaqtlari uchun xom voqealar.
  const rosterQ = useDayRoster({ date: today, orgBranchId, onlySubordinates, myId });
  const [leavesQ, bDayQ] = useQueries({
    queries: [
      teamLeavesQuery(today, 20, orgBranchId),
      {
        queryKey: birthdaysListKey(orgBranchId),
        queryFn: () =>
          apiClient
            .get(EMPLOYEES_BIRTHDAYS, { params: orgBranchId ? { organization_branch_id: orgBranchId } : {} })
            .then((r) => unwrapList<EmployeeBirthday>(r.data)),
        staleTime: 60 * 60 * 1000,
      },
    ],
  });
  const refreshing = rosterQ.isFetching || leavesQ.isRefetching || bDayQ.isRefetching;
  const refetchAll = () => {
    rosterQ.refetch();
    void leavesQ.refetch();
    void bDayQ.refetch();
  };

  const roster = rosterQ.roster;
  const employees = useMemo(() => roster.rows.map((r) => r.employee), [roster]);
  const empIdSet = useMemo(() => new Set(employees.map((e) => e.id)), [employees]);
  const recentLeaves = useMemo(
    () =>
      [...((leavesQ.data as WorkLeave[] | undefined) ?? [])]
        .filter((l) => !l.employee?.id || empIdSet.has(l.employee.id))
        .sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)))
        .slice(0, 3),
    [leavesQ.data, empIdSet],
  );
  const topEmployees = employees.slice(0, 3);
  const birthdays = (bDayQ.data ?? []).slice(0, 3);

  const total = rosterQ.total;
  const { present, late, onLeave } = roster.counts;
  const absent = Math.max(0, total - present - late - onLeave);
  const legend = [
    { key: 'present', value: present, color: colors.success, label: t('attendance.legend.present') },
    { key: 'late', value: late, color: colors.warning, label: t('attendance.legend.late') },
    { key: 'onLeave', value: onLeave, color: colors.brand, label: t('attendance.legend.onLeaveTeam') },
    { key: 'absent', value: absent, color: colors.danger, label: t('attendance.legend.absent') },
  ];

  const attendanceCard = (
    <Card title={t('attendance.title')} icon="chart" tint="green">
      {rosterQ.isLoading ? (
        <Skeleton height={160} />
      ) : (
        <>
          <View style={styles.chartRow}>
            <Donut
              segments={legend.map((l) => ({ value: l.value, color: l.color }))}
              size={150}
              accessibilityLabel={t('attendance.title')}
              center={<Text variant="number">{String(total)}</Text>}
            />
            <View style={styles.legend}>
              {legend
                // Kelmaganlar har doim ko'rinadi (v1 xatti-harakati), qolganlari faqat > 0 bo'lsa.
                .filter((l) => l.key === 'absent' || l.value > 0)
                .map((l) => (
                  <View key={l.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <View>
                      <Text variant="label">{String(l.value)}</Text>
                      <Text variant="caption" tone="muted">
                        {l.label}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
          <Button label={t('attendance.details')} onPress={() => router.push('/attendance-detail')} full />
        </>
      )}
    </Card>
  );

  const requestsCard = (
    <Card
      title={t('attendance.requestsTitle')}
      icon="checklist"
      tint="pink"
      action={{ label: t('common.all'), onPress: () => router.push('/team-leaves') }}
    >
      {leavesQ.isPending ? (
        <Skeleton height={120} />
      ) : recentLeaves.length === 0 ? (
        <Text variant="body" tone="muted" style={styles.empty}>
          {t('attendance.noRequests')}
        </Text>
      ) : (
        recentLeaves.map((leave) => {
          const group = leaveStatusGroup(leave.status);
          return (
            <ListRow
              key={leave.id}
              title={leave.type ?? t('attendance.requestFallback')}
              subtitle={`${dayjs(leave.start_date).format('D MMM YYYY, HH:mm')} – ${dayjs(leave.end_date).format('HH:mm')} · ${leave.employee?.legal_name ?? '—'}`}
              left={<Avatar name={leave.employee?.legal_name ?? '?'} uri={leave.employee?.photo_path} size={40} />}
              right={<Badge label={t(`attendance.status.${group}`)} tone={STATUS_TONE[group]} />}
              onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
            />
          );
        })
      )}
      {/* Web pariteti (RequestPermissionPage.canCreatePermission): faqat rahbari BOR
          xodim so'rov yubora oladi — yuqori rahbarning yuboradigan odami yo'q. */}
      {hasSupervisor(user) && (
        <Button
          label={t('attendance.createRequest')}
          variant="soft"
          full
          onPress={() => router.push('/create-leave')}
          style={styles.cta}
        />
      )}
    </Card>
  );

  const teamCard = (
    <Card
      title={t('attendance.teamTitle')}
      icon="users"
      tint="violet"
      action={
        canAccessPage(user, 'employees')
          ? { label: t('common.all'), onPress: () => router.push('/employees-list') }
          : undefined
      }
    >
      {rosterQ.isLoading ? (
        <Skeleton height={120} />
      ) : topEmployees.length === 0 ? (
        <Text variant="body" tone="muted" style={styles.empty}>
          {t('attendance.noEmployees')}
        </Text>
      ) : (
        topEmployees.map((emp) => (
          <ListRow
            key={emp.id}
            title={emp.legal_name ?? '—'}
            subtitle={emp.job_position?.name ?? emp.department?.name ?? '—'}
            left={<Avatar name={emp.legal_name ?? '?'} uri={emp.photo_thumb_path ?? emp.photo_path} size={40} />}
            onPress={() => router.push({ pathname: '/profile-detail', params: { id: emp.id } })}
          />
        ))
      )}
    </Card>
  );

  const birthdaysCard = (bDayQ.isPending || birthdays.length > 0) && (
    <Card
      title={t('attendance.birthdaysTitle')}
      icon="cake"
      tint="amber"
      action={{ label: t('common.all'), onPress: () => router.push('/birthdays') }}
    >
      {bDayQ.isPending ? (
        <Skeleton height={100} />
      ) : (
        birthdays.map((emp) => (
          <ListRow
            key={emp.id}
            title={emp.legal_name}
            subtitle={emp.job_position?.name ?? '—'}
            left={<Avatar name={emp.legal_name} uri={emp.photo_path} size={40} />}
            right={
              <View style={styles.bday}>
                <Text variant="caption" tone="muted">
                  {emp.birth_date ? dayjs(emp.birth_date).format('D MMM') : '—'}
                </Text>
                {emp.days_left === 0 && (
                  <View style={styles.bdayToday}>
                    <Text variant="caption" tone="brand">
                      {t('attendance.birthdayToday')}
                    </Text>
                    <Icon name="gift" size={14} color={colors.warning} />
                  </View>
                )}
              </View>
            }
          />
        ))
      )}
    </Card>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refetchAll}>
      <PageHeader title={t('attendance.teamTitle')} />
      {onlySubordinates && (
        <View style={[styles.notice, { backgroundColor: colors.brandSoft }]}>
          <Icon name="users" size={16} color={colors.brand} />
          <Text variant="label" tone="brand">
            {t('attendance.onlySubordinatesTeam')}
          </Text>
        </View>
      )}
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.col, wide && styles.colWide]}>
          {attendanceCard}
          {teamCard}
        </View>
        <View style={[styles.col, wide && styles.colWide]}>
          {requestsCard}
          {birthdaysCard}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  columns: { gap: 12 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { gap: 12 },
  colWide: { flex: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 12 },
  legend: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  empty: { paddingVertical: 12 },
  cta: { marginTop: 12 },
  bday: { alignItems: 'flex-end', gap: 2 },
  bdayToday: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
