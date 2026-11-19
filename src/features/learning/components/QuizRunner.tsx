// Answers a set of questions (a quiz lesson or the final test). Single-answer
// questions behave like radio buttons, multi-answer ones like checkboxes. After
// grading the questions are locked and marked right/wrong; the right options
// are shown only when the server reveals them (a passed quiz).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Button, Text } from '@/ui';
import type { LearningQuestion, QuizResult } from '../api/queries';

export function QuizRunner({
  questions,
  result,
  submitting,
  submitLabel,
  onSubmit,
  onRetry,
}: {
  questions: LearningQuestion[];
  result: QuizResult | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (answers: Record<string, string[]>) => void;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const verdict = new Map((result?.results ?? []).map((r) => [r.question_id, r]));
  const locked = !!result;
  const answered = questions.filter((q) => (answers[String(q.id)] ?? []).length > 0).length;

  const toggle = (q: LearningQuestion, optionId: string) => {
    if (locked) return;
    setAnswers((prev) => {
      const key = String(q.id);
      const cur = prev[key] ?? [];
      const next = q.multiple
        ? cur.includes(optionId)
          ? cur.filter((x) => x !== optionId)
          : [...cur, optionId]
        : [optionId];
      return { ...prev, [key]: next };
    });
  };

  return (
    <View style={styles.wrap}>
      {result && (
        <View
          testID="quiz-result"
          style={[styles.result, { backgroundColor: result.passed ? c.successSoft : c.dangerSoft }]}
        >
          <Text variant="number" style={{ color: result.passed ? c.success : c.danger }}>{`${result.score}%`}</Text>
          <View style={styles.flex}>
            <Text variant="heading">{result.passed ? t('learning.quizPassed') : t('learning.quizFailed')}</Text>
            <Text variant="caption" tone="muted">
              {t('learning.quizScoreLine', { correct: result.correct, total: result.total, pass: result.pass_score ?? 0 })}
            </Text>
          </View>
        </View>
      )}
      {result && !result.passed && onRetry && (
        <Button
          testID="quiz-retry"
          label={t('learning.tryAgain')}
          variant="soft"
          icon="refresh"
          onPress={() => {
            setAnswers({});
            onRetry();
          }}
        />
      )}
      {questions.map((q, qi) => {
        const v = verdict.get(q.id);
        const mine = answers[String(q.id)] ?? [];
        return (
          <View key={q.id} style={[styles.question, { borderColor: v ? (v.correct ? c.successMark : c.dangerMark) : c.border }]}>
            <View style={styles.qHead}>
              <Text variant="label" tone="muted">{`${qi + 1}.`}</Text>
              <Text variant="heading" style={styles.flex}>
                {q.text ?? '—'}
              </Text>
              {v && <Icon name={v.correct ? 'check' : 'close'} size={18} color={v.correct ? c.success : c.danger} />}
            </View>
            {q.multiple && (
              <Text variant="caption" tone="subtle">
                {t('learning.multipleHint')}
              </Text>
            )}
            {(q.options ?? []).map((o) => {
              const oid = String(o.id ?? '');
              const on = mine.includes(oid);
              const right = !!v?.correct_ids?.includes(oid);
              return (
                <Pressable
                  key={oid}
                  testID={`quiz-opt-${q.id}-${oid}`}
                  accessibilityRole={q.multiple ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: on, disabled: locked }}
                  disabled={locked}
                  onPress={() => toggle(q, oid)}
                  style={[
                    styles.option,
                    { borderColor: right ? c.successMark : on ? c.brand : c.border, backgroundColor: right ? c.successSoft : on ? c.brandSoft : c.surface },
                  ]}
                >
                  <View
                    style={[
                      q.multiple ? styles.box : styles.radio,
                      { borderColor: on ? c.brand : c.borderStrong, backgroundColor: on ? c.brand : 'transparent' },
                    ]}
                  >
                    {on && <Icon name="check" size={12} color={c.fgOnBrand} />}
                  </View>
                  <Text variant="body" style={styles.flex}>
                    {o.text ?? ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
      {!locked && (
        <View style={styles.footer}>
          <Text variant="caption" tone="subtle">
            {t('learning.answeredOf', { done: answered, total: questions.length })}
          </Text>
          <Button
            testID="quiz-submit"
            label={submitLabel}
            icon="check"
            loading={submitting}
            disabled={answered === 0}
            onPress={() => onSubmit(answers)}
            full
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  flex: { flex: 1 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radii.lg },
  question: { gap: 8, padding: 12, borderRadius: radii.lg, borderWidth: 1.5 },
  qHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.md, borderWidth: 1.5, minHeight: 48 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: 8 },
});
