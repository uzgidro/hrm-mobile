// «Tibbiy ko'rik» — the employee's own page: the planned day, the route sheet as a checklist,
// the final fitness once the head doctor signed, plus the three entries (my QR, scan a door,
// my results). Reachable for every employee (outside the clinic's `medical_enabled` gate).
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingView, PageHeader, Screen, Text } from '@/ui';
import { weekdayName } from '@/i18n/dates';
import { myVisitQuery } from '../api/queries';
import { RouteSheet } from '../components/RouteSheet';
import { fitnessTone, routeProgress, splitRoute, visitTone, type Visit } from '../utils/medicalExam';

const isNative = Platform.OS !== 'web';

export default function MedicalExamScreen() {
  const { t } = useTranslation();
  const q = useQuery(myVisitQuery());
  const visit = q.data ?? null;

  const header = <PageHeader title={t('medicalExam.title')} subtitle={t('medicalExam.subtitle')} />;

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

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="medical-exam-screen">
      {header}
      <View style={styles.stack}>
        {visit ? <VisitCard visit={visit} /> : (
          <Card>
            <EmptyState title={t('medicalExam.visit.noneTitle')} message={t('medicalExam.visit.noneBody')} />
          </Card>
        )}

        {!!visit?.stations?.length && <RouteCard visit={visit} />}

        <Card>
          <View style={styles.actions}>
            <Button
              testID="exam-open-qr"
              label={t('medicalExam.actions.myQr')}
              icon="qr"
              size="lg"
              full
              onPress={() => router.push('/medical-exam-qr')}
            />
            {isNative && (
              <Button
                testID="exam-open-scan"
                label={t('medicalExam.actions.scanDoor')}
                icon="camera"
                variant="soft"
                size="lg"
                full
                onPress={() => router.push('/medical-exam-scan')}
              />
            )}
            <Button
              testID="exam-open-results"
              label={t('medicalExam.actions.results')}
              icon="doc"
              variant="soft"
              size="lg"
              full
              onPress={() => router.push('/medical-exam-results')}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const { t } = useTranslation();
  const day = visit.planned_date ? dayjs(visit.planned_date.slice(0, 10)) : null;
  return (
    <Card title={visit.campaign_name || t('medicalExam.visit.title')} icon="calendar" tint="green" testID="visit-card">
      <View style={styles.inner}>
        {day?.isValid() && (
          <View>
            <Text variant="caption" tone="muted">
              {t('medicalExam.visit.plannedDay')}
            </Text>
            <Text variant="display" testID="visit-day">
              {day.format('DD.MM.YYYY')}
            </Text>
            <Text variant="body" tone="muted">
              {weekdayName(day.day())}
            </Text>
          </View>
        )}
        <Badge label={t(`medicalExam.visitStatus.${visit.status}`)} tone={visitTone(visit.status)} testID="visit-status" />
        {visit.walk_in && (
          <Text variant="caption" tone="muted">
            {t('medicalExam.visit.walkIn')}
          </Text>
        )}
        {visit.unfinished && (
          <View style={styles.notice} testID="visit-unfinished">
            <Text variant="label" tone="danger">
              {t('medicalExam.visit.unfinished')}
            </Text>
          </View>
        )}
        {!!visit.return_note && (
          <Text variant="body" tone="muted">
            {visit.return_note}
          </Text>
        )}
        {visit.status === 'finalized' && (
          <View style={styles.final} testID="visit-final">
            <Text variant="caption" tone="muted">
              {t('medicalExam.visit.finalTitle')}
            </Text>
            {!!visit.final_fitness && (
              <Badge label={t(`medicalExam.fitness.${visit.final_fitness}`)} tone={fitnessTone(visit.final_fitness)} />
            )}
            {!!visit.final_conclusion && <Text variant="body">{visit.final_conclusion}</Text>}
            {!!visit.finalized_by_name && (
              <Text variant="caption" tone="muted">
                {visit.finalized_by_name}
              </Text>
            )}
          </View>
        )}
      </View>
    </Card>
  );
}

function RouteCard({ visit }: { visit: Visit }) {
  const { t } = useTranslation();
  const { done, total } = routeProgress(visit);
  const { left } = splitRoute(visit.stations);
  return (
    <Card title={t('medicalExam.route.title')} icon="checklist" tint="violet">
      <View style={styles.inner}>
        <Text variant="body" tone="muted" testID="route-progress">
          {t('medicalExam.route.progress', { done, total })}
          {left.length > 0 ? ` · ${t('medicalExam.route.left', { count: left.length })}` : ''}
        </Text>
        <RouteSheet stations={visit.stations ?? []} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 24 },
  inner: { gap: 10 },
  actions: { gap: 10 },
  notice: { padding: 10, borderRadius: 12 },
  final: { gap: 6 },
});
