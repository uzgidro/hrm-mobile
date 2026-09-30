// «Ijro intizomi»: muddati o'tgan topshiriqlar jami va bo'limlar kesimida (v2 useOverdueSummary).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { Card, ErrorState, ListRow, Skeleton, Text } from '@/ui';
import { overdueSummaryQuery } from '../../api/queries';

export function DisciplineCard({ branchId }: { branchId: number | undefined }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const q = useQuery(overdueSummaryQuery(branchId));
  const pink = moduleTint(c, 'pink');
  const rows = (q.data?.by_department ?? []).slice().sort((a, b) => b.count - a.count).slice(0, 5);
  return (
    <Card title={t('dashboard.home.discipline')} icon="checklist" tint="pink" testID="card-discipline">
      {q.isPending ? (
        <Skeleton height={100} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <>
          <View style={[styles.total, { backgroundColor: pink.wash }]}>
            <Text variant="number">{String(q.data?.total ?? 0)}</Text>
            <Text variant="label" tone="muted" style={styles.flex}>
              {(q.data?.total ?? 0) > 0 ? t('dashboard.home.overdue') : t('dashboard.home.overdueNone')}
            </Text>
          </View>
          {rows.map((r) => (
            <ListRow
              key={r.department_name}
              title={r.department_name}
              right={
                <Text variant="label" style={styles.count}>
                  {String(r.count)}
                </Text>
              }
            />
          ))}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  total: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, padding: 12, marginBottom: 4 },
  flex: { flex: 1 },
  count: { fontWeight: '800', fontVariant: ['tabular-nums'] },
});
