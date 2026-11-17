// KURS KONSTRUKTORI (web v2 `CourseBuilderPage`) on the phone: a header with
// the publish checklist, then four tabs — curriculum, course page, final test
// and learners. Access follows the server: `can_manage` on the course (new
// API) or the global manager flag from `/learning/meta` (old API, which has no
// per-course flag; the server still enforces the scope on every write).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, ErrorState, IconButton, LoadingView, PageHeader, Screen, Segmented, Text } from '@/ui';
import { courseQuery, learningMetaQuery, type CourseDetail } from '../api/queries';
import { useUpdateCourse } from '../api/mutations';
import { CourseDetailsForm } from '../components/CourseDetailsForm';
import { CurriculumBuilder } from '../components/CurriculumBuilder';
import { LearnersPanel } from '../components/LearnersPanel';
import { QuestionList } from '../components/QuestionList';
import { hasCurriculumApi, splitMinutes } from '../utils/learning';

type Tab = 'curriculum' | 'details' | 'test' | 'learners';

export default function CourseBuilderScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; tab?: string }>();
  const id = Number(params.id ?? 0);
  const q = useQuery(courseQuery(id));
  const meta = useQuery(learningMetaQuery());
  const course = q.data;
  const canManage = course ? (course.can_manage ?? !!meta.data?.isManager) : false;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="course-builder">
      <PageHeader
        title={course?.title ?? t('learning.builderKicker')}
        subtitle={course ? t('learning.builderKicker') : undefined}
        right={
          course ? (
            <IconButton
              icon="eye"
              tone="soft"
              accessibilityLabel={t('learning.preview')}
              onPress={() => router.push({ pathname: '/kurs-detail', params: { id: String(course.id) } })}
              testID="builder-preview"
            />
          ) : undefined
        }
      />
      {course && canManage ? (
        <Builder course={course} initialTab={params.tab} />
      ) : q.isError || id <= 0 || (course && !meta.isPending && !canManage) ? (
        <ErrorState title={t('learning.courseNotFound')} onRetry={id > 0 ? () => void q.refetch() : undefined} />
      ) : (
        <LoadingView rows={3} />
      )}
    </Screen>
  );
}

function Builder({ course, initialTab }: { course: CourseDetail; initialTab?: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>(
    initialTab === 'details' || initialTab === 'test' || initialTab === 'learners' ? initialTab : 'curriculum',
  );
  const { h, m } = splitMinutes(course.total_minutes);
  const newApi = hasCurriculumApi(course);
  return (
    <View style={styles.stack}>
      <View style={styles.meta}>
        <Badge label={course.is_published ? t('learning.published') : t('learning.draft')} tone={course.is_published ? 'success' : 'warning'} testID="builder-status" />
        <Text variant="caption" tone="muted">
          {[
            newApi ? t('learning.sectionsN', { count: course.sections?.length ?? 0 }) : null,
            t('learning.lessonsN', { count: course.lessons?.length ?? course.lesson_count ?? 0 }),
            (course.total_minutes ?? 0) > 0 ? (h ? t('learning.hoursMinutes', { h, m }) : t('learning.minutes', { count: m })) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <PublishCard course={course} onGoTo={setTab} />
      <Segmented<Tab>
        testID="builder-tabs"
        options={[
          { value: 'curriculum', label: t('learning.tabCurriculum'), count: course.lessons?.length ?? course.lesson_count ?? 0 },
          { value: 'details', label: t('learning.tabDetails') },
          { value: 'test', label: t('learning.tabFinalTest'), count: course.question_count ?? 0 },
          { value: 'learners', label: t('learning.tabLearners'), count: course.enrolled ?? 0 },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'curriculum' ? (
        <CurriculumBuilder course={course} />
      ) : tab === 'details' ? (
        <CourseDetailsForm key={course.id} course={course} />
      ) : tab === 'test' ? (
        <Card>
          <QuestionList courseId={course.id} lessonId={null} hint={t('learning.finalTestHint', { score: course.pass_score ?? 0 })} canEdit={newApi} />
        </Card>
      ) : (
        <Card>
          <LearnersPanel course={course} />
        </Card>
      )}
    </View>
  );
}

const CHECK_TAB: Record<string, Tab> = {
  title: 'details',
  description: 'details',
  cover: 'details',
  lessons: 'curriculum',
  lesson_content: 'curriculum',
  final_test: 'test',
};

/** Publish toggle + (new API) the checklist that says what is still missing. */
function PublishCard({ course, onGoTo }: { course: CourseDetail; onGoTo: (tab: Tab) => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const update = useUpdateCourse();
  const readiness = course.readiness ?? [];
  const blocked = readiness.some((r) => r.blocking && !r.ok);
  const done = readiness.filter((r) => r.ok).length;

  const toggle = async () => {
    const publish = !course.is_published;
    if (!publish) {
      const ok = await confirm({
        title: t('learning.unpublish'),
        message: course.title,
        confirmLabel: t('learning.unpublish'),
        cancelLabel: t('common.cancel'),
      });
      if (!ok) return;
    }
    try {
      await update.mutateAsync({ id: course.id, body: { is_published: publish } });
      toast.success(publish ? t('learning.publishedToast') : t('learning.unpublishedToast'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };

  return (
    <Card>
      {readiness.length > 0 && (
        <View style={styles.checklist} testID="publish-checklist">
          <View style={styles.row}>
            <Text variant="label" weight="700" style={styles.flex}>
              {t('learning.checklistTitle')}
            </Text>
            <Text variant="caption" tone="muted">{`${done}/${readiness.length}`}</Text>
          </View>
          {readiness.map((r) => (
            <View key={r.key} style={styles.row} testID={`check-${r.key}`}>
              <Icon name={r.ok ? 'check' : r.blocking ? 'close' : 'help'} size={16} color={r.ok ? c.success : r.blocking ? c.danger : c.fgMuted} />
              <View style={styles.flex}>
                <Text variant="label">{t(`learning.check_${r.key}`, { defaultValue: r.key })}</Text>
                <Text variant="caption" tone="subtle">
                  {[
                    r.blocking ? t('learning.checkRequired') : t('learning.checkRecommended'),
                    r.key === 'lesson_content' && r.lesson_ids?.length ? t('learning.lessonsN', { count: r.lesson_ids.length }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {!r.ok && CHECK_TAB[r.key] && (
                <Button label={t('learning.fix')} variant="link" size="sm" onPress={() => onGoTo(CHECK_TAB[r.key]!)} />
              )}
            </View>
          ))}
        </View>
      )}
      <Button
        testID="builder-publish"
        label={course.is_published ? t('learning.unpublish') : t('learning.publish')}
        icon={course.is_published ? 'eyeOff' : 'check'}
        variant={course.is_published ? 'soft' : 'primary'}
        loading={update.isPending}
        disabled={!course.is_published && blocked}
        onPress={() => void toggle()}
        full
      />
      {!course.is_published && blocked && (
        <Text variant="caption" tone="subtle" style={styles.blocked}>
          {t('learning.publishBlocked')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  checklist: { gap: 8, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blocked: { marginTop: 6, textAlign: 'center' },
});
