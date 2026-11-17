// Curriculum by sections — the course landing outline (collapsible, read only)
// and the player's lesson list (ticks, the current lesson, the final test row).
// Lessons are numbered across sections, as Udemy numbers lectures.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from '@/ui';
import type { LearningLesson, LearningSection } from '../api/queries';
import { groupCurriculum, type PlayerView } from '../utils/learning';
import { lessonIcon } from './LessonMaterial';

export function CurriculumList({
  sections,
  lessons,
  done,
  current,
  onPick,
  finalTest,
  collapsible = false,
}: {
  sections?: LearningSection[];
  lessons?: LearningLesson[];
  done?: Set<number>;
  current?: PlayerView | null;
  onPick?: (v: PlayerView) => void;
  /** Player only: the final-test row (locked until every lesson is done). */
  finalTest?: { unlocked: boolean; label: string };
  collapsible?: boolean;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = groupCurriculum(sections, lessons);
  const numberOf = new Map(groups.flatMap((g) => g.lessons).map((l, i) => [l.id, i + 1]));
  const showHeads = !!sections && sections.length > 0;

  return (
    <View style={styles.wrap}>
      {groups.map((g) => {
        const key = String(g.section?.id ?? 'loose');
        const open = !collapsible || !collapsed.has(key);
        const mins = g.lessons.reduce((a, l) => a + (l.duration_minutes ?? 0), 0);
        return (
          <View key={key} style={styles.group}>
            {showHeads && (
              <Pressable
                testID={`curriculum-section-${key}`}
                disabled={!collapsible}
                onPress={() =>
                  setCollapsed((s) => {
                    const n = new Set(s);
                    if (n.has(key)) n.delete(key);
                    else n.add(key);
                    return n;
                  })
                }
                style={[styles.head, { backgroundColor: c.surface2 }]}
              >
                <View style={styles.flex}>
                  <Text variant="label" weight="700" numberOfLines={2}>
                    {g.section?.title ?? t('learning.looseLessons')}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {[t('learning.lessonsN', { count: g.lessons.length }), mins ? t('learning.minutes', { count: mins }) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {collapsible && <Icon name={open ? 'arrowUp' : 'arrowDown'} size={16} color={c.fgMuted} />}
              </Pressable>
            )}
            {open &&
              g.lessons.map((l) => {
                const isDone = !!done?.has(l.id);
                const active = current === l.id;
                return (
                  <Pressable
                    key={l.id}
                    testID={`curriculum-lesson-${l.id}`}
                    disabled={!onPick}
                    onPress={() => onPick?.(l.id)}
                    accessibilityState={{ selected: active }}
                    style={[styles.row, active && { backgroundColor: c.brandSoft }]}
                  >
                    <View
                      style={[
                        styles.mark,
                        { backgroundColor: isDone ? c.success : c.surface2, borderColor: isDone ? c.success : c.border },
                      ]}
                    >
                      {isDone ? (
                        <Icon name="check" size={13} color={c.fgOnBrand} />
                      ) : (
                        <Icon name={lessonIcon(l.lesson_type)} size={13} color={c.fgMuted} />
                      )}
                    </View>
                    <View style={styles.flex}>
                      <Text variant="label" weight={active ? '700' : undefined} numberOfLines={2}>
                        {`${numberOf.get(l.id) ?? ''}. ${l.title ?? '—'}`}
                      </Text>
                      <Text variant="caption" tone="subtle">
                        {[
                          t(`learning.lessonType_${l.lesson_type === 'video' || l.lesson_type === 'file' || l.lesson_type === 'quiz' ? l.lesson_type : 'text'}`),
                          l.duration_minutes ? t('learning.minutes', { count: l.duration_minutes }) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
          </View>
        );
      })}
      {finalTest && (
        <Pressable
          testID="curriculum-final-test"
          onPress={() => onPick?.('test')}
          accessibilityState={{ selected: current === 'test' }}
          style={[styles.row, styles.test, { borderColor: c.border }, current === 'test' && { backgroundColor: c.brandSoft }]}
        >
          <View
            style={[
              styles.mark,
              { backgroundColor: finalTest.unlocked ? c.warningSoft : c.surface2, borderColor: c.border },
            ]}
          >
            <Icon name={finalTest.unlocked ? 'graduation' : 'lock'} size={13} color={finalTest.unlocked ? c.warning : c.fgMuted} />
          </View>
          <View style={styles.flex}>
            <Text variant="label" weight="700">
              {t('learning.finalTest')}
            </Text>
            <Text variant="caption" tone="subtle">
              {finalTest.label}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  group: { gap: 2 },
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderRadius: radii.md, minHeight: 48 },
  mark: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  test: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
});
