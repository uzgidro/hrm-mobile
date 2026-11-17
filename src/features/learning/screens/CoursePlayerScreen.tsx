// KURS PLEYERI (web v2 `CoursePlayerPage`): one lesson at a time with an
// obvious «complete and continue» action, the curriculum in a sheet, the
// final test once every lesson is done and the certificate at the end.
// Opens where the learner left off (`?lesson=` → resume point → first
// unfinished lesson). On the old learning API (no `sections`) the lessons are
// a flat list and the resume ping is not sent.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, LoadingView, PageHeader, ProgressBar, Screen, Sheet, Text } from '@/ui';
import { enrollmentQuery, finalTestQuery, type EnrollmentDetail, type LearningLesson, type QuizResult } from '../api/queries';
import { useCompleteLesson, useSubmitQuiz, useSubmitTest, useViewLesson } from '../api/mutations';
import { CertificateCard } from '../components/CertificateCard';
import { CurriculumList } from '../components/CurriculumList';
import { LessonMaterial, lessonIcon } from '../components/LessonMaterial';
import { QuizRunner } from '../components/QuizRunner';
import { clampProgress, flatCurriculum, fmtDate, hasCurriculumApi, initialPlayerView, type PlayerView } from '../utils/learning';

export default function CoursePlayerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; lesson?: string }>();
  const id = Number(params.id ?? 0);
  const q = useQuery(enrollmentQuery(id));
  if (!q.data) {
    return (
      <Screen>
        <PageHeader title={t('learning.player')} />
        {q.isError || id <= 0 ? (
          <ErrorState title={t('learning.courseNotFound')} onRetry={id > 0 ? () => void q.refetch() : undefined} />
        ) : (
          <LoadingView rows={3} />
        )}
      </Screen>
    );
  }
  return <Player e={q.data} requested={params.lesson ?? null} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />;
}

