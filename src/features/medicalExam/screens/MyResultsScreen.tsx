// «Natijalarim» — the employee's own records grouped by year (read-only) and the yearly index.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Card, EmptyState, ErrorState, LoadingView, PageHeader, Screen, Text } from '@/ui';
import { myResultsQuery } from '../api/queries';
import { CheckupCard } from '../components/CheckupCard';
import { groupCheckupsByYear } from '../utils/medicalExam';

export default function MyResultsScreen() {
  const { t } = useTranslation();
  const q = useQuery(myResultsQuery());
  const header = <PageHeader title={t('medicalExam.results.title')} subtitle={t('medicalExam.results.subtitle')} />;

  if (q.isPending) {
    return (
      <Screen scroll={false}>
        {header}
        <LoadingView />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen scroll={false}>
        {header}
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  }

  const groups = groupCheckupsByYear(q.data?.checkups, q.data?.annual_indexes);
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="my-results-screen">
      {header}
      {groups.length === 0 ? (
        <Card>
          <EmptyState title={t('medicalExam.results.emptyTitle')} message={t('medicalExam.results.emptyBody')} />
        </Card>
      ) : (
        <View style={styles.stack}>
          {groups.map((g) => (
            <Card key={String(g.year)} title={g.year != null ? String(g.year) : t('medicalExam.results.noYear')} icon="doc" tint="green" testID={`year-${g.year}`}>
              <View style={styles.inner}>
                {g.index?.health_index && (
                  <View style={styles.index} testID={`year-${g.year}-index`}>
                    <Text variant="caption" tone="muted">
                      {t('medicalExam.results.yearIndex')}
                    </Text>
                    <Badge
                      label={t(`medicalExam.healthIndex.${g.index.health_index}`, { defaultValue: g.index.health_index })}
                      tone={g.index.health_index === 'excellent' ? 'success' : g.index.health_index === 'poor' ? 'danger' : 'info'}
                    />
                    {!!g.index.index_note && (
                      <Text variant="caption" tone="muted">
                        {g.index.index_note}
                      </Text>
                    )}
                  </View>
                )}
                {g.checkups.map((c) => (
                  <CheckupCard key={c.id} checkup={c} />
                ))}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 24 },
  inner: { gap: 10 },
  index: { gap: 4, alignItems: 'flex-start' },
});
