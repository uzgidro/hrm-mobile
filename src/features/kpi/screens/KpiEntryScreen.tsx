import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import { PickerModal, type PickerOption } from '@/components/PickerModal';
import { confirm } from '@/lib/confirm';
import type { KpiTask } from '@/types';
import { kpiEntryQuery, entryBonusesQuery, taskStatusesQuery } from '../api/queries';
import {
  useAddKpiTask, useUpdateKpiTask, useDeleteKpiTask, useSetTaskStatus, useSetTaskGrade,
} from '../api/mutations';
import {
  isEntryLocked, canAddTaskV2, canEditTask, canGradeTask, canSetStatus,
  factSum, entryResultDisplay, parseScore,
} from '../utils';

// KPI entry detail (web EntryTasksPage, Verifix). Permissions come from
// entry.my_access (filled only on this detail endpoint): edit_access adds/renames/
// deletes tasks, task_approve/edit grades them, task_approve/status_change moves
// them through the per-branch status catalog. The fact is the sum of scores in
// counts_for_fact statuses. Read-only bonuses below.
export default function KpiEntryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: entry, isLoading, isError, refetch, isFetching } = useQuery(kpiEntryQuery(entryId));
  // Fetch the status catalog for the ENTRY's branch (web parity) — a cross-branch
  // supervisor needs the subordinate branch's statuses, not their own. Passing
  // undefined until the entry loads returns the caller's own branch catalog.
  const { data: statuses = [] } = useQuery(taskStatusesQuery(entry?.organization_branch_id ?? undefined));
  const { data: bonuses = [] } = useQuery(entryBonusesQuery(entryId));

  // New-task composer (name + optional score).
  const [newName, setNewName] = useState('');
  const [newScore, setNewScore] = useState('');
  // Inline task-name edit.
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  // Inline grade edit (task id + score string).
  const [grading, setGrading] = useState<{ id: number; score: string } | null>(null);
  // Status picker target task id.
  const [statusPickerFor, setStatusPickerFor] = useState<number | null>(null);

  const addTask = useAddKpiTask(entryId);
  const updateTask = useUpdateKpiTask();
  const deleteTask = useDeleteKpiTask();
  const setStatus = useSetTaskStatus();
  const setGrade = useSetTaskGrade();

  const access = entry?.my_access ?? null;
  const locked = entry ? isEntryLocked(entry) : true;
  const canEdit = canEditTask(access);
  const canGrade = canGradeTask(access);
  const canStatus = canSetStatus(access);
  const tasks = entry?.tasks ?? [];
  const factTotal = factSum(tasks);
  const maxPercent = entry?.indicator?.max_percent;

  const statusOptions = useMemo<PickerOption[]>(
    () => statuses.map((s) => ({ value: s.id, label: s.name })),
    [statuses],
  );

  const newScoreValid = newScore.trim() === '' || parseScore(newScore) != null;
  const onAdd = () => {
    const name = newName.trim();
    if (!name || addTask.isPending || !newScoreValid) return;
    addTask.mutate(
      { name, score: newScore.trim() || undefined },
      { onSuccess: () => { setNewName(''); setNewScore(''); } },
    );
  };

  const onSaveEdit = () => {
    const name = editing?.name.trim();
    if (!editing || !name || updateTask.isPending) return;
    updateTask.mutate({ id: editing.id, name }, { onSuccess: () => setEditing(null) });
  };

  // Grade is valid when parseScore accepts it (empty = 0, garbage/negative = null).
  const gradeValid = grading ? parseScore(grading.score) != null : false;
  const onSaveGrade = () => {
    if (!grading || setGrade.isPending || !gradeValid) return;
    setGrade.mutate({ id: grading.id, score: grading.score }, { onSuccess: () => setGrading(null) });
  };

  const onDeleteTask = async (task: KpiTask) => {
    const ok = await confirm({
      title: t('kpi.deleteConfirmTitle'),
      message: t('kpi.deleteConfirmMessage'),
      confirmLabel: t('kpi.deleteAction'),
      cancelLabel: t('common.cancel'),
      icon: 'trash',
      destructive: true,
    });
    if (ok) deleteTask.mutate(task.id);
  };

  const onPickStatus = (statusId: number) => {
    const taskId = statusPickerFor;
    setStatusPickerFor(null);
    if (taskId != null) setStatus.mutate({ id: taskId, statusId });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('kpi.entryTitle')} />

      {isLoading ? (
        <LoadingView />
      ) : isError || !entry ? (
        <ErrorState title={t('kpi.loadError')} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {/* ── Summary card ── */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t('kpi.indicator')}</Text>
            <Text style={styles.indicatorName}>{entry.indicator?.name || '—'}</Text>

            <View style={styles.summaryRow}>
              <Summary label={t('kpi.owner')} value={entry.employee?.legal_name || '—'} styles={styles} flex />
            </View>
            <View style={styles.summaryRow}>
              <Summary label={t('kpi.plan')} value={String(Number(entry.plan_value ?? 0))} styles={styles} />
              <Summary label={t('kpi.computedFact')} value={String(Number(entry.fact_value ?? 0))} styles={styles} />
              <Summary label={t('kpi.result')} value={entryResultDisplay(entry)} styles={styles} />
            </View>

            {entry.indicator?.has_tasks && (
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedLabel}>{t('kpi.factSum')}</Text>
                <Text style={styles.confirmedValue}>
                  {factTotal}%{maxPercent != null ? `  /  max ${Number(maxPercent)}%` : ''}
                </Text>
              </View>
            )}

            {locked && (
              <View style={styles.lockedNote}>
                <Icon name="lock" size={13} color={colors.textMuted} />
                <Text style={styles.lockedText}>{t('kpi.lockedNote')}</Text>
              </View>
            )}
          </View>

          {/* ── Tasks ── */}
          {entry.indicator?.has_tasks ? (
            <>
              <Text style={styles.sectionLabel}>{t('kpi.tasksTitle')}</Text>

              {canAddTaskV2(access, entry) && (
                <View style={styles.addCard}>
                  <TextInput
                    style={styles.addInput}
                    placeholder={t('kpi.addTaskPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                    multiline
                  />
                  <View style={styles.addRow}>
                    <TextInput
                      style={[styles.scoreInput, !newScoreValid && styles.inputInvalid]}
                      placeholder={t('kpi.scorePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={newScore}
                      onChangeText={setNewScore}
                    />
                    <TouchableOpacity
                      style={[styles.addBtn, (!newName.trim() || !newScoreValid || addTask.isPending) && { opacity: 0.5 }]}
                      onPress={onAdd}
                      disabled={!newName.trim() || !newScoreValid || addTask.isPending}
                      activeOpacity={0.85}
                    >
                      <Icon name="plus" size={20} color={colors.onPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {tasks.length === 0 ? (
                <EmptyState icon="checklist" title={t('kpi.emptyTasks')} />
              ) : (
                tasks.map((task) => {
                  const isEditingName = editing?.id === task.id;
                  const isGrading = grading?.id === task.id;
                  const pillColor = task.task_status?.color || colors.textMuted;
                  return (
                    <View key={task.id} style={styles.taskCard}>
                      {isEditingName ? (
                        <TextInput
                          style={styles.editInput}
                          value={editing.name}
                          onChangeText={(name) => setEditing({ id: task.id, name })}
                          multiline
                          autoFocus
                        />
                      ) : (
                        <Text style={styles.taskName}>{task.name}</Text>
                      )}

                      <View style={styles.taskMeta}>
                        {/* Score — tappable for graders, otherwise a plain label */}
                        {canGrade && !locked ? (
                          <TouchableOpacity
                            onPress={() => setGrading({ id: task.id, score: task.score != null ? String(task.score) : '' })}
                            hitSlop={6}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.taskScore, styles.taskScoreEditable]}>
                              {task.score != null ? `${Number(task.score)}%` : t('kpi.setScore')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.taskScore}>{task.score != null ? `${Number(task.score)}%` : '—'}</Text>
                        )}

                        {/* Status pill — tappable for status-setters, opens the catalog picker */}
                        <TouchableOpacity
                          style={[styles.statusPill, { backgroundColor: `${pillColor}22` }]}
                          disabled={!canStatus || locked}
                          onPress={() => setStatusPickerFor(task.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.statusPillText, { color: pillColor }]} numberOfLines={1}>
                            {task.task_status?.name || t('kpi.statusNone')}
                          </Text>
                          {canStatus && !locked && <Icon name="chevronRight" size={13} color={pillColor} />}
                        </TouchableOpacity>

                        {canEdit && !locked && (
                          <View style={styles.taskActions}>
                            {isEditingName ? (
                              <TaskAction icon="check" color={colors.success} onPress={onSaveEdit} styles={styles} />
                            ) : (
                              <TaskAction icon="edit" color={colors.textSecondary} onPress={() => setEditing({ id: task.id, name: task.name ?? '' })} styles={styles} />
                            )}
                            <TaskAction icon="trash" color={colors.error} onPress={() => onDeleteTask(task)} styles={styles} />
                          </View>
                        )}
                      </View>

                      {/* Inline grade editor */}
                      {isGrading && canGrade && !locked && (
                        <View style={styles.gradePanel}>
                          <Text style={styles.fieldLabel}>{t('kpi.scoreLabel')}</Text>
                          <TextInput
                            style={[styles.gradeInput, !gradeValid && styles.inputInvalid]}
                            keyboardType="numeric"
                            autoFocus
                            value={grading.score}
                            onChangeText={(score) => setGrading({ id: task.id, score })}
                          />
                          <View style={styles.gradeActions}>
                            <TouchableOpacity
                              style={[styles.gradeSaveBtn, (setGrade.isPending || !gradeValid) && { opacity: 0.5 }]}
                              onPress={onSaveGrade}
                              disabled={setGrade.isPending || !gradeValid}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.gradeSaveText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.gradeCancelBtn} onPress={() => setGrading(null)} activeOpacity={0.8}>
                              <Text style={styles.gradeCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          ) : bonuses.length === 0 ? (
            // Non-task indicators (manual/gather/formula) have nothing actionable
            // for the owner — the fact is computed/entered elsewhere.
            <EmptyState icon="target" title={t('kpi.noTasksIndicator')} />
          ) : null}

          {/* ── Bonuses (read-only; amount stays null until 1C payroll) ── */}
          {bonuses.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('kpi.bonusesTitle')}</Text>
              <View style={styles.bonusCard}>
                {bonuses.map((b, i) => (
                  <View key={b.id} style={[styles.bonusRow, i > 0 && styles.bonusRowBorder]}>
                    <Text style={styles.bonusName} numberOfLines={2}>{b.oper_type_name || '—'}</Text>
                    <Text style={styles.bonusPercent}>
                      {b.bonus_percent != null ? `${Number(b.bonus_percent)}%` : '—'}
                    </Text>
                    <Text style={styles.bonusAmount}>{b.amount != null ? String(b.amount) : '—'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <PickerModal
        visible={statusPickerFor != null}
        title={t('kpi.pickStatusTitle')}
        options={statusOptions}
        selected={statusPickerFor != null ? (tasks.find((x) => x.id === statusPickerFor)?.status_id ?? null) : null}
        onClose={() => setStatusPickerFor(null)}
        onSelect={onPickStatus}
      />
    </SafeAreaView>
  );
}

// ── Small presentational bits ────────────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function Summary({ label, value, styles, flex }: { label: string; value: string; styles: Styles; flex?: boolean }) {
  return (
    <View style={[styles.summaryCell, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function TaskAction({
  icon, color, onPress, styles,
}: { icon: React.ComponentProps<typeof Icon>['name']; color: string; onPress: () => void; styles: Styles }) {
  return (
    <TouchableOpacity style={styles.taskActionBtn} onPress={onPress} hitSlop={6} activeOpacity={0.7}>
      <Icon name={icon} size={17} color={color} />
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 8 },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder,
      padding: 16, marginBottom: 18,
    },
    fieldLabel: { fontSize: 10.5, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    indicatorName: { fontSize: 14.5, fontWeight: '700', color: c.text, lineHeight: 20, marginTop: 4 },
    summaryRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    summaryCell: { minWidth: 70 },
    summaryValue: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 3 },

    confirmedRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.cardBorder,
    },
    confirmedLabel: { fontSize: 12.5, color: c.textSecondary },
    confirmedValue: { fontSize: 14, fontWeight: '800', color: c.primary },

    lockedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    lockedText: { fontSize: 12, color: c.textMuted },

    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 2,
    },

    addCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      padding: 12, marginBottom: 12, gap: 8,
    },
    addInput: {
      minHeight: 40, paddingHorizontal: 12, paddingVertical: 8,
      backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder,
      fontSize: 14, color: c.text,
    },
    addRow: { flexDirection: 'row', gap: 8 },
    scoreInput: {
      flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder,
      fontSize: 14, color: c.text,
    },
    inputInvalid: { borderColor: c.error },
    addBtn: {
      width: 44, height: 44, borderRadius: 10, backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
    },

    taskCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      padding: 14, marginBottom: 10,
    },
    taskName: { fontSize: 14, color: c.text, lineHeight: 19 },
    editInput: {
      backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.primary,
      paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: c.text,
    },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    taskScore: { fontSize: 14, fontWeight: '800', color: c.text, minWidth: 40 },
    taskScoreEditable: { color: c.primary },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, maxWidth: 150 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    taskActions: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
    taskActionBtn: {
      width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },

    gradePanel: {
      marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.cardBorder, gap: 8,
    },
    gradeInput: {
      backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.primary,
      paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: c.text,
    },
    gradeActions: { flexDirection: 'row', gap: 8 },
    gradeSaveBtn: {
      flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary,
    },
    gradeSaveText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
    gradeCancelBtn: {
      paddingHorizontal: 16, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    gradeCancelText: { color: c.textSecondary, fontWeight: '600', fontSize: 14 },

    bonusCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      paddingHorizontal: 14,
    },
    bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    bonusRowBorder: { borderTopWidth: 1, borderTopColor: c.cardBorder },
    bonusName: { flex: 1, fontSize: 13.5, color: c.text, lineHeight: 18 },
    bonusPercent: { fontSize: 14, fontWeight: '800', color: c.primary, minWidth: 48, textAlign: 'right' },
    bonusAmount: { fontSize: 13, color: c.textMuted, minWidth: 40, textAlign: 'right' },
  });
