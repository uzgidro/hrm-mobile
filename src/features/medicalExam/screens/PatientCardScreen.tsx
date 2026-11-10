// The patient's card for the doctor: who, the route sheet with the doctor's own lines
// highlighted (+ Joyida / Tashqarida / Kelmagan), the history of every doctor's records and the
// form to write (or edit an own) record. After saving, the card is refetched (the server closes
// the doctor's station itself) and «Keyingi bemor» returns to the scanner.
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AccessDenied } from '@/components/AccessDenied';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, LoadingView, PageHeader, Screen, Text } from '@/ui';
import { useSetStationStatus } from '../api/mutations';
import { patientCardQuery } from '../api/queries';
import { CheckupCard } from '../components/CheckupCard';
import { RecordForm } from '../components/RecordForm';
import { RouteSheet } from '../components/RouteSheet';
import { StatusActions } from '../components/StatusActions';
import {
  ageFromBirthDate,
  canSetStationStatus,
  fitnessTone,
  genderKey,
  isDoctor,
  routeProgress,
  sortCheckups,
  type ExamCheckup,
  type ManualStationStatus,
  type Station,
} from '../utils/medicalExam';

const isNative = Platform.OS !== 'web';

export default function PatientCardScreen() {
  const { t } = useTranslation();
  const allowed = isDoctor(useAuthStore((s) => s.user));
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = Number(rawId) || 0;
  const q = useQuery({ ...patientCardQuery(id), enabled: allowed && id > 0 });
  const setStatus = useSetStationStatus();
  // null = closed, 'new' = a new record, otherwise the own record being edited.
  const [editing, setEditing] = useState<null | 'new' | ExamCheckup>(null);
  const [saved, setSaved] = useState(false);

  if (!allowed) return <AccessDenied title={t('medicalExam.card.title')} />;

  const header = <PageHeader title={t('medicalExam.card.title')} />;
  if (q.isPending) {
    return (
      <Screen scroll={false}>
        {header}
        <LoadingView />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen scroll={false}>
        {header}
        <ErrorState message={q.error ? getApiErrorMessage(q.error, t('errors.generic')) : undefined} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }

  const card = q.data;
  const p = card.employee;
  const age = ageFromBirthDate(p.birth_date);
  const sex = genderKey(p.gender);
  const visit = card.visit ?? null;
  const mine = card.my_station_ids ?? [];
  const history = sortCheckups(card.checkups);

  const onStatus = (stationId: number, status: ManualStationStatus) =>
    setStatus.mutate({ stationId, status }, { onError: (e) => toast.error(getApiErrorMessage(e, t('errors.generic'))) });

  const nextPatient = () => {
    if (isNative) router.replace('/doctor-scan');
    else router.back();
  };

  const actions = (s: Station) =>
    mine.includes(s.id) && canSetStationStatus(s) ? (
      <StatusActions stationId={s.id} current={s.status} disabled={setStatus.isPending} onSet={onStatus} />
    ) : null;

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="patient-card-screen">
      {header}
      <View style={styles.stack}>
        <Card testID="patient-header">
          <View style={styles.who}>
            <Avatar name={p.legal_name || '?'} thumb={p.photo_thumb_path} size={56} />
            <View style={styles.flex}>
              <Text variant="title" testID="patient-name">
                {p.legal_name}
              </Text>
              <Text variant="body" tone="muted">
                {[p.branch_name, p.department_name, p.job_position_name].filter(Boolean).join(' · ')}
              </Text>
              <Text variant="label" tone="muted" testID="patient-age-sex">
                {[age != null ? t('medicalExam.card.age', { count: age }) : null, sex ? t(`medicalExam.card.sex.${sex}`) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
          {visit?.final_fitness && (
            <View style={styles.final}>
              <Text variant="caption" tone="muted">
                {t('medicalExam.visit.finalTitle')}
              </Text>
              <Badge label={t(`medicalExam.fitness.${visit.final_fitness}`)} tone={fitnessTone(visit.final_fitness)} />
            </View>
          )}
        </Card>

        {saved && (
          <Card testID="saved-card">
            <View style={styles.inner}>
              <Text variant="heading" tone="success">
                {t('medicalExam.card.savedTitle')}
              </Text>
              <Button testID="next-patient" label={t('medicalExam.card.nextPatient')} icon="camera" full onPress={nextPatient} />
            </View>
          </Card>
        )}

        {!!visit?.stations?.length && (
          <Card title={t('medicalExam.route.title')} icon="checklist" tint="violet">
            <View style={styles.inner}>
              <Text variant="body" tone="muted">
                {t('medicalExam.route.progress', routeProgress(visit))}
              </Text>
              <RouteSheet stations={visit.stations} highlightIds={mine} renderActions={actions} />
            </View>
          </Card>
        )}

        {editing ? (
          <Card>
            <RecordForm
              employeeId={p.id}
              checkup={editing === 'new' ? null : editing}
              onDone={(didSave) => {
                if (didSave && editing === 'new') setSaved(true);
                setEditing(null);
              }}
            />
          </Card>
        ) : (
          card.can_add_checkup && (
            <Button testID="add-record" label={t('medicalExam.record.add')} icon="plus" size="lg" full onPress={() => { setSaved(false); setEditing('new'); }} />
          )
        )}

        <Card title={t('medicalExam.card.history')} icon="doc" tint="green">
          <View style={styles.inner}>
            {history.length === 0 ? (
              <EmptyState title={t('medicalExam.card.historyEmpty')} />
            ) : (
              history.map((c) => <CheckupCard key={c.id} checkup={c} onEdit={() => { setSaved(false); setEditing(c); }} />)
            )}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 24 },
  who: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1 },
  inner: { gap: 10 },
  final: { gap: 4, marginTop: 10, alignItems: 'flex-start' },
});
