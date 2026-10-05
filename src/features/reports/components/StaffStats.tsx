// «Kadrlar tarkibi» (web v2 `StaffReport`): olti yig'ma ko'rsatkich (jami xodimlar, o'rtacha
// KPI, bajarilgan vazifalar, bugun kelmagan / kechikkan, KPI 50% dan past) va bo'lim / lavozim
// bo'yicha taqsimot (eng kattasidan 8 tasi). Ro'yxat eksporti va yosh/millat/KPI dinamikasi
// diagrammalari — web (mobil'da bosh sahifa panellari bor).
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useBreakpoint } from '@/utils/responsive';
import { Card, EmptyState, Skeleton, StatTile, Text } from '@/ui';
import {
  cardsSummaryQuery,
  dashboardMainQuery,
  deptCountQuery,
  kpiMonthlyQuery,
  posStatsQuery,
  taskExecutionQuery,
} from '../api/queries';
import { kpiRange, lastKpi, topDistribution } from '../utils/stats';
import { BarList } from './BarList';

export function StaffStats() {
  const { t } = useTranslation();
  const { sizeClass } = useBreakpoint();
  // Oyna sanasi bugundan — kalitda (yarim tundan keyin eski oyna qolmasin).
  const range = kpiRange();
  const main = useQuery(dashboardMainQuery());
  const kpi = useQuery(kpiMonthlyQuery());
  const cards = useQuery(cardsSummaryQuery(range));
  const tasks = useQuery(taskExecutionQuery(range));
  const depts = useQuery(deptCountQuery());
  const pos = useQuery(posStatsQuery());

  const deptData = useMemo(
    () => topDistribution((depts.data ?? []).map((d) => ({ name: d.department_name, value: d.total_count }))),
    [depts.data],
  );
  const posData = useMemo(
    () => topDistribution((pos.data ?? []).map((p) => ({ name: p.job_position_name, value: p.count }))),
    [pos.data],
  );

  // Kelguncha yoki xatoda «—»: «0» yolg'on bo'lardi.
  const v = (missing: boolean, n: number | undefined, suffix = '') => (missing ? '—' : `${n ?? 0}${suffix}`);
  const tiles = [
    {
      key: 'total',
      label: t('reports.totalEmployees'),
      value: v(!main.isSuccess, main.data?.total_employees_count),
      icon: 'users',
      tint: 'violet',
    },
    {
      key: 'kpi',
      label: t('reports.avgKpi'),
      value: v(!kpi.isSuccess, lastKpi(kpi.data), '%'),
      icon: 'chart',
      tint: 'green',
    },
    {
      key: 'done',
      label: t('reports.tasksDone'),
      value: v(!cards.isSuccess, cards.data?.completed_tasks_count),
      icon: 'checklist',
      tint: 'cyan',
    },
    {
      key: 'absent',
      label: t('reports.absentToday'),
      value: v(!tasks.isSuccess, tasks.data?.absent_employee_count),
      icon: 'user',
      tint: 'pink',
    },
    {
      key: 'late',
      label: t('reports.lateToday'),
      value: v(!tasks.isSuccess, tasks.data?.late_employee_count),
      icon: 'clock',
      tint: 'amber',
    },
    {
      key: 'low',
      label: t('reports.kpiLow'),
      value: v(!tasks.isSuccess, tasks.data?.kpi_below_50_employee_count),
      icon: 'target',
      tint: 'orange',
    },
  ] as const;
  const basis = sizeClass === 'compact' ? '47%' : sizeClass === 'medium' ? '31%' : '15%';

  const dist = (
    title: string,
    loading: boolean,
    data: { name: string; value: number }[],
    color: 'brand' | 'drop',
    id: string,
  ) => (
    <View style={sizeClass === 'compact' ? undefined : styles.halfCard}>
      <Card title={title} icon="chart" tint="violet">
        {loading ? (
          <Skeleton height={200} />
        ) : data.length === 0 ? (
          <EmptyState title={t('reports.noData')} />
        ) : (
          <BarList data={data} color={color} testID={id} />
        )}
      </Card>
    </View>
  );

  return (
    <View style={styles.root}>
      <Text variant="caption" tone="muted">
        {t('reports.staffHint')}
      </Text>
      <View style={styles.tiles}>
        {tiles.map((x) => (
          <View key={x.key} style={{ flexBasis: basis, flexGrow: 1 }}>
            <StatTile testID={`staff-tile-${x.key}`} label={x.label} value={x.value} icon={x.icon} tint={x.tint} />
          </View>
        ))}
      </View>
      <View style={sizeClass === 'compact' ? styles.stack : styles.row}>
        {dist(t('reports.byDepartment'), depts.isPending, deptData, 'brand', 'staff-by-dept')}
        {dist(t('reports.byPosition'), pos.isPending, posData, 'drop', 'staff-by-pos')}
      </View>
      <Text variant="caption" tone="subtle">
        {t('reports.staffWebOnly')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stack: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, minWidth: 0 },
});
