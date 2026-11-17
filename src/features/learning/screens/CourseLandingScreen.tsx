// KURS SAHIFASI (web v2 `CourseLandingPage`): cover, what you'll learn, the
// curriculum by sections and ONE call to action — enroll / start / continue /
// review — plus «Konstruktor» for a manager. The old learning API has no
// `my_enrollment` on the course, so the caller's own enrollment is then looked
// up in «Mening kurslarim».
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Badge, Button, Card, ErrorState, LoadingView, PageHeader, ProgressBar, Screen, Text } from '@/ui';
import { courseQuery, learningMetaQuery, myEnrollmentsQuery, type CourseDetail } from '../api/queries';
import { useEnroll } from '../api/mutations';
import { CurriculumList } from '../components/CurriculumList';
import { clampProgress, fmtDate, isSafeLink, splitMinutes } from '../utils/learning';

export default function CourseLandingScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id ?? 0);
  const q = useQuery(courseQuery(id));
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="course-landing">
      <PageHeader title={q.data?.title ?? t('learning.title')} />
      {q.data ? (
        <Landing course={q.data} />
      ) : q.isError || id <= 0 ? (
        <ErrorState title={t('learning.courseNotFound')} onRetry={id > 0 ? () => void q.refetch() : undefined} />
      ) : (
        <LoadingView rows={3} />
      )}
    </Screen>
  );
}

