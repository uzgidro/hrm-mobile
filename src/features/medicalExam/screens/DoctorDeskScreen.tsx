// «Shifokor qabuli» — the staff doctor's start page: scan a patient, find one by name
// (a patient may have no phone and no printed code) and the doctor's own queue.
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AccessDenied } from '@/components/AccessDenied';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useAuthStore } from '@/store/authStore';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, ListRow, LoadingView, PageHeader, Screen, SearchField, Text } from '@/ui';
import { useSetStationStatus } from '../api/mutations';
import { myPatientsQuery, PATIENT_SEARCH_MIN, patientSearchQuery, queueQuery } from '../api/queries';
import { StatusActions } from '../components/StatusActions';
import { fmtDate, isDoctor, isExternalDoctor, stationTone, todayIso, type ManualStationStatus } from '../utils/medicalExam';

const isNative = Platform.OS !== 'web';

export const openPatient = (id: number) => router.push({ pathname: '/doctor-patient', params: { id: String(id) } });

export default function DoctorDeskScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = isDoctor(user);
  // An invited doctor has no tab bar: this is their home, so it carries the way out.
  const external = isExternalDoctor(user);
  const logout = useAuthStore((s) => s.logout);
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const search = useQuery({ ...patientSearchQuery(debounced), enabled: allowed && debounced.trim().length >= PATIENT_SEARCH_MIN });
  const queue = useQuery(queueQuery(allowed));
  // «Mening bemorlarim»: whom this doctor has received — today by default.
  const [allPatients, setAllPatients] = useState(false);
  const patients = useQuery(myPatientsQuery(allPatients ? null : todayIso(), allowed));
  const setStatus = useSetStationStatus();

  if (!allowed) return <AccessDenied title={t('medicalExam.desk.title')} />;

  const onStatus = (stationId: number, status: ManualStationStatus) =>
    setStatus.mutate({ stationId, status }, { onError: (e) => toast.error(getApiErrorMessage(e, t('errors.generic'))) });

  const items = queue.data?.items ?? [];
  const searching = term.trim().length >= PATIENT_SEARCH_MIN;

  return (
    <Screen
      refreshing={queue.isRefetching}
      onRefresh={() => {
        void queue.refetch();
        void patients.refetch();
        if (searching) void search.refetch();
      }}
      testID="doctor-desk-screen"
    >
      <PageHeader
        title={t('medicalExam.desk.title')}
        subtitle={external ? user?.external_doctor?.workplace || t('medicalExam.desk.externalSubtitle') : t('medicalExam.desk.subtitle')}
        right={external ? <Button testID="desk-logout" label={t('medicalExam.desk.logout')} variant="ghost" size="sm" icon="logout" onPress={() => void logout()} /> : undefined}
      />
      <View style={styles.stack}>
        {isNative && (
          <Button
            testID="desk-scan"
            label={t('medicalExam.desk.scan')}
            icon="camera"
            size="lg"
            full
            onPress={() => router.push('/doctor-scan')}
          />
        )}

        <Card title={t('medicalExam.desk.searchTitle')} icon="search" tint="drop">
          <View style={styles.inner}>
            <SearchField
              testID="desk-search"
              value={term}
              onChangeText={setTerm}
              placeholder={t('medicalExam.desk.searchPlaceholder')}
            />
            {searching && search.isPending && <LoadingView rows={2} />}
            {searching && search.isError && <ErrorState onRetry={() => void search.refetch()} />}
            {searching && search.data?.length === 0 && (
              <Text variant="body" tone="muted" testID="desk-search-empty">
                {t('medicalExam.desk.searchEmpty')}
              </Text>
            )}
            {searching &&
              search.data?.map((p) => (
                <ListRow
                  key={p.id}
                  testID={`patient-${p.id}`}
                  title={p.legal_name || `#${p.id}`}
                  subtitle={[p.branch_name, p.department_name, p.job_position_name].filter(Boolean).join(' · ')}
                  left={<Avatar name={p.legal_name || '?'} thumb={p.photo_thumb_path} size={40} />}
                  chevron
                  onPress={() => openPatient(p.id)}
                />
              ))}
          </View>
        </Card>

        <Card title={t('medicalExam.desk.queueTitle')} icon="users" tint="green">
          <View style={styles.inner}>
            {queue.isPending && <LoadingView rows={2} />}
            {queue.isError && <ErrorState onRetry={() => void queue.refetch()} />}
            {queue.data && !queue.data.campaign && (
              <Text variant="body" tone="muted" testID="queue-no-campaign">
                {t('medicalExam.desk.noCampaign')}
              </Text>
            )}
            {queue.data && queue.data.campaign && items.length === 0 && (
              <EmptyState title={t('medicalExam.desk.queueEmpty')} message={t('medicalExam.desk.queueEmptyHint')} />
            )}
            {items.map((it) => (
              <View key={it.station_id} style={styles.queueItem} testID={`queue-${it.station_id}`}>
                <ListRow
                  title={it.employee.legal_name || `#${it.employee.id}`}
                  subtitle={[it.specialty_name, t('medicalExam.route.progress', { done: it.stations_done ?? 0, total: it.stations_total ?? 0 })]
                    .filter(Boolean)
                    .join(' · ')}
                  left={<Avatar name={it.employee.legal_name || '?'} thumb={it.employee.photo_thumb_path} size={40} />}
                  right={<Badge label={t(`medicalExam.station.${it.status}`)} tone={stationTone(it.status)} />}
                  below={
                    it.returned ? (
                      <Text variant="caption" tone="danger">
                        {it.return_note ? `${t('medicalExam.route.returned')}: ${it.return_note}` : t('medicalExam.route.returned')}
                      </Text>
                    ) : undefined
                  }
                  onPress={() => openPatient(it.employee.id)}
                  chevron
                />
                <StatusActions
                  stationId={it.station_id}
                  current={it.status}
                  disabled={setStatus.isPending}
                  onSet={onStatus}
                />
              </View>
            ))}
          </View>
        </Card>

        <Card title={t('medicalExam.desk.patientsTitle')} icon="check" tint="drop">
          <View style={styles.inner}>
            <View style={styles.switchRow}>
              <Button
                testID="patients-today"
                label={t('medicalExam.desk.patientsToday', { count: patients.data?.today ?? 0 })}
                variant={allPatients ? 'ghost' : 'soft'}
                size="sm"
                onPress={() => setAllPatients(false)}
              />
              <Button
                testID="patients-all"
                label={t('medicalExam.desk.patientsAll')}
                variant={allPatients ? 'soft' : 'ghost'}
                size="sm"
                onPress={() => setAllPatients(true)}
              />
            </View>
            {patients.isPending && <LoadingView rows={2} />}
            {patients.isError && <ErrorState onRetry={() => void patients.refetch()} />}
            {patients.data && patients.data.items.length === 0 && (
              <Text variant="body" tone="muted" testID="patients-empty">
                {allPatients ? t('medicalExam.desk.patientsEmptyAll') : t('medicalExam.desk.patientsEmptyToday')}
              </Text>
            )}
            {patients.data?.items.map((p) => (
              <ListRow
                key={p.id}
                testID={`my-patient-${p.id}`}
                title={p.legal_name || `#${p.id}`}
                subtitle={[
                  p.last_checkup_date ? fmtDate(p.last_checkup_date) : null,
                  p.branch_name,
                  t('medicalExam.desk.patientRecords', { count: p.record_count ?? 0 }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                left={<Avatar name={p.legal_name || '?'} thumb={p.photo_thumb_path} size={40} />}
                chevron
                onPress={() => openPatient(p.id)}
              />
            ))}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 24 },
  inner: { gap: 10 },
  queueItem: { gap: 8, paddingBottom: 8 },
  switchRow: { flexDirection: 'row', gap: 8 },
});
