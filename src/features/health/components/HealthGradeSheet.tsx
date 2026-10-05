// Bitta xodimni baholash (v2 qator ichidagi forma): holat, izoh, «qaysi kungacha».
// Qayta saqlash eski bahoni almashtiradi; o'chirish — bahoni butunlay olib tashlash
// (tasdiq bilan). Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Button, Chip, IconButton, SelectField, Sheet, Text } from '@/ui';
import { useGradeHealth, useRemoveHealthCheck } from '../api/mutations';
import {
  HEALTH_STATUSES,
  STATUS_TONE,
  buildGradeBody,
  initialGradeForm,
  validateGrade,
  type GradeForm,
  type HealthRosterRow,
} from '../utils/health';

const fmt = (d: string) => (d ? dayjs(d).format('DD.MM.YYYY') : '');

export function HealthGradeSheet({ row, day, onClose }: { row: HealthRosterRow; day: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<GradeForm>(() => initialGradeForm(row, day));
  const [error, setError] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const grade = useGradeHealth();
  const remove = useRemoveHealthCheck();

  const set = (p: Partial<GradeForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const save = async () => {
    const err = validateGrade(form, day);
    if (err) return setError(t(`health.${err}`));
    try {
      await grade.mutateAsync(buildGradeBody(form, day));
      toast.success(t(form.hadStatus ? 'health.gradeChanged' : 'health.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const doRemove = async () => {
    if (form.checkId == null) return;
    const ok = await confirm({
      title: t('health.removeTitle'),
      message: t('health.removeConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(form.checkId);
      toast.success(t('health.gradeRemoved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={row.legal_name || '—'}>
      <View style={styles.form}>
        {!!row.position && (
          <Text variant="caption" tone="subtle">
            {row.position}
          </Text>
        )}
        <Text variant="label" tone="muted">
          {t('health.status')}
        </Text>
        <View style={styles.chips}>
          {HEALTH_STATUSES.map((s) => (
            <Chip
              key={s}
              testID={`health-grade-${s}`}
              label={t(`health.status_${s}`)}
              tone={STATUS_TONE[s]}
              selected={form.status === s}
              onPress={() => set({ status: s })}
            />
          ))}
        </View>
        <FormInput
          testID="health-note"
          label={t('health.note')}
          value={form.note}
          onChangeText={(v) => set({ note: v })}
          placeholder={t('health.notePlaceholder')}
        />
        {/* «Qachon bo'ldi» emas, «qachongacha amal qiladi» — shuning uchun yorliq bilan (v2). */}
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              testID="health-until"
              label={t('health.until')}
              value={fmt(form.dateTo)}
              placeholder={fmt(day)}
              icon="calendar"
              onPress={() => setDateOpen(true)}
            />
          </View>
          {!!form.dateTo && (
            <IconButton
              testID="health-until-clear"
              icon="close"
              accessibilityLabel={t('health.clearUntil')}
              onPress={() => set({ dateTo: '' })}
            />
          )}
        </View>
        <Text variant="caption" tone="subtle">
          {form.hadStatus ? `${t('health.replaceHint')} ` : ''}
          {t('health.untilHint', { date: fmt(day) })}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button testID="health-save" label={t('common.save')} onPress={save} loading={grade.isPending} full size="lg" />
        {form.checkId != null && (
          <Button
            testID="health-remove"
            label={t('common.delete')}
            icon="trash"
            variant="ghost"
            onPress={doRemove}
            loading={remove.isPending}
            full
          />
        )}
      </View>
      {dateOpen && (
        <DatePickerModal
          visible
          value={form.dateTo || day}
          title={t('health.until')}
          onConfirm={(d) => set({ dateTo: d })}
          onClose={() => setDateOpen(false)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  flex: { flex: 1 },
});
