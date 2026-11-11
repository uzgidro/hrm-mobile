// The doctor's record form (new or own-record edit): date, conclusion, recommendation,
// repeatable diagnoses (optional free-text code + required name), fitness and — only for a doctor
// with several specialties — the specialty. File attachments are web-only.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Button, Chip, SelectField, Text } from '@/ui';
import { useCreateCheckup, useUpdateCheckup } from '../api/mutations';
import {
  buildCreateBody,
  buildUpdateBody,
  initialDraft,
  validateDraft,
  type CheckupDraft,
  type CheckupError,
} from '../utils/checkupForm';
import { MAX_DIAGNOSES, MAX_DIAGNOSIS_CODE } from '../utils/icd';
import { FITNESS_VALUES, fitnessTone, fmtDate, type ExamCheckup } from '../utils/medicalExam';

export function RecordForm({
  employeeId,
  checkup,
  onDone,
}: {
  employeeId: number;
  /** null — a new record. */
  checkup: ExamCheckup | null;
  onDone: (saved: boolean) => void;
}) {
  const { t } = useTranslation();
  const specialties = useAuthStore((s) => s.user?.medical_specialties) ?? [];
  const needsSpecialty = specialties.length > 1;
  const [draft, setDraft] = useState<CheckupDraft>(() => initialDraft(checkup, dayjs().format('YYYY-MM-DD')));
  const [invalid, setInvalid] = useState<CheckupError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const create = useCreateCheckup();
  const update = useUpdateCheckup();

  const set = (p: Partial<CheckupDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setInvalid(null);
    setServerError(null);
  };
  const setDiagnosis = (i: number, p: Partial<CheckupDraft['diagnoses'][number]>) =>
    set({ diagnoses: draft.diagnoses.map((d, k) => (k === i ? { ...d, ...p } : d)) });

  const save = async () => {
    const err = validateDraft(draft, needsSpecialty);
    if (err) return setInvalid(err);
    try {
      if (checkup) await update.mutateAsync({ id: checkup.id, body: buildUpdateBody(draft, needsSpecialty) });
      else await create.mutateAsync(buildCreateBody(employeeId, draft, needsSpecialty));
      toast.success(t('medicalExam.record.saved'));
      onDone(true);
    } catch (e) {
      setServerError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  // A string is a form-level problem; an object points at one diagnosis row.
  const errorText = serverError ?? (typeof invalid === 'string' ? t(`medicalExam.record.error.${invalid}`) : null);
  const diagError = invalid && typeof invalid === 'object' ? invalid : null;

  return (
    <View style={styles.form} testID="record-form">
      <Text variant="heading">{checkup ? t('medicalExam.record.editTitle') : t('medicalExam.record.newTitle')}</Text>
      <SelectField
        testID="record-date"
        label={`${t('medicalExam.record.date')} *`}
        value={fmtDate(draft.date)}
        icon="calendar"
        onPress={() => setDateOpen(true)}
      />
      {needsSpecialty && (
        <View style={styles.block}>
          <Text variant="label" tone="muted">{`${t('medicalExam.record.specialty')} *`}</Text>
          <View style={styles.chips}>
            {specialties.map((s) => (
              <Chip
                key={s.id}
                testID={`record-specialty-${s.id}`}
                label={s.name || `#${s.id}`}
                selected={draft.specialtyId === s.id}
                onPress={() => set({ specialtyId: s.id })}
              />
            ))}
          </View>
        </View>
      )}
      <FormInput
        testID="record-conclusion"
        label={t('medicalExam.record.conclusion')}
        value={draft.conclusion}
        onChangeText={(v) => set({ conclusion: v })}
        multiline
      />
      <FormInput
        testID="record-recommendation"
        label={t('medicalExam.record.recommendation')}
        value={draft.recommendation}
        onChangeText={(v) => set({ recommendation: v })}
        multiline
      />

      <View style={styles.block}>
        <Text variant="label" tone="muted">
          {t('medicalExam.record.diagnoses')}
        </Text>
        {draft.diagnoses.map((d, i) => (
          <View key={i} style={styles.diagnosis} testID={`diagnosis-${i}`}>
            <FormInput
              testID={`diagnosis-${i}-code`}
              label={t('medicalExam.record.icdCode')}
              value={d.code}
              onChangeText={(v) => setDiagnosis(i, { code: v.slice(0, MAX_DIAGNOSIS_CODE) })}
              placeholder="K29.7"
            />
            <FormInput
              testID={`diagnosis-${i}-name`}
              label={`${t('medicalExam.record.diagnosisName')} *`}
              value={d.name}
              onChangeText={(v) => setDiagnosis(i, { name: v })}
              error={
                diagError?.diagnosis === i
                  ? t(`medicalExam.record.error.${diagError.error}`)
                  : undefined
              }
            />
            <Button
              label={t('medicalExam.record.removeDiagnosis')}
              variant="dangerGhost"
              size="sm"
              onPress={() => set({ diagnoses: draft.diagnoses.filter((_, k) => k !== i) })}
              testID={`diagnosis-${i}-remove`}
            />
          </View>
        ))}
        {draft.diagnoses.length < MAX_DIAGNOSES && (
          <Button
            label={t('medicalExam.record.addDiagnosis')}
            variant="link"
            icon="plus"
            onPress={() => set({ diagnoses: [...draft.diagnoses, { code: '', name: '' }] })}
            testID="diagnosis-add"
          />
        )}
      </View>

      <View style={styles.block}>
        <Text variant="label" tone="muted">
          {t('medicalExam.record.fitness')}
        </Text>
        <View style={styles.chips}>
          {FITNESS_VALUES.map((f) => (
            <Chip
              key={f}
              testID={`record-fitness-${f}`}
              label={t(`medicalExam.fitness.${f}`)}
              tone={fitnessTone(f)}
              tintSelected
              selected={draft.fitness === f}
              // Tapping the chosen value again clears it (the opinion is optional).
              onPress={() => set({ fitness: draft.fitness === f ? null : f })}
            />
          ))}
        </View>
      </View>

      {!!errorText && (
        <Text variant="label" tone="danger" testID="record-error">
          {errorText}
        </Text>
      )}
      <Button
        testID="record-save"
        label={t('common.save')}
        onPress={save}
        loading={create.isPending || update.isPending}
        full
      />
      <Button label={t('common.cancel')} variant="ghost" full onPress={() => onDone(false)} />
      {dateOpen && (
        <DatePickerModal
          visible
          value={draft.date}
          title={t('medicalExam.record.date')}
          onConfirm={(d) => set({ date: d })}
          onClose={() => setDateOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  block: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  diagnosis: { gap: 4 },
});
