// «Mening jamoam» — rahbar paneli: kun bo'yicha jamoa holati (donut), so'nggi
// so'rovlar, jamoa ro'yxati va tug'ilgan kunlar.
//
// Jamoa — web v2 MyTeamPage manbai: `GET /employees/my-team?day=` (rahbarning
// O'Z odamlari: bevosita va bilvosita bo'ysunuvchilar + boshqaradigan
// bo'limlari, har biri kunning tabel holati bilan). QA 2026-10-05: ekran
// filial bo'yicha kategoriyalarni (`useDayRoster`) o'qirdi va jamoa o'rniga
// butun filialni (153 kishi) ko'rsatardi. v2 kabi kun tanlanadi (bugundan
// oldinga emas); dam olishdagilar alohida, hisobga kirmaydi.
// Tug'ilgan kunlar `['birthdays', 'list', branch]` kalitida — BirthdaysScreen bilan bitta kesh.
// v3: `src/ui` primitivlarida; planshetda ikki ustun.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
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
import { useBreakpoint } from '@/utils/responsive';
import { buildRosterFromMyTeam, type RosterRow } from '@/utils/attendanceRoster';
import { leaveStatusGroup, leaveRangeText, leaveTypeLabel } from '@/utils/leaveStatus';
import { monthName, weekdayName } from '@/i18n/dates';
import { Icon } from '@/components/Icon';
import type { EmployeeBirthday, WorkLeave } from '@/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Donut,
  IconButton,
  ListRow,
  PageHeader,
  Screen,
  Skeleton,
  Text,
  type Tone,
} from '@/ui';
import { myTeamQuery, teamLeavesQuery } from '../api/queries';
import { useActiveBranchId } from '@/lib/useActiveBranch';

const birthdaysListKey = (orgBranchId?: number) => ['birthdays', 'list', orgBranchId ?? null] as const;
const STATUS_TONE: Record<'pending' | 'approved' | 'rejected', Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};
const ROW_TONE: Record<RosterRow['status'], Tone> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  onLeave: 'info',
};

