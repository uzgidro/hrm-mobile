// Yozuv qo'shish / tahrirlash (v2 `DictionaryEntryModal`): nom (majburiy), ruscha nom, kod (bo'sh bo'lsa
// server nomdan yasaydi), tegishli yozuv (faqat ierarxik ma'lumotnomada — ota ma'lumotnomaning faol
// yozuvlaridan), izoh, tartib, faollik. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import type { DictionaryType } from '@/utils/dictionaries';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useSaveEntry } from '../api/mutations';
import { buildEntryBody, seedEntryForm, type DictionaryEntry, type EntryForm } from '../utils/dictionaries';

const NONE = -1;

export function EntryFormSheet({
  type,
  entry,
  parents,
  onClose,
}: {
  type: DictionaryType;
  entry: DictionaryEntry | null;
  parents: DictionaryEntry[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [form, setForm] = useState<EntryForm>(() => seedEntryForm(entry));
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const save = useSaveEntry();
  const parentName =
    form.parentId == null
      ? ''
      : (parents.find((p) => p.id === form.parentId)?.name ?? entry?.parent_name ?? `#${form.parentId}`);

  const set = (p: Partial<EntryForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildEntryBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ code: type.code, id: entry?.id ?? null, body: r.body });
      toast.success(entry ? t('dictionaries.saved') : t('dictionaries.created'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('dictionaries.saveFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={entry ? t('dictionaries.editEntry') : t('dictionaries.newEntry')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="caption" tone="subtle">
          {type.name || type.code}
        </Text>
        <FormInput
          testID="dict-form-name"
          label={t('dictionaries.colName')}
          value={form.name}
          onChangeText={(v) => set({ name: v })}
          placeholder={t('dictionaries.namePlaceholder')}
          required
        />
        <FormInput
          testID="dict-form-name-ru"
          label={t('dictionaries.colNameRu')}
          value={form.nameRu}
          onChangeText={(v) => set({ nameRu: v })}
        />
        <FormInput
          testID="dict-form-code"
          label={t('dictionaries.colCode')}
          value={form.code}
          onChangeText={(v) => set({ code: v })}
          placeholder={entry ? '' : t('dictionaries.codeAuto')}
        />
        <Text variant="caption" tone="subtle">
          {t('dictionaries.codeHint')}
        </Text>
        {!!type.is_hierarchical && (
          <SelectField
            testID="dict-form-parent"
            label={t('dictionaries.colParent')}
            value={parentName}
            placeholder={t('dictionaries.parentPlaceholder')}
            icon="folder"
            onPress={() => setPicking(true)}
          />
        )}
        <FormInput
          testID="dict-form-description"
          label={t('dictionaries.colDescription')}
          value={form.description}
          onChangeText={(v) => set({ description: v })}
          multiline
        />
        <FormInput
          testID="dict-form-sort"
          label={t('dictionaries.colSort')}
          value={form.sortOrder}
          onChangeText={(v) => set({ sortOrder: v })}
          keyboardType="number-pad"
        />
        <View style={styles.toggle}>
          <Text variant="body" style={styles.flex}>
            {t('dictionaries.active')}
          </Text>
          <Switch
            testID="dict-form-active"
            value={form.active}
            onValueChange={(v) => set({ active: v })}
            trackColor={{ false: c.border, true: c.brand }}
            thumbColor={c.surface}
          />
        </View>
        {!!error && (
          <Text variant="label" tone="danger" testID="dict-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="dict-form-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
      {picking && (
        <PickerModal
          visible
          title={t('dictionaries.colParent')}
          options={[
            { value: NONE, label: t('dictionaries.noParent') },
            ...parents.filter((p) => p.id !== entry?.id).map((p) => ({ value: p.id, label: p.name })),
          ]}
          selected={form.parentId ?? NONE}
          onClose={() => setPicking(false)}
          onSelect={(v) => {
            setPicking(false);
            set({ parentId: v === NONE ? null : v });
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  flex: { flex: 1 },
});
