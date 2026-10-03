// Yozuv tafsiloti (v2 CoursePlayer, mobil qismi): progress, darslar ro'yxati —
// matn mazmuni, video/fayl havolasi (faqat http(s)), «bajarildi» belgisi.
// Test topshirish — web'da.
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { Badge, Button, ProgressBar, Sheet, Skeleton, Text, ErrorState } from '@/ui';
import { enrollmentQuery } from '../api/queries';
import { useCompleteLesson } from '../api/mutations';
import { clampProgress, isSafeLink, lessonDone } from '../utils/learning';

export function EnrollmentSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery(enrollmentQuery(id));
  const complete = useCompleteLesson();
  const e = q.data;
  const done = e?.completed_lesson_ids ?? [];

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(t('learning.openFailed'));
    }
  };

  const markDone = async (lessonId: number) => {
    try {
      await complete.mutateAsync({ enrollmentId: id, lessonId });
      toast.success(t('learning.lessonDone'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('errors.generic')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={e?.course_title ?? t('learning.title')}>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !e ? (
        <Skeleton height={160} />
      ) : (
        <View style={styles.body}>
          <View style={styles.row}>
            <Badge label={e.status_label || e.status} tone={e.status === 'completed' ? 'success' : 'brand'} />
            {e.score != null && (
              <Text variant="caption" tone="muted">
                {`${t('learning.score')}: ${e.score}`}
              </Text>
            )}
          </View>
          <ProgressBar value={clampProgress(e.progress) / 100} />
          <Text variant="caption" tone="subtle">
            {t('learning.progressOf', { done: done.length, total: e.lessons?.length ?? 0 })}
          </Text>
          {!!e.certificate_number && (
            <Text variant="label">{`${t('learning.certificate')}: ${e.certificate_number}`}</Text>
          )}
          {(e.lessons ?? []).length === 0 && (
            <Text variant="body" tone="muted">
              {t('learning.lessonsEmpty')}
            </Text>
          )}
          {(e.lessons ?? []).map((l) => {
            const isDone = lessonDone(l.id, done);
            const url = l.lesson_type === 'file' ? l.file_url : l.video_url;
            return (
              <View key={l.id} style={styles.lesson}>
                <View style={styles.row}>
                  <Text variant="label" style={styles.flex}>
                    {l.title ?? '—'}
                  </Text>
                  {isDone && <Badge testID={`lesson-done-${l.id}`} label={t('learning.done')} tone="success" />}
                </View>
                {!!l.duration_minutes && (
                  <Text variant="caption" tone="subtle">
                    {t('learning.minutes', { count: l.duration_minutes })}
                  </Text>
                )}
                {!!l.content && <Text variant="body">{l.content}</Text>}
                {isSafeLink(url) && (
                  <Button
                    testID={`lesson-open-${l.id}`}
                    label={
                      l.lesson_type === 'file' ? (l.file_name ?? t('learning.openFile')) : t('learning.watchVideo')
                    }
                    variant="soft"
                    size="sm"
                    onPress={() => void open(url)}
                  />
                )}
                {!isDone && (
                  <Button
                    testID={`lesson-complete-${l.id}`}
                    label={t('learning.markLessonDone')}
                    size="sm"
                    loading={complete.isPending}
                    onPress={() => void markDone(l.id)}
                  />
                )}
              </View>
            );
          })}
          {!!e.has_test && (
            <Text variant="caption" tone="subtle">
              {t('learning.testWebOnly')}
            </Text>
          )}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  lesson: { gap: 6, paddingTop: 8 },
});
