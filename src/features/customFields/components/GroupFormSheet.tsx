// Bo'lim (guruh) qo'shish / tahrirlash (v2 `GroupModal`): nom (majburiy), izoh, faollik. Obyekt turi —
// ekrandagi tanlov, faqat yaratishda yuboriladi. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Button, Sheet, Text } from '@/ui';
import { useSaveGroup } from '../api/mutations';
import { buildGroupBody, seedGroupForm, type CustomFieldGroup, type GroupForm } from '../utils/customFields';
import { ToggleRow } from './CustomFieldsBits';

export function GroupFormSheet({
  row,
  entityType,
  onClose,
}: {
  row: CustomFieldGroup | null;
  entityType: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<GroupForm>(() => seedGroupForm(row));
  const [error, setError] = useState<string | null>(null);
  const save = useSaveGroup();

  const set = (p: Partial<GroupForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildGroupBody(form, !row, entityType);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: r.body });
      toast.success(t('customFields.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('customFields.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={row ? t('customFields.editGroup') : t('customFields.addGroup')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="cf-group-title"
          label={t('customFields.groupTitle')}
          value={form.title}
          onChangeText={(v) => set({ title: v })}
          required
        />
        <FormInput
          testID="cf-group-description"
          label={t('customFields.groupDescription')}
          value={form.description}
          onChangeText={(v) => set({ description: v })}
          multiline
        />
        <ToggleRow
          testID="cf-group-active"
          label={t('customFields.activeLabel')}
          value={form.active}
          onChange={(v) => set({ active: v })}
        />
        {!!error && (
          <Text variant="label" tone="danger" testID="cf-group-error">
            {error}
          </Text>
        )}
        <Button
          testID="cf-group-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
});
