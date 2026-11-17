// O'QUV DASTURI tab of the builder (web v2 `CurriculumBuilder`), phone-shaped:
// sections with rename / move / delete, lessons with up/down buttons instead of
// drag-and-drop, «+ Dars» per section and a new-section row. Tapping a lesson
// opens its editor screen.
//
// New API: one `PUT /courses/{id}/curriculum` carries the whole new order.
// Old API (no `sections`): a flat list; moving a lesson swaps the `position`
// of the two neighbours with two lesson PATCHes, sections are not offered.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { Badge, Button, IconButton, Segmented, Sheet, Text } from '@/ui';
import type { CourseDetail, LearningLesson, LearningSection, LessonType } from '../api/queries';
import {
  useCreateLesson,
  useCreateSection,
  useDeleteSection,
  useRenameSection,
  useReorderCurriculum,
  useUpdateLesson,
} from '../api/mutations';
import {
  curriculumPlan,
  groupCurriculum,
  hasCurriculumApi,
  lessonHasMaterial,
  nudgeLesson,
  nudgeSection,
  planBody,
  type CurriculumPlan,
} from '../utils/learning';
import { lessonIcon } from './LessonMaterial';
import { PromptSheet } from './PromptSheet';

const openLesson = (courseId: number, lessonId: number) =>
  router.push({ pathname: '/kurs-dars', params: { course: String(courseId), id: String(lessonId) } });

