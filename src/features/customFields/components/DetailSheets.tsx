// Bo'lim va maydon varaqlari. Bo'lim: izoh, holat, maydonlar soni; «Maydon qo'shish», tahrir, o'chirish
// (tasdiq bilan — ichidagi maydonlar va kiritilgan qiymatlar ham o'chadi). Maydon: kalit, tur, majburiy,
// ro'yxatda, faol, yordam matni, variantlar / ma'lumotnoma / chegaralar, tartib; tahrir va o'chirish faqat
// yozish huquqi bo'lsa (`canManageStructure`).
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { dictionaryTypesQuery } from '@/utils/dictionaries';
import { Button, Sheet } from '@/ui';
import { useDeleteField, useDeleteGroup } from '../api/mutations';
import {
  isNumeric,
  needsDictionary,
  needsOptions,
  type CustomField,
  type CustomFieldGroup,
} from '../utils/customFields';
import { KeyValue, useTypeLabels } from './CustomFieldsBits';

export function GroupSheet({
  group,
  onAddField,
  onEdit,
  onClose,
}: {
  group: CustomFieldGroup;
  onAddField: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteGroup();
  const name = group.title || `#${group.id}`;

  const del = async () => {
    const ok = await confirm({
      title: t('customFields.removeGroupTitle'),
      message: t('customFields.removeGroupConfirm', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(group.id);
      toast.success(t('customFields.deleted'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('customFields.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <KeyValue label={t('customFields.groupDescription')} value={group.description} />
        <KeyValue
          label={t('customFields.status')}
          value={group.is_active === false ? t('customFields.inactive') : t('customFields.activeLabel')}
        />
        <KeyValue label={t('customFields.fieldsCount')} value={String(group.fields?.length ?? 0)} />
        <Button testID="cf-group-add-field" label={t('customFields.addField')} icon="plus" onPress={onAddField} full />
        <Button testID="cf-group-edit" label={t('common.edit')} icon="edit" variant="soft" onPress={onEdit} full />
        <Button
          testID="cf-group-delete"
          label={t('common.delete')}
          icon="trash"
          variant="dangerGhost"
          onPress={() => void del()}
          loading={remove.isPending}
          full
        />
      </ScrollView>
    </Sheet>
  );
}

export function FieldSheet({
  field,
  canWrite,
  onEdit,
  onClose,
}: {
  field: CustomField;
  canWrite: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteField();
  const { typeLabel } = useTypeLabels();
  const type = field.field_type ?? '';
  const dicts = useQuery({ ...dictionaryTypesQuery(), enabled: needsDictionary(type) });
  const name = field.label || field.key || `#${field.id}`;
  const yesNo = (v?: boolean) => (v ? t('customFields.yes') : t('common.no'));
  const dict = dicts.data?.find((d) => d.code === field.dictionary_type_code);

  const del = async () => {
    const ok = await confirm({
      title: t('customFields.removeFieldTitle'),
      message: t('customFields.removeFieldConfirm', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(field.id);
      toast.success(t('customFields.deleted'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('customFields.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <KeyValue label={t('customFields.fieldKey')} value={field.key} testID="cf-field-key" />
        <KeyValue label={t('customFields.fieldType')} value={typeLabel(field.field_type)} testID="cf-field-type" />
        <KeyValue label={t('customFields.requiredLabel')} value={yesNo(field.is_required)} />
        <KeyValue label={t('customFields.showInListLabel')} value={yesNo(field.show_in_list)} />
        <KeyValue label={t('customFields.activeLabel')} value={yesNo(field.is_active !== false)} />
        {needsOptions(type) && (
          <KeyValue
            label={t('customFields.options')}
            value={(field.options ?? []).map((o) => o.label ?? o.value ?? '').join(', ')}
            testID="cf-field-options"
          />
        )}
        {needsDictionary(type) && (
          <KeyValue
            label={t('customFields.dictionaryType')}
            value={dict ? dict.name || dict.code : field.dictionary_type_code}
            testID="cf-field-dictionary"
          />
        )}
        {isNumeric(type) && (
          <>
            <KeyValue label={t('customFields.minValue')} value={field.min_value?.toString()} />
            <KeyValue label={t('customFields.maxValue')} value={field.max_value?.toString()} />
          </>
        )}
        <KeyValue label={t('customFields.position')} value={String(field.position ?? 0)} />
        <KeyValue label={t('customFields.helpText')} value={field.help_text} />
        {canWrite && (
          <>
            <Button testID="cf-field-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
            <Button
              testID="cf-field-delete"
              label={t('common.delete')}
              icon="trash"
              variant="dangerGhost"
              onPress={() => void del()}
              loading={remove.isPending}
              full
            />
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
});
