// Ko'rik yozuvini qo'shish VA tahrirlash (v2 `CheckupModal`) — tafsilot varag'i ichida
// (ikkinchi modal emas). Doktor turi: o'zinikilar (`/auth/me`), bitta bo'lsa tanlash
// chiqmaydi — server o'zi qo'yadi; o'z turi yo'q yozuvchiga (bosh admin) — katalog.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Button, Chip, SelectField, Text } from '@/ui';
import { specialtiesQuery } from '../api/queries';
import { useCreateCheckup, useUpdateCheckup } from '../api/mutations';
import {
  buildCheckupBody,
  fmtDate,
  initialCheckupForm,
  specialtyChoices,
  validateCheckup,
  type Checkup,
  type CheckupForm as Form,
} from '../utils/medical';

export function CheckupForm({
  employeeId,
  checkup,
  onDone,
}: {
  employeeId: number;
  /** null — yangi yozuv. */
  checkup: Checkup | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const mine = useAuthStore((s) => s.user?.medical_specialties);
  const all = useQuery(specialtiesQuery(!mine?.length));
  const choices = specialtyChoices(mine, all.data);
  const needsPick = choices.length > 1;
  const [form, setForm] = useState<Form>(() => initialCheckupForm(checkup, dayjs().format('YYYY-MM-DD')));
  const [error, setError] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const create = useCreateCheckup();
  const update = useUpdateCheckup();
  const isEdit = !!checkup;

  const set = (p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const save = async () => {
    const err = validateCheckup(form, needsPick);
    if (err) return setError(t(`medical.${err}`));
    try {
      const body = buildCheckupBody(form);
      if (checkup) await update.mutateAsync({ id: checkup.id, body });
      else await create.mutateAsync({ employee_id: employeeId, ...body });
      toast.success(t('medical.saved'));
      onDone();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form}>
      <Text variant="heading">{isEdit ? t('medical.editCheckup') : t('medical.addCheckup')}</Text>
      <SelectField
        testID="medical-checkup-date"
        label={`${t('medical.checkupDate')} *`}
        value={form.date ? fmtDate(form.date) : ''}
        icon="calendar"
        onPress={() => setDateOpen(true)}
      />
      {needsPick && (
        <>
          <Text variant="label" tone="muted">
            {`${t('medical.specialty')} *`}
          </Text>
          <View style={styles.chips}>
            {choices.map((s) => (
              <Chip
                key={s.id}
                testID={`medical-specialty-${s.id}`}
                label={s.name}
                selected={form.specialtyId === s.id}
                onPress={() => set({ specialtyId: s.id })}
              />
            ))}
          </View>
        </>
      )}
      <FormInput
        testID="medical-conclusion"
        label={t('medical.conclusion')}
        value={form.conclusion}
        onChangeText={(v) => set({ conclusion: v })}
        multiline
      />
      <FormInput
        testID="medical-recommendation"
        label={t('medical.recommendation')}
        value={form.recommendation}
        onChangeText={(v) => set({ recommendation: v })}
        multiline
      />
      {!!error && (
        <Text variant="label" tone="danger">
          {error}
        </Text>
      )}
      <Button
        testID="medical-checkup-save"
        label={t('common.save')}
        onPress={save}
        loading={create.isPending || update.isPending}
        full
      />
      <Button label={t('common.cancel')} variant="ghost" full onPress={onDone} />
      {dateOpen && (
        <DatePickerModal
          visible
          value={form.date || dayjs().format('YYYY-MM-DD')}
          title={t('medical.checkupDate')}
          onConfirm={(d) => set({ date: d })}
          onClose={() => setDateOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