function Player({
  e: fetched,
  requested,
  refreshing,
  onRefresh,
}: {
  e: EnrollmentDetail;
  requested: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  // What the last completion / test answer said (status, certificate) — shown at once,
  // without waiting for the enrollment refetch.
  const [patch, setPatch] = useState<Partial<EnrollmentDetail>>({});
  const e = useMemo(() => ({ ...fetched, ...patch }), [fetched, patch]);
  const lessons = useMemo(() => flatCurriculum(e.sections, e.lessons), [e.sections, e.lessons]);
  const done = useMemo(() => new Set(e.completed_lesson_ids ?? []), [e.completed_lesson_ids]);
  const allDone = lessons.length > 0 && lessons.every((l) => done.has(l.id));
  const [view, setView] = useState<PlayerView | null>(() => initialPlayerView(e, lessons, requested));
  const [menu, setMenu] = useState(false);
  const viewPing = useViewLesson();
  const viewed = useRef<number | null>(null);
  const newApi = hasCurriculumApi(e);

  // A lesson deleted under us (refetch) — fall back to the computed start.
  const current = typeof view === 'number' ? lessons.find((l) => l.id === view) ?? null : null;
  const effective: PlayerView | null =
    typeof view === 'number' && !current ? initialPlayerView(e, lessons, null) : view;

  // Record the resume point once per opened lesson (new API only; failures are ignored).
  useEffect(() => {
    if (!newApi || typeof effective !== 'number' || viewed.current === effective) return;
    viewed.current = effective;
    viewPing.mutate({ enrollmentId: e.id, lessonId: effective }, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newApi, effective, e.id]);

  const go = (v: PlayerView) => {
    setView(v);
    setMenu(false);
  };
  const finished = (p: Partial<EnrollmentDetail>) => {
    setPatch((prev) => ({ ...prev, ...p }));
    go('done');
  };

  const idx = typeof effective === 'number' ? lessons.findIndex((l) => l.id === effective) : -1;
  const lesson = idx >= 0 ? lessons[idx]! : null;
  const next: PlayerView | null = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1]!.id : e.has_test ? 'test' : null;
  const prev: PlayerView | null =
    effective === 'test' ? (lessons[lessons.length - 1]?.id ?? null) : idx > 0 ? lessons[idx - 1]!.id : null;
  const pct = clampProgress(e.progress);
  const completed = e.status === 'completed';

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={onRefresh} testID="course-player">
        <PageHeader
          title={e.course_title ?? t('learning.player')}
          right={
            lessons.length > 0 ? (
              <IconButton icon="checklist" tone="soft" accessibilityLabel={t('learning.courseContent')} onPress={() => setMenu(true)} testID="player-menu" />
            ) : undefined
          }
        />
        <Card style={styles.gapBottom}>
          <View style={styles.progressHead}>
            <Text variant="label" tone="muted" style={styles.flex}>
              {t('learning.progressOf', { done: done.size, total: lessons.length })}
            </Text>
            <Text variant="label" weight="700">{`${pct}%`}</Text>
          </View>
          <ProgressBar value={pct / 100} color={pct >= 100 ? c.success : undefined} testID="player-progress" />
          {completed && !!e.certificate_number && effective !== 'done' && (
            <Button label={t('learning.certificate')} icon="graduation" variant="soft" size="sm" onPress={() => go('done')} style={styles.certBtn} />
          )}
        </Card>

        {lessons.length === 0 ? (
          <Card>
            <EmptyState title={t('learning.noLessons')} message={t('learning.noLessonsHint')} />
          </Card>
        ) : effective === 'done' ? (
          <FinishScreen e={e} onReview={() => lessons[0] && go(lessons[0].id)} />
        ) : effective === 'test' ? (
          <FinalTest
            e={e}
            allDone={allDone}
            onResult={(p) => setPatch((prev) => ({ ...prev, ...p }))}
            onPassed={() => go('done')}
            onBack={() => prev != null && go(prev)}
          />
        ) : lesson ? (
          <LessonView
            key={lesson.id}
            enrollmentId={e.id}
            lesson={lesson}
            number={idx + 1}
            total={lessons.length}
            isDone={done.has(lesson.id)}
            prev={prev}
            next={next}
            onGo={go}
            onCourseFinished={finished}
          />
        ) : null}
      </Screen>

      <Sheet scroll visible={menu} onClose={() => setMenu(false)} title={t('learning.courseContent')}>
        <CurriculumList
          sections={e.sections}
          lessons={e.lessons}
          done={done}
          current={effective}
          onPick={go}
          finalTest={
            e.has_test
              ? {
                  unlocked: allDone || completed,
                  label: completed
                    ? t('learning.testPassedShort', { score: e.score ?? 0 })
                    : allDone
                      ? t('learning.testUnlocked')
                      : t('learning.testLocked'),
                }
              : undefined
          }
        />
      </Sheet>
    </View>
  );
}

