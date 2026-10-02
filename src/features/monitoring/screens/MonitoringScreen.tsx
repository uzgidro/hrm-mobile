// v3 Monitoring — web v2 `pages/MonitoringPage.tsx` ning mobil shakli: bugungi 4
// ko'rsatkich, kechikkanlar (bugun), ko'p kechikadiganlar (oy), bugungi mehmonlar.
// Kechikish kartalari faqat `canSeeLateness` (v2) bo'lsa — aks holda so'rov ham yo'q.
// Filial aniqlanmasa (v2: «filial tanlang») hech narsa so'ralmaydi.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { IconName } from '@/components/Icon';
import type { ModuleTintKey } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { canSeeLateness } from '@/utils/roles';
import { useBreakpoint } from '@/utils/responsive';
import { Avatar, Badge, Bento, Card, EmptyState, ErrorState, IconButton, ListRow, Screen, Skeleton, StatTile, Text } from '@/ui';
import {
  frequentLateQuery,
  lateEmployeesQuery,
  monitoringMainQuery,
  visitorPassesQuery,
} from '../api/queries';

export default function MonitoringScreen({ showBack = false }: { showBack?: boolean } = {}) {
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  const user = useAuthStore((s) => s.user);
  const branchId = resolveEmployeeBranchId(user?.employee) ?? user?.organization_branch_id ?? undefined;
  const lateness = canSeeLateness(user);
  const today = dayjs().format('YYYY-MM-DD');

  const main = useQuery(monitoringMainQuery(branchId, today));
  const late = useQuery(lateEmployeesQuery(branchId, lateness));
  const frequent = useQuery(frequentLateQuery(branchId, today, lateness));
  const guests = useQuery(visitorPassesQuery(branchId, today));

  const header = (
    <View style={styles.header}>
      {showBack && <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />}
      <Text variant="title" accessibilityRole="header">
        {t('monitoring.title')}
      </Text>
    </View>
  );

  if (branchId == null) {
    return (
      <Screen scroll={false}>
        {header}
        <EmptyState title={t('monitoring.noBranch')} />
      </Screen>
    );
  }

  const s = main.data ?? {};
  const tileDefs: { id: string; label: string; value: number; icon: IconName; tint: ModuleTintKey }[] = [
        { id: 'mon-total', label: t('monitoring.totalEmployees'), value: s.total_employees_count ?? 0, icon: 'users', tint: 'violet' },
        { id: 'mon-present', label: t('monitoring.presentToday'), value: s.present_employees_count ?? 0, icon: 'check', tint: 'green' },
        { id: 'mon-late', label: t('monitoring.lateToday'), value: s.late_employees_count ?? 0, icon: 'clock', tint: 'amber' },
        { id: 'mon-absent', label: t('monitoring.absentToday'), value: s.absent_employees_count ?? 0, icon: 'close', tint: 'pink' },
  ];
  // Birinchi yuklash xatosi — 4 ta 0 «haqiqiy ma'lumot»dek ko'rinmasin (kiosk ekrani).
  const tiles = main.isError ? (
    <ErrorState onRetry={() => main.refetch()} />
  ) : (
    <View style={styles.tiles}>
      {tileDefs.map((x) => (
        <View key={x.id} style={{ flexBasis: sizeClass === 'compact' ? '47%' : '23%', flexGrow: 1 }}>
          <StatTile testID={x.id} label={x.label} value={x.value} icon={x.icon} tint={x.tint} />
        </View>
      ))}
    </View>
  );

  const lateCard = lateness ? (
    <Card title={t('monitoring.lateLive')} icon="clock" tint="amber">
      {late.isError ? (
        <ErrorState onRetry={() => late.refetch()} />
      ) : late.isPending ? (
        <Skeleton height={120} />
      ) : (late.data ?? []).length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('monitoring.noLateToday')}
        </Text>
      ) : (
        (late.data ?? []).slice(0, 20).map((r) => {
          const name = r.employee?.legal_name ?? '—';
          return (
            <ListRow
              key={`${r.employee_id}-${r.happen_time}`}
              title={name}
              subtitle={r.employee?.job_position?.name ?? r.employee?.department?.name ?? undefined}
              left={<Avatar name={name} uri={r.employee?.photo_path} size={34} />}
              right={
                <View style={styles.right}>
                  <Text variant="label" style={styles.time}>
                    {dayjs(r.happen_time).format('HH:mm')}
                  </Text>
                  <Badge label={t('monitoring.lateMinutes', { count: r.late_minutes })} tone="warning" />
                </View>
              }
            />
          );
        })
      )}
    </Card>
  ) : null;

  const frequentCard = lateness ? (
    <Card title={t('monitoring.frequentLate')} icon="chart" tint="pink">
      {frequent.isError ? (
        <ErrorState onRetry={() => frequent.refetch()} />
      ) : frequent.isPending ? (
        <Skeleton height={100} />
      ) : (frequent.data ?? []).length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('monitoring.noLate')}
        </Text>
      ) : (
        (frequent.data ?? []).map((r, i) => {
          const name = r.employee_name ?? '—';
          return (
            <ListRow
              key={r.employee_id ?? i}
              title={name}
              subtitle={r.job_position_name ?? r.department_name ?? undefined}
              left={<Avatar name={name} uri={r.photo_path} size={34} />}
              right={<Badge label={t('monitoring.lateCount', { count: r.late_count ?? 0 })} tone="danger" />}
            />
          );
        })
      )}
    </Card>
  ) : null;

  const guestsCard = (
    <Card title={t('monitoring.guestsLive')} icon="guest" tint="drop">
      {guests.isError ? (
        <ErrorState onRetry={() => guests.refetch()} />
      ) : guests.isPending ? (
        <Skeleton height={100} />
      ) : (guests.data ?? []).length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('monitoring.noGuests')}
        </Text>
      ) : (
        (guests.data ?? []).map((e, i) => {
          const name = e.visitor?.legal_name ?? '—';
          const entrance = e.direction_type === 'entrance';
          return (
            <ListRow
              key={String(e.event_id ?? e.id ?? i)}
              title={name}
              subtitle={e.turnstile?.display_name || e.turnstile?.acs_dev_name || undefined}
              left={<Avatar name={name} uri={e.visitor?.photo_path} size={34} />}
              right={
                <View style={styles.right}>
                  <Text variant="label" style={styles.time}>
                    {e.happen_time ? dayjs(e.happen_time).format('HH:mm') : '—'}
                  </Text>
                  <Badge label={entrance ? t('monitoring.entered') : t('monitoring.exited')} tone={entrance ? 'success' : 'warning'} />
                </View>
              }
            />
          );
        })
      )}
    </Card>
  );

  return (
    <Screen
      refreshing={main.isRefetching}
      onRefresh={() => void Promise.all([main.refetch(), late.refetch(), frequent.refetch(), guests.refetch()])}
    >
      {header}
      {tiles}
      <View style={styles.gap} />
      <Bento>
        {lateCard ? <Bento.Item>{lateCard}</Bento.Item> : null}
        <Bento.Item>{guestsCard}</Bento.Item>
        {frequentCard ? <Bento.Item>{frequentCard}</Bento.Item> : null}
      </Bento>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gap: { height: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontVariant: ['tabular-nums'] },
});