function Fact({ icon, label }: { icon: IconName; label: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={14} color={c.fgMuted} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Landing({ course }: { course: CourseDetail }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const meta = useQuery(learningMetaQuery());
  const my = useQuery(myEnrollmentsQuery());
  const enroll = useEnroll();
  const mine = course.my_enrollment !== undefined ? course.my_enrollment : (my.data ?? []).find((e) => e.course_id === course.id) ?? null;
  // `can_manage` is per course on the new API; the old one only has the global flag.
  const canManage = course.can_manage ?? !!meta.data?.isManager;
  const lessonCount = course.lesson_count ?? course.lessons?.length ?? 0;
  const totalMinutes = course.total_minutes ?? (course.lessons ?? []).reduce((a, l) => a + (l.duration_minutes ?? 0), 0);
  const { h, m } = splitMinutes(totalMinutes);
  const typeLabel = meta.data?.trainingTypes.find((x) => x.value === course.training_type)?.label;
  const outcomes = (course.outcomes ?? []).filter((x) => x?.trim());
  const pct = clampProgress(mine?.progress);

  const doEnroll = async () => {
    try {
      const e = await enroll.mutateAsync(course.id);
      toast.success(t('learning.enrolled'));
      if (e?.id) router.push({ pathname: '/kurs-player', params: { id: String(e.id) } });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('learning.enrollFailed')));
    }
  };

  return (
    <View style={styles.stack}>
      <Card padded={false} style={styles.hero}>
        {isSafeLink(course.cover_url) ? (
          <Image source={{ uri: course.cover_url }} style={styles.cover} contentFit="cover" testID="course-cover" />
        ) : (
          <View style={[styles.cover, styles.coverEmpty, { backgroundColor: c.brandDeep }]}>
            <Icon name="graduation" size={44} color={c.fgOnBrand} />
          </View>
        )}
        <View style={styles.heroBody}>
          <View style={styles.badges}>
            {!!typeLabel && <Badge label={typeLabel} tone="brand" />}
            {course.is_published === false && <Badge label={t('learning.draft')} tone="warning" />}
            {(course.question_count ?? 0) > 0 && <Badge label={t('learning.withCertificate')} tone="success" />}
          </View>
          <Text variant="title">{course.title}</Text>
          <Text variant="caption" tone="muted">
            {course.provider || t('learning.internalCourse')}
          </Text>
          <View style={styles.facts}>
            <Fact icon="doc" label={t('learning.lessonsN', { count: lessonCount })} />
            {totalMinutes > 0 && <Fact icon="clock" label={h ? t('learning.hoursMinutes', { h, m }) : t('learning.minutes', { count: m })} />}
            {course.hours != null && <Fact icon="graduation" label={t('learning.academicHours', { count: course.hours })} />}
            <Fact icon="users" label={t('learning.learnersN', { count: course.enrolled ?? 0 })} />
          </View>

          {mine && (
            <View style={styles.progress}>
              <View style={styles.row}>
                <Text variant="label" tone="muted" style={styles.flex}>
                  {t('learning.yourProgress')}
                </Text>
                <Text variant="label" weight="700">{`${pct}%`}</Text>
              </View>
              <ProgressBar value={pct / 100} />
              {!!mine.deadline && (
                <Text variant="caption" tone="subtle">{`${t('learning.deadline')}: ${fmtDate(mine.deadline)}`}</Text>
              )}
            </View>
          )}

          {mine ? (
            <Button
              testID="landing-cta"
              label={mine.status === 'completed' ? t('learning.review') : mine.progress ? t('learning.continue') : t('learning.start')}
              icon="chevronRight"
              size="lg"
              full
              onPress={() => router.push({ pathname: '/kurs-player', params: { id: String(mine.id) } })}
            />
          ) : course.is_published === false ? null : course.is_open_enrollment ? (
            <Button
              testID="landing-enroll"
              label={t('learning.enrollFree')}
              icon="graduation"
              size="lg"
              full
              loading={enroll.isPending}
              onPress={() => void doEnroll()}
            />
          ) : (
            <View style={styles.row}>
              <Icon name="lock" size={14} color={c.fgMuted} />
              <Text variant="label" tone="muted">
                {t('learning.byAssignment')}
              </Text>
            </View>
          )}
          {canManage && (
            <Button
              testID="landing-builder"
              label={t('learning.openBuilder')}
              icon="edit"
              variant="soft"
              full
              onPress={() => router.push({ pathname: '/kurs-tahrir', params: { id: String(course.id) } })}
            />
          )}
        </View>
      </Card>

      {!!course.description?.trim() && (
        <Card>
          <Text variant="body">{course.description}</Text>
        </Card>
      )}

      {outcomes.length > 0 && (
        <Card title={t('learning.whatYouLearn')} icon="target" tint="green">
          <View style={styles.list}>
            {outcomes.map((o, i) => (
              <View key={`${i}-${o}`} style={styles.outcome}>
                <Icon name="check" size={16} color={c.success} />
                <Text variant="body" style={styles.flex}>
                  {o}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card title={t('learning.courseContent')} icon="checklist" tint="violet">
        <Text variant="caption" tone="subtle" style={styles.contentMeta}>
          {[course.sections?.length ? t('learning.sectionsN', { count: course.sections.length }) : null, t('learning.lessonsN', { count: lessonCount })]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {(course.lessons ?? []).length === 0 ? (
          <Text variant="body" tone="muted">
            {t('learning.noLessons')}
          </Text>
        ) : (
          <CurriculumList sections={course.sections} lessons={course.lessons} collapsible />
        )}
      </Card>

      <Card title={t('learning.howItWorks')} icon="help" tint="drop">
        <View style={styles.list}>
          {[
            t('learning.how1'),
            t('learning.how2'),
            (course.question_count ?? 0) > 0 ? t('learning.how3Test', { score: course.pass_score ?? 0 }) : t('learning.how3NoTest'),
            t('learning.how4'),
          ].map((s, i) => (
            <View key={s} style={styles.outcome}>
              <View style={[styles.step, { backgroundColor: c.brandSoft }]}>
                <Text variant="caption" weight="700" tone="brand">
                  {String(i + 1)}
                </Text>
              </View>
              <Text variant="body" style={styles.flex}>
                {s}
              </Text>
            </View>
          ))}
          {course.certificate_validity_months != null && (
            <Text variant="caption" tone="subtle">
              {t('learning.certValidMonths', { count: course.certificate_validity_months })}
            </Text>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  hero: { overflow: 'hidden' },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  heroBody: { padding: 16, gap: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progress: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: 10 },
  outcome: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  step: { width: 24, height: 24, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  contentMeta: { marginBottom: 8 },
});
