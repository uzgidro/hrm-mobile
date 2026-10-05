// Maydon qo'shish / tahrirlash (v2 `FieldModal`): nom (majburiy), kalit (nomdan yasaladi, yaratilgach
// o'zgarmaydi), tur, variantlar (faqat tanlov turlarida — qatorma-qator), ma'lumotnoma (faqat
// «Ma'lumotnomadan» turida), son chegaralari (faqat son turida), tartib, yordam matni, majburiy /
// ro'yxatda / faol. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { dictionaryTypesQuery } from '@/utils/dictionaries';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';
import { useSaveField } from '../api/mutations';
import {
  FIELD_TYPES,
  buildFieldBody,
  isNumeric,
  needsDictionary,
  needsOptions,
  seedFieldForm,
  withKey,
  withLabel,
  type CustomField,
  type CustomFieldGroup,
  type FieldForm,
} from '../utils/customFields';
import { KeyValue, ToggleRow, useTypeLabels } from './CustomFieldsBits';

export function FieldFormSheet({
  group,
  field,
  onClose,
}: {
  group: CustomFieldGroup;
  field: CustomField | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FieldForm>(() => seedFieldForm(field));
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const save = useSaveField();
  const { meta, typeLabel } = useTypeLabels();
  const dicts = useQuery({ ...dictionaryTypesQuery(), enabled: needsDictionary(form.type) });
  const types = meta.data?.field_types?.map((x) => x.value) ?? FIELD_TYPES;
  const dictName = (code: string) => {
    const d = dicts.data?.find((x) => x.code === code);
    return d ? d.name || d.code : code;
  };

  const update = (next: (f: FieldForm) => FieldForm) => {
    setForm(next);
    setError(null);
  };
  const set = (p: Partial<FieldForm>) => update((f) => ({ ...f, ...p }));

  const submit = async () => {
    const r = buildFieldBody(form, group.id, !field);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: field?.id ?? null, body: r.body });
      toast.success(t('customFields.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('customFields.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={field ? t('customFields.editField') : t('customFields.addField')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="caption" tone="subtle">
          {group.title || `#${group.id}`}
        </Text>
        <FormInput
          testID="cf-field-label"
          label={t('customFields.fieldLabel')}
          value={form.label}
          onChangeText={(v) => update((f) => withLabel(f, v))}
          required
        />
        {field ? (
          <KeyValue label={t('customFields.fieldKey')} value={form.key} testID="cf-field-key-locked" />
        ) : (
          <FormInput
            testID="cf-field-key"
            label={t('customFields.fieldKey')}
            value={form.key}
            onChangeText={(v) => update((f) => withKey(f, v))}
            required
          />
        )}
        <Text variant="caption" tone="subtle">
          {t('customFields.keyHint')}
        </Text>

        <Text variant="label" tone="muted">
          {t('customFields.fieldType')}
        </Text>
        <View style={styles.chips}>
          {types.map((code) => (
            <Chip
              key={code}
              testID={`cf-field-type-${code}`}
              label={typeLabel(code)}
              selected={form.type === code}
              onPress={() => set({ type: code })}
            />
          ))}
        </View>

        {needsOptions(form.type) && (
          <>
            <FormInput
              testID="cf-field-options"
              label={t('customFields.options')}
              value={form.optionsText}
              onChangeText={(v) => set({ optionsText: v })}
              multiline
              required
            />
            <Text variant="caption" tone="subtle">
              {t('customFields.optionsHint')}
            </Text>
          </>
        )}
        {needsDictionary(form.type) && (
          <>
            <SelectField
              testID="cf-field-dictionary"
              label={t('customFields.dictionaryType')}
              value={form.dictType ? dictName(form.dictType) : ''}
              placeholder={t('customFields.pick')}
              icon="doc"
              onPress={() => setPicking(true)}
            />
            <Text variant="caption" tone="subtle">
              {t('customFields.dictionaryTypeHint')}
            </Text>
          </>
        )}
        {isNumeric(form.type) && (
          <View style={styles.pair}>
            <View style={styles.flex}>
              <FormInput
                testID="cf-field-min"
                label={t('customFields.minValue')}
                value={form.minValue}
                onChangeText={(v) => set({ minValue: v })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex}>
              <FormInput
                testID="cf-field-max"
                label={t('customFields.maxValue')}
                value={form.maxValue}
                onChangeText={(v) => set({ maxValue: v })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        )}
        <FormInput
          testID="cf-field-position"
          label={t('customFields.position')}
          value={form.position}
          onChangeText={(v) => set({ position: v })}
          keyboardType="number-pad"
        />
        <Text variant="caption" tone="subtle">
          {t('customFields.positionHint')}
        </Text>
        <FormInput
          testID="cf-field-help"
          label={t('customFields.helpText')}
          value={form.help}
          onChangeText={(v) => set({ help: v })}
        />
        <ToggleRow
          testID="cf-field-required"
          label={t('customFields.requiredLabel')}
          value={form.required}
          onChange={(v) => set({ required: v })}
        />
        <ToggleRow
          testID="cf-field-in-list"
          label={t('customFields.showInListLabel')}
          value={form.showInList}
          onChange={(v) => set({ showInList: v })}
        />
        <ToggleRow
          testID="cf-field-active"
          label={t('customFields.activeLabel')}
          value={form.active}
          onChange={(v) => set({ active: v })}
        />
        {!!error && (
          <Text variant="label" tone="danger" testID="cf-field-error">
            {error}
          </Text>
        )}
        <Button
          testID="cf-field-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
      {picking && (
        <PickerModal
          visible
          title={t('customFields.dictionaryType')}
          options={(dicts.data ?? []).map((d) => ({ value: d.id, label: d.name || d.code, subLabel: d.code }))}
          loading={dicts.isFetching}
          selected={dicts.data?.find((d) => d.code === form.dictType)?.id ?? null}
          onClose={() => setPicking(false)}
          onSelect={(id) => {
            setPicking(false);
            const d = dicts.data?.find((x) => x.id === id);
            if (d) set({ dictType: d.code });
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pair: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
