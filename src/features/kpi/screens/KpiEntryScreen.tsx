import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import { confirm } from '@/lib/confirm';
import { isHR, isSiteMasterAdmin } from '@/utils/roles';
import type { KpiTask } from '@/types';
import { kpiEntryQuery, entryBonusesQuery } from '../api/queries';
import {
  useAddKpiTask, useUpdateKpiTask, useSubmitKpiTask, useDeleteKpiTask, useReviewKpiTask,
} from '../api/mutations';
import {
  isEntryLocked, canAddTask, canActOnTask, canReviewEntry, canReviewTask,
  taskStatusKey, confirmedTaskSum, entryResultDisplay, parseScore,
} from '../utils';

// KPI entry detail (web EntryTasksPage): indicator summary + the task list +
// read-only bonuses. The OWNER adds/edits/submits/deletes DRAFT tasks while the
// entry is unlocked; the SUPERVISOR (entry.employee.supervisor_id) or HR/
// master-admin reviews SUBMITTED tasks — confirm with a score or reject with a
// note. canReview is derived from data (the backend's own rule), so it also
// holds when arriving via a push deep link.
export default function KpiEntryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: entry, isLoading, isError, refetch, isFetching } = useQuery(kpiEntryQuery(entryId));
  const { data: bonuses = [] } = useQuery(entryBonusesQuery(entryId));

  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  // Supervisor review panel: confirm (score) or reject (note) for one task.
  const [reviewing, setReviewing] = useState<
    { id: number; mode: 'confirm'; score: string } | { id: number; mode: 'reject'; note: string } | null
  >(null);

  const addTask = useAddKpiTask(entryId);
  const updateTask = useUpdateKpiTask();
  const submitTask = useSubmitKpiTask();
  const deleteTask = useDeleteKpiTask();
  const reviewTask = useReviewKpiTask();

  const isOwner = !!user?.employee?.id && user.employee.id === entry?.employee_id;
  const locked = entry ? isEntryLocked(entry) : true;
  // isSiteMasterAdmin (NOT isMasterAdmin): the backend grants KPI review only
  // to the account type — isMasterAdmin includes ministr, whose review the
  // backend would 403 (web uses isSiteMasterAdmin for exactly this reason).
  const canReview = entry
    ? canReviewEntry(entry, {
        myEmployeeId: user?.employee?.id,
        isManager: isHR(user) || isSiteMasterAdmin(user),
      })
    : false;
  const tasks = entry?.tasks ?? [];
  const confirmedSum = confirmedTaskSum(tasks);
  const maxPercent = entry?.indicator?.max_percent;

  const onAdd = () => {
    const name = newName.trim();
    if (!name || addTask.isPending) return;
    addTask.mutate(name, { onSuccess: () => setNewName('') });
  };

  const onSaveEdit = () => {
    const name = editing?.name.trim();
    if (!editing || !name || updateTask.isPending) return;
    updateTask.mutate({ id: editing.id, name }, { onSuccess: () => setEditing(null) });
  };

  const onSubmitTask = async (task: KpiTask) => {
    const ok = await confirm({
      title: t('kpi.submitConfirmTitle'),
      message: t('kpi.submitConfirmMessage'),
      confirmLabel: t('kpi.submitAction'),
      cancelLabel: t('common.cancel'),
      icon: 'check',
    });
    if (ok) submitTask.mutate(task.id);
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

  // Supervisor: confirm carries the score; reject carries the note (web parity).
  // A null parseScore (garbage/negative input) blocks the submit — a confirmed
  // task cannot be re-reviewed, so a silent score-0 confirm is unacceptable.
  const reviewScore = reviewing?.mode === 'confirm' ? parseScore(reviewing.score) : 0;
  const onReview = () => {
    if (!reviewing || reviewTask.isPending) return;
    if (reviewing.mode === 'confirm' && reviewScore == null) return;
    const payload =
      reviewing.mode === 'confirm'
        ? { id: reviewing.id, action: 'confirm' as const, score: reviewScore ?? 0 }
        : { id: reviewing.id, action: 'reject' as const, review_note: reviewing.note };
    reviewTask.mutate(payload, { onSuccess: () => setReviewing(null) });
  };

  const taskStatusStyle = (key: ReturnType<typeof taskStatusKey>) =>
    key === 'confirmed'
      ? { backgroundColor: colors.successSoft, color: colors.success }
      : key === 'submitted'
        ? { backgroundColor: colors.primarySoft, color: colors.primary }
        : key === 'rejected'
          ? { backgroundColor: colors.errorSoft, color: colors.error }
          : { backgroundColor: colors.skeleton, color: colors.textSecondary };

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
                <Text style={styles.confirmedLabel}>{t('kpi.confirmedSum')}</Text>
                <Text style={styles.confirmedValue}>
                  {confirmedSum}%{maxPercent != null ? `  /  max ${Number(maxPercent)}%` : ''}
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

              {canAddTask(entry, isOwner) && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder={t('kpi.addTaskPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                    onSubmitEditing={onAdd}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.addBtn, (!newName.trim() || addTask.isPending) && { opacity: 0.5 }]}
                    onPress={onAdd}
                    disabled={!newName.trim() || addTask.isPending}
                    activeOpacity={0.85}
                  >
                    <Icon name="plus" size={20} color={colors.onPrimary} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>
              )}

              {tasks.length === 0 ? (
                <EmptyState icon="checklist" title={t('kpi.emptyTasks')} />
              ) : (
                tasks.map((task) => {
                  const st = taskStatusKey(task.status);
                  const stStyle = taskStatusStyle(st);
                  const actable = canActOnTask(task, { isOwner, entryLocked: locked });
                  const isEditing = editing?.id === task.id;
                  return (
                    <View key={task.id} style={styles.taskCard}>
                      {isEditing ? (
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
                        {/* Score is filled only after the supervisor confirms */}
                        <Text style={styles.taskScore}>
                          {task.score != null ? `${Number(task.score)}%` : '—'}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: stStyle.backgroundColor }]}>
                          <Text style={[styles.statusPillText, { color: stStyle.color }]}>
                            {t(`kpi.task${st.charAt(0).toUpperCase()}${st.slice(1)}`)}
                          </Text>
                        </View>

                        {actable && (
                          <View style={styles.taskActions}>
                            {isEditing ? (
                              <TaskAction icon="check" color={colors.success} onPress={onSaveEdit} styles={styles} />
                            ) : (
                              <TaskAction icon="edit" color={colors.textSecondary} onPress={() => setEditing({ id: task.id, name: task.name ?? '' })} styles={styles} />
                            )}
                            <TaskAction icon="arrowUp" color={colors.primary} onPress={() => onSubmitTask(task)} styles={styles} />
                            <TaskAction icon="trash" color={colors.error} onPress={() => onDeleteTask(task)} styles={styles} />
                          </View>
                        )}

                        {/* Supervisor: score is entered HERE, on confirm (web parity) */}
                        {canReviewTask(task, { canReview, entryLocked: locked }) && (
                          <View style={styles.taskActions}>
                            <TouchableOpacity
                              style={[styles.reviewBtn, { backgroundColor: colors.successSoft }]}
                              onPress={() => setReviewing({ id: task.id, mode: 'confirm', score: '' })}
                              activeOpacity={0.8}
                            >
                              <Icon name="check" size={14} color={colors.success} />
                              <Text style={[styles.reviewBtnText, { color: colors.success }]}>{t('kpi.reviewConfirm')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.reviewBtn, { backgroundColor: colors.errorSoft }]}
                              onPress={() => setReviewing({ id: task.id, mode: 'reject', note: '' })}
                              activeOpacity={0.8}
                            >
                              <Icon name="close" size={14} color={colors.error} />
                              <Text style={[styles.reviewBtnText, { color: colors.error }]}>{t('kpi.reviewReject')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {st === 'rejected' && !!task.review_note && (
                        <Text style={styles.rejectNote}>{t('kpi.rejectNote')}: {task.review_note}</Text>
                      )}

                      {/* Inline review panel for the picked task. Re-gated on
                          canReviewTask so a background refetch that flips the
                          task/entry state (co-reviewer acted, period locked)
                          drops the stale panel instead of submitting into a 400. */}
                      {reviewing?.id === task.id &&
                        canReviewTask(task, { canReview, entryLocked: locked }) && (
                        <View style={styles.reviewPanel}>
                          <Text style={styles.fieldLabel}>
                            {reviewing.mode === 'confirm' ? t('kpi.reviewScoreLabel') : t('kpi.reviewNoteLabel')}
                          </Text>
                          {reviewing.mode === 'confirm' ? (
                            <TextInput
                              style={styles.reviewInput}
                              keyboardType="numeric"
                              autoFocus
                              value={reviewing.score}
                              onChangeText={(score) => setReviewing({ id: task.id, mode: 'confirm', score })}
                            />
                          ) : (
                            <TextInput
                              style={styles.reviewInput}
                              autoFocus
                              value={reviewing.note}
                              onChangeText={(note) => setReviewing({ id: task.id, mode: 'reject', note })}
                            />
                          )}
                          <View style={styles.reviewPanelActions}>
                            <TouchableOpacity
                              style={[
                                styles.reviewActionBtn,
                                { backgroundColor: reviewing.mode === 'confirm' ? colors.success : colors.error },
                                (reviewTask.isPending || (reviewing.mode === 'confirm' && reviewScore == null)) && { opacity: 0.5 },
                              ]}
                              onPress={onReview}
                              disabled={reviewTask.isPending || (reviewing.mode === 'confirm' && reviewScore == null)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.reviewActionText}>
                                {reviewing.mode === 'confirm' ? t('kpi.reviewConfirmAction') : t('kpi.reviewRejectAction')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.reviewCancelBtn}
                              onPress={() => setReviewing(null)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.reviewCancelText}>{t('common.cancel')}</Text>
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

    addRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    addInput: {
      flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder,
      fontSize: 14, color: c.text,
    },
    addBtn: {
      width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary,
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
    statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    taskActions: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
    taskActionBtn: {
      width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    rejectNote: { fontSize: 12, color: c.error, marginTop: 8, lineHeight: 17 },

    reviewBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9,
    },
    reviewBtnText: { fontSize: 12, fontWeight: '700' },
    reviewPanel: {
      marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.cardBorder, gap: 8,
    },
    reviewInput: {
      backgroundColor: c.bg, borderRadius: 10, borderWidth: 1, borderColor: c.primary,
      paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: c.text,
    },
    reviewPanelActions: { flexDirection: 'row', gap: 8 },
    reviewActionBtn: {
      flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    reviewActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    reviewCancelBtn: {
      paddingHorizontal: 16, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    reviewCancelText: { color: c.textSecondary, fontWeight: '600', fontSize: 14 },

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
