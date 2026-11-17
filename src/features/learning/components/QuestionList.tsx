// Question bank of the final test (`lessonId` null) or of one quiz lesson —
// the editor view WITH the answer key. Editing in place needs the new API
// (`PATCH /questions/{id}`); on the old one a question can only be added or
// deleted, so tapping it then opens nothing.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { Button, EmptyState, ErrorState, IconButton, Sheet, Skeleton, Text, Toggle } from '@/ui';
import { courseQuestionsQuery, type LearningQuestion } from '../api/queries';
import { useCreateQuestion, useDeleteQuestion, useUpdateQuestion, type QuestionBody } from '../api/mutations';
import { nextOptionId } from '../utils/learning';

export function QuestionList({
  courseId,
  lessonId,
  hint,
  canEdit,
}: {
  courseId: number;
  lessonId: number | null;
  hint?: string;
  /** New API: questions can be edited in place. */
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const q = useQuery(courseQuestionsQuery(courseId, lessonId));
  const del = useDeleteQuestion();
  const [editing, setEditing] = useState<LearningQuestion | 'new' | null>(null);
  const rows = q.data ?? [];

  const remove = async (row: LearningQuestion) => {
    const ok = await confirm({
      title: t('learning.deleteQuestionTitle'),
      message: row.text ?? '',
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await del.mutateAsync(row.id);
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.wrap}>
      {!!hint && (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      )}
      {q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton height={120} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('learning.testEmpty')} message={t('learning.testEmptyHint')} />
      ) : (
        rows.map((row, i) => (
          <Pressable
            key={row.id}
            testID={`question-${row.id}`}
            disabled={!canEdit}
            onPress={() => setEditing(row)}
            style={[styles.row, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <View style={styles.head}>
              <Text variant="label" weight="700" style={styles.flex}>
                {`${i + 1}. ${row.text ?? ''}`}
              </Text>
              <IconButton icon="trash" accessibilityLabel={t('learning.deleteQuestionTitle')} onPress={() => void remove(row)} testID={`question-delete-${row.id}`} />
            </View>
            {(row.options ?? []).map((o) => {
              const right = (row.correct_ids ?? []).includes(String(o.id ?? ''));
              return (
                <View key={String(o.id)} style={styles.opt}>
                  {right ? (
                    <Icon name="check" size={14} color={c.success} />
                  ) : (
                    <View style={[styles.dot, { borderColor: c.borderStrong }]} />
                  )}
                  <Text variant="caption" tone={right ? 'success' : 'muted'} style={styles.flex}>
                    {o.text ?? ''}
                  </Text>
                </View>
              );
            })}
          </Pressable>
        ))
      )}
      <Button testID="question-add" label={t('learning.addQuestion')} icon="plus" variant="soft" onPress={() => setEditing('new')} />
      {editing && (
        <QuestionEditorSheet
          courseId={courseId}
          lessonId={lessonId}
          row={editing === 'new' ? null : editing}
          nextPosition={rows.length}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

type OptionDraft = { id: string; text: string; correct: boolean };

function QuestionEditorSheet({
  courseId,
  lessonId,
  row,
  nextPosition,
  onClose,
}: {
  courseId: number;
  lessonId: number | null;
  row: LearningQuestion | null;
  nextPosition: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateQuestion();
  const update = useUpdateQuestion();
  const [text, setText] = useState(row?.text ?? '');
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    row?.options?.length
      ? row.options.map((o, i) => ({
          id: String(o.id ?? `o${i}`),
          text: o.text ?? '',
          correct: (row.correct_ids ?? []).includes(String(o.id ?? '')),
        }))
      : [
          { id: 'a', text: '', correct: true },
          { id: 'b', text: '', correct: false },
        ],
  );
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending;

  const patch = (i: number, p: Partial<OptionDraft>) => setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, ...p } : o)));

  const save = async () => {
    const filled = options.filter((o) => o.text.trim());
    if (!text.trim()) return setError(t('learning.questionTextRequired'));
    if (filled.length < 2) return setError(t('learning.questionOptionsRequired'));
    if (!filled.some((o) => o.correct)) return setError(t('learning.questionCorrectRequired'));
    setError(null);
    const body: QuestionBody = {
      text: text.trim(),
      options: filled.map((o) => ({ id: o.id, text: o.text.trim() })),
      correct_ids: filled.filter((o) => o.correct).map((o) => o.id),
    };
    try {
      if (row) await update.mutateAsync({ id: row.id, body });
      else
        await create.mutateAsync({
          courseId,
          body: { ...body, position: nextPosition, ...(lessonId ? { lesson_id: lessonId } : {}) },
        });
      toast.success(t('learning.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={row ? t('learning.editQuestion') : t('learning.addQuestion')}>
      <View style={styles.sheet}>
        <FormInput label={t('learning.questionText')} value={text} onChangeText={setText} multiline required testID="question-text" />
        <Text variant="label" tone="muted">
          {t('learning.questionOptions')}
        </Text>
        <Text variant="caption" tone="subtle">
          {t('learning.questionOptionsHint')}
        </Text>
        {options.map((o, i) => (
          <View key={o.id} style={styles.optRow}>
            <View style={styles.flex}>
              <FormInput
                label={t('learning.optionPlaceholder', { letter: String.fromCharCode(65 + i) })}
                value={o.text}
                onChangeText={(v) => patch(i, { text: v })}
                testID={`option-text-${i}`}
              />
            </View>
            <View style={styles.correct}>
              <Text variant="caption" tone="muted">
                {t('learning.correct')}
              </Text>
              <Toggle value={o.correct} onValueChange={(v) => patch(i, { correct: v })} accessibilityLabel={t('learning.correct')} testID={`option-correct-${i}`} />
            </View>
            {options.length > 2 && (
              <IconButton icon="close" accessibilityLabel={t('learning.removeOption')} onPress={() => setOptions((prev) => prev.filter((_, j) => j !== i))} />
            )}
          </View>
        ))}
        <Button
          label={t('learning.addOption')}
          icon="plus"
          variant="link"
          onPress={() => setOptions((prev) => [...prev, { id: nextOptionId(prev.map((x) => x.id)), text: '', correct: false }])}
          testID="option-add"
        />
        {!!error && (
          <Text variant="label" tone="danger" testID="question-error">
            {error}
          </Text>
        )}
        <Button testID="question-save" label={t('common.save')} icon="check" loading={busy} onPress={() => void save()} full />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  row: { gap: 4, padding: 12, borderRadius: radii.md, borderWidth: 1.5 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  sheet: { gap: 6, paddingBottom: 8 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  correct: { alignItems: 'center', gap: 2 },
});