export function CurriculumBuilder({ course }: { course: CourseDetail }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const newApi = hasCurriculumApi(course);
  const groups = useMemo(() => groupCurriculum(newApi ? course.sections : undefined, course.lessons), [newApi, course.sections, course.lessons]);
  const reorder = useReorderCurriculum();
  const updateLesson = useUpdateLesson();
  const createSection = useCreateSection();
  const renameSection = useRenameSection();
  const deleteSection = useDeleteSection();
  const [adding, setAdding] = useState<{ sectionId: number | null } | null>(null);
  const [sectionSheet, setSectionSheet] = useState<{ section: LearningSection | null } | null>(null);
  const incomplete = new Set(course.readiness?.find((r) => r.key === 'lesson_content')?.lesson_ids ?? []);
  const numberOf = new Map(groups.flatMap((g) => g.lessons).map((l, i) => [l.id, i + 1]));
  const busy = reorder.isPending || updateLesson.isPending;

  const submit = async (p: CurriculumPlan | null) => {
    if (!p) return;
    try {
      await reorder.mutateAsync({ courseId: course.id, body: planBody(p) });
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  /** Old API: swap the neighbours, then renumber every lesson whose `position` is not its index
   *  (old courses often have all positions at 0, so a two-row swap alone would not stick). */
  const swapOld = async (lessonId: number, dir: -1 | 1) => {
    const plan = nudgeLesson([{ sid: null, ids: (groups[0]?.lessons ?? []).map((l) => l.id) }], lessonId, dir);
    if (!plan) return;
    const byId = new Map((course.lessons ?? []).map((l) => [l.id, l]));
    try {
      for (const [index, id] of plan[0]!.ids.entries()) {
        if (byId.get(id)?.position !== index) await updateLesson.mutateAsync({ id, form: { position: index } });
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const moveLesson = (lessonId: number, dir: -1 | 1) => {
    if (busy) return;
    if (newApi) void submit(nudgeLesson(curriculumPlan(groups), lessonId, dir));
    else void swapOld(lessonId, dir);
  };

  const saveSection = async (title: string) => {
    try {
      if (sectionSheet?.section) await renameSection.mutateAsync({ id: sectionSheet.section.id, title });
      else await createSection.mutateAsync({ courseId: course.id, title });
      setSectionSheet(null);
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };

  const removeSection = async (s: LearningSection, n: number) => {
    const ok = await confirm({
      title: t('learning.deleteSection'),
      message: n ? t('learning.deleteSectionHint', { count: n }) : s.title,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSection.mutateAsync({ id: s.id });
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const sectionIds = groups.flatMap((g) => (g.section ? [g.section.id] : []));
  const sectionCount = sectionIds.length;

  return (
    <View style={styles.wrap}>
      {groups.map((g) => {
        const sec = g.section;
        const si = sec ? sectionIds.indexOf(sec.id) : -1;
        return (
          <View key={sec?.id ?? 'loose'} style={[styles.group, { borderColor: c.border, backgroundColor: c.surface }]} testID={`builder-group-${sec?.id ?? 'loose'}`}>
            {(newApi && (sec || sectionCount > 0)) && (
              <View style={[styles.groupHead, { backgroundColor: c.surface2 }]}>
                <View style={styles.flex}>
                  <Text variant="label" weight="700" numberOfLines={2}>
                    {sec ? sec.title : t('learning.looseLessons')}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {t('learning.lessonsN', { count: g.lessons.length })}
                  </Text>
                </View>
                {sec && (
                  <>
                    {si > 0 && (
                      <IconButton icon="arrowUp" accessibilityLabel={t('learning.moveUp')} onPress={() => !busy && void submit(nudgeSection(curriculumPlan(groups), sec.id, -1))} testID={`section-up-${sec.id}`} />
                    )}
                    {si < sectionCount - 1 && (
                      <IconButton icon="arrowDown" accessibilityLabel={t('learning.moveDown')} onPress={() => !busy && void submit(nudgeSection(curriculumPlan(groups), sec.id, 1))} testID={`section-down-${sec.id}`} />
                    )}
                    <IconButton icon="edit" accessibilityLabel={t('learning.renameSection')} onPress={() => setSectionSheet({ section: sec })} testID={`section-rename-${sec.id}`} />
                    <IconButton icon="trash" accessibilityLabel={t('learning.deleteSection')} onPress={() => void removeSection(sec, g.lessons.length)} testID={`section-delete-${sec.id}`} />
                  </>
                )}
              </View>
            )}
            {g.lessons.length === 0 && (
              <Text variant="caption" tone="subtle" style={styles.empty}>
                {sec ? t('learning.sectionEmpty') : t('learning.lessonsEmptyHint')}
              </Text>
            )}
            {g.lessons.map((l, i) => (
              <LessonRow
                key={l.id}
                lesson={l}
                number={numberOf.get(l.id) ?? 0}
                incomplete={newApi ? incomplete.has(l.id) : !lessonHasMaterial(l)}
                onOpen={() => openLesson(course.id, l.id)}
                onUp={i > 0 ? () => moveLesson(l.id, -1) : undefined}
                onDown={i < g.lessons.length - 1 ? () => moveLesson(l.id, 1) : undefined}
              />
            ))}
            <Button
              label={t('learning.addLesson')}
              icon="plus"
              variant="link"
              size="sm"
              onPress={() => setAdding({ sectionId: sec?.id ?? null })}
              testID={`add-lesson-${sec?.id ?? 'loose'}`}
              style={styles.addLesson}
            />
          </View>
        );
      })}
      {newApi && (
        <Button label={t('learning.addSection')} icon="folder" variant="soft" onPress={() => setSectionSheet({ section: null })} testID="add-section" />
      )}
      {adding && <AddLessonSheet courseId={course.id} sectionId={adding.sectionId} allowQuiz={newApi} onClose={() => setAdding(null)} />}
      {sectionSheet && (
        <PromptSheet
          title={sectionSheet.section ? t('learning.renameSection') : t('learning.addSection')}
          label={t('learning.sectionTitle')}
          initial={sectionSheet.section?.title ?? ''}
          placeholder={t('learning.newSectionPlaceholder')}
          busy={createSection.isPending || renameSection.isPending}
          onSubmit={(v) => void saveSection(v)}
          onClose={() => setSectionSheet(null)}
          testID="section-title"
        />
      )}
    </View>
  );
}

function LessonRow({
  lesson,
  number,
  incomplete,
  onOpen,
  onUp,
  onDown,
}: {
  lesson: LearningLesson;
  number: number;
  incomplete: boolean;
  onOpen: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  return (
    <View style={[styles.lessonRow, { borderTopColor: c.border }]}>
      <Pressable onPress={onOpen} style={styles.lessonMain} testID={`builder-lesson-${lesson.id}`} accessibilityRole="button">
        <View style={[styles.lessonIcon, { backgroundColor: c.brandSoft }]}>
          <Icon name={lessonIcon(lesson.lesson_type)} size={15} color={c.brand} />
        </View>
        <View style={styles.flex}>
          <Text variant="label" weight="600" numberOfLines={2}>
            {`${number}. ${lesson.title ?? '—'}`}
          </Text>
          <Text variant="caption" tone="subtle">
            {[
              t(`learning.lessonType_${['video', 'file', 'quiz'].includes(String(lesson.lesson_type)) ? lesson.lesson_type : 'text'}`),
              lesson.duration_minutes != null ? t('learning.minutes', { count: lesson.duration_minutes }) : null,
              lesson.lesson_type === 'quiz' ? t('learning.questionsN', { count: lesson.question_count ?? 0 }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {incomplete && (
            <View style={styles.badge}>
              <Badge label={t('learning.needsContent')} tone="warning" testID={`lesson-incomplete-${lesson.id}`} />
            </View>
          )}
        </View>
      </Pressable>
      {onUp && <IconButton icon="arrowUp" accessibilityLabel={t('learning.moveUp')} onPress={onUp} testID={`lesson-up-${lesson.id}`} />}
      {onDown && <IconButton icon="arrowDown" accessibilityLabel={t('learning.moveDown')} onPress={onDown} testID={`lesson-down-${lesson.id}`} />}
    </View>
  );
}

/** Title + type, appended to the end of its section; the editor opens right after. */
function AddLessonSheet({ courseId, sectionId, allowQuiz, onClose }: { courseId: number; sectionId: number | null; allowQuiz: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateLesson();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LessonType>('video');
  const types: LessonType[] = allowQuiz ? ['video', 'text', 'file', 'quiz'] : ['video', 'text', 'file'];
  const add = async () => {
    if (!title.trim()) return;
    try {
      const l = await create.mutateAsync({
        courseId,
        form: { title: title.trim(), lesson_type: type, ...(sectionId ? { section_id: sectionId } : {}) },
      });
      onClose();
      if (l?.id) openLesson(courseId, l.id);
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };
  return (
    <Sheet visible onClose={onClose} title={t('learning.addLesson')}>
      <View style={styles.sheet}>
        <Segmented<LessonType> options={types.map((v) => ({ value: v, label: t(`learning.lessonType_${v}`) }))} value={type} onChange={setType} testID="new-lesson-type" />
        <FormInput
          label={t('learning.lessonTitle')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('learning.newLessonPlaceholder', { type: t(`learning.lessonType_${type}`).toLowerCase() })}
          required
          testID="new-lesson-title"
        />
        <Button label={t('learning.addLesson')} icon="plus" loading={create.isPending} disabled={!title.trim()} onPress={() => void add()} full testID="new-lesson-submit" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  group: { borderRadius: radii.lg, borderWidth: 1.5, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 12, paddingVertical: 4, minHeight: 52 },
  empty: { padding: 12 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingRight: 2 },
  lessonMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, minHeight: 52 },
  lessonIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badge: { marginTop: 4 },
  addLesson: { alignSelf: 'flex-start', marginLeft: 6, marginVertical: 4 },
  sheet: { gap: 10, paddingBottom: 8 },
});