export default function TeamScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useActiveBranchId();
  const onlySubordinates = usePrefsStore((s) => s.onlySubordinates);
  const { colors } = useTheme();
  const { sizeClass } = useBreakpoint();
  const wide = sizeClass !== 'compact';
  const myId = user?.employee?.id;
  const orgBranchId = activeBranchId;
  const today = dayjs().format('YYYY-MM-DD');
  const [day, setDay] = useState(today);
  const sel = dayjs(day);
  const isToday = day === today;
  const dateLabel = `${sel.date()} ${monthName(sel.month(), { genitive: true })}, ${weekdayName(sel.day())}`;

  // Jamoa va kun holati — v2 MyTeamPage (`employees/my-team?day=`).
  // «Faqat bo'ysunuvchilar» sozlamasi — faqat bevosita bo'ysunuvchilar (`via: direct`).
  const teamQ = useQuery(myTeamQuery(day));
  const roster = useMemo(() => buildRosterFromMyTeam(teamQ.data, onlySubordinates), [teamQ.data, onlySubordinates]);
  const members = useMemo(() => [...roster.rows, ...(roster.dayOff ?? [])], [roster]);
  const memberIds = useMemo(() => new Set(members.map((r) => r.employee.id)), [members]);

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
  const refreshing = teamQ.isRefetching || leavesQ.isRefetching || bDayQ.isRefetching;
  const refetchAll = () => {
    void teamQ.refetch();
    void leavesQ.refetch();
    void bDayQ.refetch();
  };

  const recentLeaves = useMemo(
    () =>
      [...((leavesQ.data as WorkLeave[] | undefined) ?? [])]
        .filter((l) => !l.employee?.id || memberIds.has(l.employee.id))
        .sort((a, b) => (b.created_at ?? String(b.id)).localeCompare(a.created_at ?? String(a.id)))
        .slice(0, 3),
    [leavesQ.data, memberIds],
  );
  const birthdays = (bDayQ.data ?? []).slice(0, 3);

  const { total, present, late, onLeave, absent } = roster.counts;
  const legend = [
    { key: 'present', value: present, color: colors.success, label: t('attendance.legend.present') },
    { key: 'late', value: late, color: colors.warning, label: t('attendance.legend.late') },
    { key: 'onLeave', value: onLeave, color: colors.brand, label: t('attendance.legend.onLeaveTeam') },
    { key: 'absent', value: absent, color: colors.danger, label: t('attendance.legend.absent') },
  ];
  const dayOffCount = roster.dayOff?.length ?? 0;

  const dayNav = (
    <View style={styles.dayNav}>
      <IconButton
        icon="chevronLeft"
        accessibilityLabel={t('attendance.prevDay')}
        onPress={() => setDay(sel.subtract(1, 'day').format('YYYY-MM-DD'))}
        testID="team-prev-day"
      />
      <Text variant="label" style={styles.dayLabel} testID="team-day">
        {isToday ? `${t('attendance.today')} · ${dateLabel}` : dateLabel}
      </Text>
      {!isToday ? (
        <IconButton
          icon="chevronRight"
          accessibilityLabel={t('attendance.nextDay')}
          onPress={() => setDay(sel.add(1, 'day').format('YYYY-MM-DD'))}
          testID="team-next-day"
        />
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );

  const attendanceCard = (
    <Card title={t('attendance.title')} icon="chart" tint="green">
      {dayNav}
      {teamQ.isLoading ? (
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
              {dayOffCount > 0 && (
                <Text variant="caption" tone="subtle" testID="team-day-off">
                  {t('attendance.dayOffCount', { count: dayOffCount })}
                </Text>
              )}
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
              // The raw `type` is an untranslated preset value — show its label.
              title={leave.type ? leaveTypeLabel(t, leave.type) : t('attendance.requestFallback')}
              subtitle={`${leaveRangeText(leave.start_date, leave.end_date)} · ${leave.employee?.legal_name ?? '—'}`}
              left={<Avatar name={leave.employee?.legal_name ?? '?'} uri={leave.employee?.photo_path} thumb={leave.employee?.photo_thumb_path} size={40} />}
              right={<Badge label={t(`attendance.status.${group}`)} tone={STATUS_TONE[group]} />}
              onPress={() => router.push({ pathname: '/leave-detail', params: { id: leave.id } })}
            />
          );
        })
      )}
      {/* Web v2 (RequestPermissionPage): so'rovni xodim kartasi bor HAR KIM yaratadi —
          rahbari bo'lmasa server uni bo'lim boshlig'iga / kadrga yo'naltiradi. */}
      {!!myId && (
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

  const rowStatusLabel = (r: RosterRow) =>
    r.status === 'onLeave' ? (r.leaveName ?? t('attendance.section.onLeave')) : t(`attendance.section.${r.status}`);

  const teamCard = (
    <Card title={`${t('attendance.teamTitle')} · ${members.length}`} icon="users" tint="violet">
      {teamQ.isLoading ? (
        <Skeleton height={120} />
      ) : members.length === 0 ? (
        <Text variant="body" tone="muted" style={styles.empty}>
          {t('attendance.noEmployees')}
        </Text>
      ) : (
        members.map((r) => (
          <ListRow
            key={r.employee.id}
            title={r.employee.legal_name ?? '—'}
            subtitle={
              r.entryTime
                ? `${r.employee.job_position?.name ?? r.employee.department?.name ?? '—'} · ${dayjs(r.entryTime).format('HH:mm')}`
                : (r.employee.job_position?.name ?? r.employee.department?.name ?? '—')
            }
            left={
              <Avatar
                name={r.employee.legal_name ?? '?'}
                uri={r.employee.photo_thumb_path ?? r.employee.photo_path ?? undefined}
                size={40}
              />
            }
            right={<Badge label={rowStatusLabel(r)} tone={r.code === 'day_off' ? 'neutral' : ROW_TONE[r.status]} />}
            onPress={() => router.push({ pathname: '/profile-detail', params: { id: r.employee.id } })}
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
            left={<Avatar name={emp.legal_name} uri={emp.photo_path} thumb={emp.photo_thumb_path} size={40} />}
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
      <PageHeader title={t('modules.labels.team')} />
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
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center' },
  navSpacer: { width: 44 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 12 },
  legend: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  empty: { paddingVertical: 12 },
  cta: { marginTop: 12 },
  bday: { alignItems: 'flex-end', gap: 2 },
  bdayToday: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
