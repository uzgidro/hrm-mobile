// Reja tafsiloti. Yozish huquqi bo'lsa: «Bajarildi» (PATCH {status:'done'}),
// tahrirlash, o'chirish (tasdiq bilan).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { Badge, Button, Sheet, Text, type Tone } from '@/ui';
import type { WorkPlan } from '../api/queries';
import { useDeleteWorkPlan, useSaveWorkPlan } from '../api/mutations';
import { isPlanOverdue } from '../utils/workPlan';

export const STATUS_TONE: Record<string, Tone> = {
  planned: 'neutral',
  in_progress: 'info',
  done: 'success',
  cancelled: 'neutral',
};

const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text variant="caption" tone="subtle" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.kvValue}>
        {value}
      </Text>
    </View>
  );
}

export function WorkPlanDetailSheet({
  plan,
  canWrite,
  onClose,
  onEdit,
}: {
  plan: WorkPlan;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveWorkPlan();
  const remove = useDeleteWorkPlan();
  const today = dayjs().format('YYYY-MM-DD');
  const overdue = isPlanOverdue(plan, today);
  const status = plan.status ?? 'planned';

  const run = async (p: Promise<unknown>, okKey: string) => {
    try {
      await p;
      toast.success(t(okKey));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const doDelete = async () => {
    const ok = await confirm({
      title: t('workPlan.deleteTitle'),
      message: t('workPlan.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) await run(remove.mutateAsync(plan.id), 'workPlan.deleted');
  };

  return (
    <Sheet visible onClose={onClose} title={plan.title ?? '—'}>
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge
            label={t(`workPlan.status_${status}`, { defaultValue: status })}
            tone={STATUS_TONE[status] ?? 'neutral'}
          />
          {overdue && <Badge label={t('workPlan.overdue')} tone="danger" />}
        </View>
        {!!plan.description && <Text variant="body">{plan.description}</Text>}
        <Row label={t('workPlan.colEmployee')} value={plan.employee_name ?? '—'} />
        <Row label={t('workPlan.colDepartment')} value={plan.department_name ?? '—'} />
        <Row
          label={t('workPlan.colPeriod')}
          value={
            plan.period_type
              ? t(`workPlan.period_${plan.period_type}`, { defaultValue: plan.period_label ?? plan.period_type })
              : (plan.period_label ?? '—')
          }
        />
        <Row label={t('workPlan.colDates')} value={`${fmt(plan.start_date)} – ${fmt(plan.end_date)}`} />
        {!!plan.planned_result && <Row label={t('workPlan.colResult')} value={plan.planned_result} />}
        {!!plan.kpi_indicator_name && <Row label={t('workPlan.kpiIndicator')} value={plan.kpi_indicator_name} />}
        {plan.weight != null && <Row label={t('workPlan.colWeight')} value={String(plan.weight)} />}
        {canWrite && (
          <View style={styles.actions}>
            {status !== 'done' && (
              <Button
                testID="workplan-done"
                label={t('workPlan.markDone')}
                full
                loading={save.isPending}
                onPress={() =>
                  void run(save.mutateAsync({ id: plan.id, body: { status: 'done' } }), 'workPlan.markedDone')
                }
              />
            )}
            <Button testID="workplan-edit" label={t('common.edit')} variant="soft" full onPress={onEdit} />
            <Button
              testID="workplan-delete"
              label={t('common.delete')}
              variant="ghost"
              full
              loading={remove.isPending}
              onPress={() => void doDelete()}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  kv: { flexDirection: 'row', gap: 12 },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
  actions: { gap: 8, marginTop: 6 },
});