function LessonView({
  enrollmentId,
  lesson,
  number,
  total,
  isDone,
  prev,
  next,
  onGo,
  onCourseFinished,
}: {
  enrollmentId: number;
  lesson: LearningLesson;
  number: number;
  total: number;
  isDone: boolean;
  prev: PlayerView | null;
  next: PlayerView | null;
  onGo: (v: PlayerView) => void;
  onCourseFinished: (p: Partial<EnrollmentDetail>) => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const complete = useCompleteLesson();
  const submitQuiz = useSubmitQuiz();
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  // A quiz lesson WITH questions is completed only by passing it (server 409 otherwise).
  const isQuiz = lesson.lesson_type === 'quiz' && (lesson.questions?.length ?? 0) > 0;

  const markDone = async (advance: boolean) => {
    try {
      const res = await complete.mutateAsync({ enrollmentId, lessonId: lesson.id });
      if (res?.status === 'completed') {
        toast.success(t('learning.courseCompletedToast'));
        return onCourseFinished(enrollmentPatch(res));
      }
      toast.success(t('learning.lessonDone'));
      if (advance && next != null) onGo(next);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('errors.generic')));
    }
  };

  const sendQuiz = async (answers: Record<string, string[]>) => {
    try {
      const res = await submitQuiz.mutateAsync({ enrollmentId, lessonId: lesson.id, answers });
      setQuiz(res);
      if (res.passed && res.status === 'completed') toast.success(t('learning.courseCompletedToast'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('errors.generic')));
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.lessonHead}>
          <View style={[styles.lessonIcon, { backgroundColor: c.brandSoft }]}>
            <Icon name={lessonIcon(lesson.lesson_type)} size={20} color={c.brand} />
          </View>
          <View style={styles.flex}>
            <Text variant="caption" tone="subtle">
              {[t('learning.lessonNofM', { n: number, total }), lesson.duration_minutes ? t('learning.minutes', { count: lesson.duration_minutes }) : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text variant="heading" testID="player-lesson-title">
              {lesson.title ?? '—'}
            </Text>
          </View>
          {isDone && <Badge testID={`lesson-done-${lesson.id}`} label={t('learning.doneLabel')} tone="success" />}
        </View>
        <View style={styles.material}>
          {isQuiz ? (
            <>
              <Text variant="caption" tone="muted">
                {t('learning.quizLessonHint')}
              </Text>
              <QuizRunner
                questions={lesson.questions ?? []}
                result={quiz}
                submitting={submitQuiz.isPending}
                submitLabel={t('learning.checkAnswers')}
                onSubmit={(a) => void sendQuiz(a)}
                onRetry={() => setQuiz(null)}
              />
            </>
          ) : (
            <LessonMaterial lesson={lesson} />
          )}
        </View>
      </Card>

      <View style={styles.nav}>
        <Button
          testID="player-prev"
          label={t('learning.prevLesson')}
          icon="chevronLeft"
          variant="neutral"
          disabled={prev == null}
          onPress={() => prev != null && onGo(prev)}
        />
        <View style={styles.flex}>
          {!isDone && !isQuiz ? (
            <Button
              testID={`lesson-complete-${lesson.id}`}
              label={next != null ? t('learning.completeAndNext') : t('learning.markDone')}
              icon="check"
              loading={complete.isPending}
              onPress={() => void markDone(true)}
              full
            />
          ) : next != null ? (
            <Button
              testID="player-next"
              label={next === 'test' ? t('learning.toFinalTest') : t('learning.nextLesson')}
              icon="chevronRight"
              disabled={isQuiz && !isDone && !quiz?.passed}
              onPress={() => onGo(next)}
              full
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function FinalTest({
  e,
  allDone,
  onResult,
  onPassed,
  onBack,
}: {
  e: EnrollmentDetail;
  allDone: boolean;
  onResult: (p: Partial<EnrollmentDetail>) => void;
  onPassed: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const q = useQuery(finalTestQuery(e.id, started));
  const submit = useSubmitTest();
  const questions = q.data ?? [];

  if (!allDone && e.status !== 'completed') {
    return (
      <Card testID="final-test-locked">
        <EmptyState icon="lock" title={t('learning.testLocked')} message={t('learning.testLockedHint')} action={{ label: t('learning.backToLessons'), onPress: onBack }} />
      </Card>
    );
  }

  const send = async (answers: Record<string, string[]>) => {
    const unanswered = questions.length - Object.values(answers).filter((a) => a.length).length;
    const ok = await confirm({
      title: t('learning.submitTest'),
      message: unanswered > 0 ? t('learning.unansweredWarn', { count: unanswered }) : t('learning.submitTestHint'),
      confirmLabel: t('learning.submitTest'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const res = await submit.mutateAsync({ enrollmentId: e.id, answers });
      setResult({ ...res, pass_score: res.pass_score ?? e.pass_score });
      if (res.passed) {
        toast.success(t('learning.testPassed'));
        onResult(enrollmentPatch({ ...res, attempts: (e.attempts ?? 0) + 1 }));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('errors.generic')));
    }
  };

  if (!started) {
    return (
      <Card testID="final-test-intro">
        <View style={styles.center}>
          <View style={[styles.bigIcon, { backgroundColor: c.warningSoft }]}>
            <Icon name="graduation" size={30} color={c.warning} />
          </View>
          <Text variant="title" style={styles.textCenter}>
            {t('learning.finalTest')}
          </Text>
          {e.test_question_count != null && (
            <Text variant="label" tone="muted" style={styles.textCenter}>
              {t('learning.questionsN', { count: e.test_question_count })}
            </Text>
          )}
          <Text variant="body" tone="muted" style={styles.textCenter}>
            {t('learning.finalTestIntro', { score: e.pass_score ?? 0 })}
          </Text>
          {(e.attempts ?? 0) > 0 && (
            <Text variant="caption" tone="subtle" style={styles.textCenter}>
              {t('learning.previousAttempt', { count: e.attempts ?? 0, score: e.score ?? 0 })}
            </Text>
          )}
          <Button
            testID="final-test-start"
            label={e.status === 'completed' ? t('learning.retakeTest') : t('learning.startTest')}
            icon="checklist"
            onPress={() => setStarted(true)}
            full
          />
        </View>
      </Card>
    );
  }

  return (
    <Card testID="final-test">
      {q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <LoadingView rows={2} />
      ) : (
        <QuizRunner
          questions={questions}
          result={result}
          submitting={submit.isPending}
          submitLabel={t('learning.submitTest')}
          onSubmit={(a) => void send(a)}
          onRetry={() => {
            setResult(null);
            void q.refetch();
          }}
        />
      )}
      {result?.passed && (
        <Button testID="get-certificate" label={t('learning.getCertificate')} icon="graduation" onPress={onPassed} full style={styles.certBtn} />
      )}
    </Card>
  );
}

function FinishScreen({ e, onReview }: { e: EnrollmentDetail; onReview: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  if (e.status !== 'completed') {
    return (
      <Card>
        <EmptyState title={t('learning.notFinishedYet')} action={{ label: t('learning.backToLessons'), onPress: onReview }} />
      </Card>
    );
  }
  return (
    <View style={styles.stack} testID="player-finish">
      <Card>
        <View style={styles.center}>
          <View style={[styles.bigIcon, { backgroundColor: c.successSoft }]}>
            <Icon name="check" size={30} color={c.success} />
          </View>
          <Text variant="title" style={styles.textCenter}>
            {t('learning.congrats')}
          </Text>
          <Text variant="body" tone="muted" style={styles.textCenter}>
            {t('learning.congratsHint', { title: e.course_title ?? '' })}
          </Text>
          <Text variant="caption" tone="subtle" style={styles.textCenter}>
            {[e.completed_at ? fmtDate(e.completed_at) : null, e.score != null ? `${t('learning.score')}: ${e.score}%` : null, e.hours != null ? t('learning.academicHours', { count: e.hours }) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text variant="caption" tone="subtle" style={styles.textCenter}>
            {t('learning.k4Note')}
          </Text>
        </View>
      </Card>
      {!!e.certificate_number && <CertificateCard enrollment={e} />}
      <Button label={t('learning.reviewLessons')} variant="soft" icon="refresh" onPress={onReview} full />
      <Button label={t('learning.backToCenter')} variant="neutral" onPress={() => router.navigate('/oquv-markazi')} full />
    </View>
  );
}

/** The enrollment fields a completion / test answer reports (undefined ones are dropped). */
function enrollmentPatch(res: Partial<EnrollmentDetail> & { score?: number | null }): Partial<EnrollmentDetail> {
  const out: Partial<EnrollmentDetail> = {};
  for (const k of ['status', 'progress', 'score', 'attempts', 'certificate_number', 'certificate_expires_at', 'completed_at'] as const) {
    if (res[k] != null) (out as Record<string, unknown>)[k] = res[k];
  }
  return out;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: 12 },
  gapBottom: { marginBottom: 12, gap: 8 },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  certBtn: { marginTop: 8 },
  lessonHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  material: { marginTop: 14, gap: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { alignItems: 'center', gap: 8 },
  textCenter: { textAlign: 'center' },
  bigIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
