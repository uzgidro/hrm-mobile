// DARS MUHARRIRI (web v2 `LessonEditor`, a full screen on the phone so the
// quiz question list and its editor sheet do not stack modals): title, length,
// type, section, video link, text, an attached file and — for a quiz lesson —
// its questions. The lesson comes from the cached course detail.
//
// Old learning API: no quiz type, no sections and no `clear=` (an emptied field
// keeps its value there), so those controls are hidden when the course detail
// has no `sections`.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import type { UploadFile } from '@/api/formFile';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { Button, Card, ErrorState, IconButton, LoadingView, PageHeader, Screen, Segmented, Text } from '@/ui';
import { courseQuery, type CourseDetail, type LearningLesson, type LessonType } from '../api/queries';
import { useDeleteLesson, useUpdateLesson, type LessonForm } from '../api/mutations';
import { ChoiceField } from '../components/fields';
import { QuestionList } from '../components/QuestionList';
import { formatBytes, hasCurriculumApi } from '../utils/learning';

export default function LessonEditorScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ course?: string; id?: string }>();
  const courseId = Number(params.course ?? 0);
  const lessonId = Number(params.id ?? 0);
  const q = useQuery(courseQuery(courseId));
  const lesson = q.data?.lessons?.find((l) => l.id === lessonId);
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="lesson-editor">
      <PageHeader title={t('learning.editLesson')} subtitle={q.data?.title} />
      {q.data && lesson ? (
        <Editor key={lesson.id} course={q.data} lesson={lesson} />
      ) : q.isError || (q.data && !lesson) ? (
        <ErrorState title={t('learning.lessonNotFound')} onRetry={() => void q.refetch()} />
      ) : (
        <LoadingView rows={3} />
      )}
    </Screen>
  );
}

