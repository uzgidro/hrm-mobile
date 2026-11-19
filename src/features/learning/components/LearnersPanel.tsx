// TINGLOVCHILAR tab of the builder (web v2 `EnrolleesPanel` + `AssignModal`):
// who is on the course, how far, deadline, and assigning employees. Withdrawing
// an unfinished enrollment needs the new API (`DELETE /enrollments/{id}`).
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useEmployeeListPicker } from '@/lib/useInfinitePicker';
import { PickerModal } from '@/components/PickerModal';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { Badge, Button, Chip, EmptyState, ErrorState, IconButton, ListRow, ProgressBar, SearchField, SelectField, Sheet, Skeleton, Text } from '@/ui';
import type { Employee } from '@/types';
import { courseEnrollmentsQuery, type CourseDetail, type LearningEnrollment } from '../api/queries';
import { useAssign, useWithdrawEnrollment } from '../api/mutations';
import { KNOWN_STATUSES, STATUS_TONE, clampProgress, deadlineState, fmtDate, hasCurriculumApi } from '../utils/learning';
import { DateField } from './fields';

type Filter = 'all' | 'assigned' | 'in_progress' | 'completed' | 'overdue';

export function LearnersPanel({ course }: { course: CourseDetail }) {
  const { t } = useTranslation();
  const newApi = hasCurriculumApi(course);
  const q = useQuery(courseEnrollmentsQuery(course.id));
  const withdraw = useWithdrawEnrollment();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const rows = q.data ?? [];
  const match = (e: LearningEnrollment, f: Filter) =>
    f === 'all' ? true : f === 'overdue' ? deadlineState(e) === 'overdue' : e.status === f;
  const shown = rows.filter(
    (e) => match(e, filter) && (!search.trim() || (e.employee_name ?? '').toLowerCase().includes(search.trim().toLowerCase())),
  );

  const doWithdraw = async (e: LearningEnrollment) => {
    const ok = await confirm({
      title: t('learning.withdrawTitle'),
      message: e.employee_name ?? `#${e.employee_id}`,
      confirmLabel: t('learning.withdraw'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await withdraw.mutateAsync(e.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('errors.generic')));
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        <Text variant="label" tone="muted" style={styles.flex}>
          {`${t('learning.enrolledN')}: ${course.enrolled ?? rows.length} · ${t('learning.completedN')}: ${course.completed ?? rows.filter((r) => r.status === 'completed').length}`}
        </Text>
      </View>
      <Button
        testID="assign-open"
        label={t('learning.assign')}
        icon="users"
        onPress={() => setAssigning(true)}
        disabled={course.is_published === false}
        full
      />
      {course.is_published === false && (
        <Text variant="caption" tone="subtle">
          {t('learning.assignNeedsPublish')}
        </Text>
      )}
      <SearchField value={search} onChangeText={setSearch} placeholder={t('learning.searchLearner')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(['all', 'assigned', 'in_progress', 'completed', 'overdue'] as const).map((f) => (
          <Chip key={f} label={t(`learning.f_${f}`)} selected={filter === f} onPress={() => setFilter(f)} count={q.data ? rows.filter((r) => match(r, f)).length : undefined} testID={`roster-filter-${f}`} />
        ))}
      </ScrollView>
      {q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton height={160} />
      ) : shown.length === 0 ? (
        <EmptyState title={t('learning.noEnrollees')} />
      ) : (
        shown.map((e) => {
          const dl = deadlineState(e);
          return (
            <View key={e.id} style={styles.item}>
              <ListRow
                testID={`roster-${e.id}`}
                left={
                  <EmployeeAvatar
                    emp={{ legal_name: e.employee_name ?? '?', photo_path: e.employee_photo_path ?? null, photo_thumb_path: e.employee_photo_thumb_path ?? null }}
                    size={36}
                  />
                }
                title={e.employee_name ?? `#${e.employee_id}`}
                subtitle={[
                  `${clampProgress(e.progress)}%`,
                  e.score != null ? `${t('learning.score')}: ${e.score}` : null,
                  e.deadline ? `${t('learning.deadline')}: ${fmtDate(e.deadline)}` : null,
                  e.last_activity_at ? t('learning.lastActivity', { date: fmtDate(e.last_activity_at) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                below={
                  <Badge
                    label={
                      dl === 'overdue'
                        ? t('learning.f_overdue')
                        : (KNOWN_STATUSES as readonly string[]).includes(e.status)
                          ? t(`learning.status_${e.status}`)
                          : e.status_label || e.status
                    }
                    tone={dl === 'overdue' ? 'danger' : (STATUS_TONE[e.status] ?? 'neutral')}
                  />
                }
                right={
                  newApi && e.status !== 'completed' ? (
                    <IconButton icon="trash" accessibilityLabel={t('learning.withdrawTitle')} onPress={() => void doWithdraw(e)} testID={`roster-withdraw-${e.id}`} />
                  ) : undefined
                }
              />
              <ProgressBar value={clampProgress(e.progress) / 100} />
            </View>
          );
        })
      )}
      {assigning && <AssignSheet course={course} onClose={() => setAssigning(false)} />}
    </View>
  );
}

function AssignSheet({ course, onClose }: { course: CourseDetail; onClose: () => void }) {
  const { t } = useTranslation();
  const assign = useAssign();
  const [picking, setPicking] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [picked, setPicked] = useState<Pick<Employee, 'id' | 'legal_name'>[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const employees = useEmployeeListPicker({ key: 'learning-assign', search: empSearch, enabled: picking });

  const toggle = (id: number) => {
    setPicked((prev) => {
      if (prev.some((p) => p.id === id)) return prev.filter((p) => p.id !== id);
      const emp = employees.data?.find((e) => e.id === id);
      return emp ? [...prev, { id: emp.id, legal_name: emp.legal_name }] : prev;
    });
  };

  const submit = async () => {
    try {
      await assign.mutateAsync({ id: course.id, employee_ids: picked.map((p) => p.id), deadline });
      toast.success(t('learning.assigned'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.assignFailed')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={t('learning.assignTitle', { title: course.title })}>
      <View style={styles.sheet}>
        <SelectField
          label={t('learning.pickEmployees')}
          value={picked.length ? t('learning.pickedN', { count: picked.length }) : undefined}
          placeholder={t('learning.pickEmployeesHint')}
          icon="users"
          onPress={() => setPicking(true)}
          testID="assign-pick"
        />
        {picked.length > 0 && (
          <View style={styles.pickedWrap}>
            {picked.map((p) => (
              <Chip key={p.id} label={`${p.legal_name ?? `#${p.id}`} ×`} onPress={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))} testID={`assign-picked-${p.id}`} />
            ))}
          </View>
        )}
        <DateField label={t('learning.deadline')} value={deadline} onChange={setDeadline} testID="assign-deadline" />
        <Text variant="caption" tone="subtle">
          {t('learning.deadlineHint')}
        </Text>
        <Button
          testID="assign-submit"
          label={t('learning.assignN', { count: picked.length })}
          icon="users"
          loading={assign.isPending}
          disabled={picked.length === 0}
          onPress={() => void submit()}
          full
        />
      </View>
      <PickerModal
        visible={picking}
        title={t('learning.pickEmployees')}
        multiple
        options={(employees.data ?? []).map((e) => ({
          value: e.id,
          label: e.legal_name,
          subLabel: e.job_position?.name,
          photo: e.photo_path,
          photoThumb: e.photo_thumb_path,
        }))}
        loading={employees.isFetching}
        loadingMore={employees.loadingMore}
        onEndReached={employees.onEndReached}
        selected={picked.map((p) => p.id)}
        onToggle={toggle}
        onSelect={toggle}
        onSearchChange={setEmpSearch}
        onClose={() => setPicking(false)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  flex: { flex: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { gap: 8 },
  item: { gap: 6, paddingBottom: 8 },
  sheet: { gap: 10, paddingBottom: 8 },
  pickedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
