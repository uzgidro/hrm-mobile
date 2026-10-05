// Yillik yakuniy sog'liq indeksi (v2 `AnnualIndexModal`) — sihatgoh rahbari (bosh shifokor)
// qo'yadi; shu yilniki bo'lsa server almashtiradi. Tafsilot varag'i ichida ko'rsatiladi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Button, Chip, Text } from '@/ui';
import { useSetAnnualIndex } from '../api/mutations';
import {
  HEALTH_INDEXES,
  buildIndexBody,
  indexTone,
  initialIndexForm,
  validateIndex,
  type IndexForm,
} from '../utils/medical';

export function AnnualIndexForm({ employeeId, onDone }: { employeeId: number; onDone: () => void }) {
  const { t } = useTranslation();
  const now = dayjs().year();
  const [form, setForm] = useState<IndexForm>(() => initialIndexForm(now));
  const [error, setError] = useState<string | null>(null);
  const mutation = useSetAnnualIndex();

  const set = (p: Partial<IndexForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const save = async () => {
    const err = validateIndex(form, now);
    if (err) return setError(t(`medical.${err}`));
    try {
      await mutation.mutateAsync(buildIndexBody(employeeId, form));
      toast.success(t('medical.indexSaved'));
      onDone();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form}>
      <Text variant="heading">{t('medical.setIndex')}</Text>
      <FormInput
        testID="medical-index-year"
        label={t('medical.year')}
        required
        value={form.year}
        onChangeText={(v) => set({ year: v })}
        keyboardType="number-pad"
      />
      <Text variant="label" tone="muted">
        {`${t('medical.colIndex')} *`}
      </Text>
      <View style={styles.chips}>
        {HEALTH_INDEXES.map((k) => (
          <Chip
            key={k}
            testID={`medical-index-${k}`}
            label={t(`medical.index_${k}`)}
            tone={indexTone(k)}
            selected={form.index === k}
            onPress={() => set({ index: k })}
          />
        ))}
      </View>
      <FormInput
        testID="medical-index-note"
        label={t('medical.note')}
        value={form.note}
        onChangeText={(v) => set({ note: v })}
        multiline
      />
      {!!error && (
        <Text variant="label" tone="danger">
          {error}
        </Text>
      )}
      <Button testID="medical-index-save" label={t('common.save')} onPress={save} loading={mutation.isPending} full />
      <Button label={t('common.cancel')} variant="ghost" full onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