function Editor({ course, lesson }: { course: CourseDetail; lesson: LearningLesson }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const newApi = hasCurriculumApi(course);
  const update = useUpdateLesson();
  const remove = useDeleteLesson();
  const [title, setTitle] = useState(lesson.title ?? '');
  const [type, setType] = useState<LessonType>(((lesson.lesson_type as LessonType) || 'text') as LessonType);
  const [content, setContent] = useState(lesson.content ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [minutes, setMinutes] = useState(lesson.duration_minutes != null ? String(lesson.duration_minutes) : '');
  const [sectionId, setSectionId] = useState<number | null>(lesson.section_id ?? null);
  const [file, setFile] = useState<UploadFile | null>(null);
  const [dropFile, setDropFile] = useState(false);
  const types: LessonType[] = newApi ? ['video', 'text', 'file', 'quiz'] : ['video', 'text', 'file'];
  const hasStoredFile = !!lesson.file_name && !dropFile;

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: type === 'video' ? ['video/*', 'audio/*'] : '*/*',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: (a as { file?: Blob }).file ?? null });
  };

  const save = async () => {
    if (!title.trim()) return toast.error(t('learning.lessonTitleRequired'));
    const form: LessonForm = { title: title.trim(), lesson_type: type, clear: [] };
    if (content.trim()) form.content = content;
    else if (lesson.content) form.clear!.push('content');
    if (videoUrl.trim()) form.video_url = videoUrl.trim();
    else if (lesson.video_url) form.clear!.push('video_url');
    if (minutes.trim()) form.duration_minutes = Math.max(0, Math.round(Number(minutes) || 0));
    else if (lesson.duration_minutes != null) form.clear!.push('duration_minutes');
    if (file) form.file = file;
    else if (dropFile) form.clear!.push('file');
    if (newApi && sectionId !== (lesson.section_id ?? null)) {
      if (sectionId) form.section_id = sectionId;
      else form.clear!.push('section_id');
    }
    try {
      await update.mutateAsync({ id: lesson.id, form });
      toast.success(t('learning.saved'));
      setFile(null);
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };

  const del = async () => {
    const ok = await confirm({
      title: t('learning.deleteLesson'),
      message: lesson.title ?? '',
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(lesson.id);
      toast.success(t('learning.deleted'));
      router.back();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const showFile = type !== 'quiz';
  return (
    <View style={styles.stack}>
      <Card>
        <FormInput label={t('learning.lessonTitle')} value={title} onChangeText={setTitle} required testID="lesson-title" />
        <FormInput label={t('learning.lessonMinutes')} value={minutes} onChangeText={(v) => setMinutes(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" testID="lesson-minutes" />
        <Text variant="label" tone="muted" style={styles.label}>
          {t('learning.lessonType')}
        </Text>
        <Segmented<LessonType>
          testID="lesson-type"
          options={types.map((v) => ({ value: v, label: t(`learning.lessonType_${v}`) }))}
          value={type}
          onChange={setType}
        />
        {newApi && (course.sections ?? []).length > 0 && (
          <View style={styles.gapTop}>
            <ChoiceField<number>
              label={t('learning.section')}
              value={sectionId}
              noneLabel={t('learning.looseLessons')}
              options={(course.sections ?? []).map((s) => ({ value: s.id, label: s.title }))}
              onChange={setSectionId}
              testID="lesson-section"
            />
          </View>
        )}
      </Card>

      {type === 'quiz' ? (
        <Card title={t('learning.lessonType_quiz')} icon="checklist" tint="amber">
          {lesson.lesson_type === 'quiz' ? (
            <QuestionList courseId={course.id} lessonId={lesson.id} hint={t('learning.quizLessonHint')} canEdit={newApi} />
          ) : (
            <Text variant="body" tone="muted" testID="quiz-save-first">
              {t('learning.quizSaveFirst')}
            </Text>
          )}
        </Card>
      ) : (
        <Card>
          {type === 'video' && (
            <>
              <FormInput label={t('learning.videoUrl')} value={videoUrl} onChangeText={setVideoUrl} placeholder="https://youtu.be/…" keyboardType="url" testID="lesson-video-url" />
              <Text variant="caption" tone="subtle" style={styles.hint}>
                {t('learning.videoUrlHint')}
              </Text>
            </>
          )}
          <FormInput
            label={type === 'text' ? t('learning.lessonContent') : t('learning.fileDescription')}
            value={content}
            onChangeText={setContent}
            multiline
            testID="lesson-content"
          />
          {showFile && (
            <View style={styles.fileBox}>
              <Text variant="label" tone="muted">
                {type === 'video' ? t('learning.videoOrUpload') : type === 'file' ? t('learning.lessonFileMain') : t('learning.lessonFile')}
              </Text>
              {file ? (
                <View style={[styles.fileRow, { borderColor: c.border }]}>
                  <Icon name="doc" size={16} color={c.brand} />
                  <View style={styles.flex}>
                    <Text variant="label" numberOfLines={1} grow>
                      {file.name}
                    </Text>
                    <Text variant="caption" tone="subtle">
                      {t('learning.fileWillUpload')}
                    </Text>
                  </View>
                  <IconButton icon="close" accessibilityLabel={t('learning.removeFile')} onPress={() => setFile(null)} />
                </View>
              ) : hasStoredFile ? (
                <View style={[styles.fileRow, { borderColor: c.border }]} testID="lesson-stored-file">
                  <Icon name="doc" size={16} color={c.fgMuted} />
                  <View style={styles.flex}>
                    <Text variant="label" numberOfLines={1}>
                      {lesson.file_name}
                    </Text>
                    {!!formatBytes(lesson.file_size) && (
                      <Text variant="caption" tone="subtle">
                        {formatBytes(lesson.file_size)}
                      </Text>
                    )}
                  </View>
                  {newApi && <IconButton icon="trash" accessibilityLabel={t('learning.removeFile')} onPress={() => setDropFile(true)} testID="lesson-file-remove" />}
                </View>
              ) : null}
              <Button label={t('learning.pickFile')} icon="folder" variant="soft" size="sm" onPress={() => void pick()} testID="lesson-file-pick" />
              <Text variant="caption" tone="subtle">
                {t('learning.dropFileHint')}
              </Text>
            </View>
          )}
        </Card>
      )}

      <Button testID="lesson-save" label={t('common.save')} icon="check" loading={update.isPending} onPress={() => void save()} full size="lg" />
      <Button testID="lesson-delete" label={t('learning.deleteLesson')} icon="trash" variant="dangerGhost" loading={remove.isPending} onPress={() => void del()} full />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  label: { marginBottom: 6 },
  hint: { marginTop: -8, marginBottom: 12 },
  gapTop: { marginTop: 12 },
  fileBox: { gap: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, borderRadius: radii.md, borderWidth: 1.5 },
});
