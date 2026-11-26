// Adds one guest to a family: pick an existing one OR create a new family on the spot, plus the relation.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet, Text } from '@/ui';
import { useAddFamilyMember, useSaveFamily } from '../api/mutations';
import { familiesQuery } from '../api/queries';
import { RELATIONS } from '../types';
import { LIMITS, clip } from '../utils/guests';
import { sanErrorMessage } from '../utils/sanatorium';
import { ChoiceField, ErrorLine } from './forms';

export function AddToFamilySheet({ guest, onClose }: { guest: { id: number; full_name: string } | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!guest} onClose={onClose} title={t('sanGuests.addToFamily')} scroll>
      {guest && <Form key={guest.id} guest={guest} onClose={onClose} />}
    </Sheet>
  );
}

function Form({ guest, onClose }: { guest: { id: number; full_name: string }; onClose: () => void }) {
  const { t } = useTranslation();
  const families = useQuery(familiesQuery(''));
  const add = useAddFamilyMember();
  const saveFamily = useSaveFamily();
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [relation, setRelation] = useState<string | null>('other');
  const [error, setError] = useState<string | null>(null);
  const busy = add.isPending || saveFamily.isPending;
  const submit = async () => {
    if (!familyId && newName.trim().length < 2) return setError(t('sanatorium.nameShort'));
    setError(null);
    try {
      let id = familyId;
      if (!id) {
        const fam = (await saveFamily.mutateAsync({ body: { name: newName.trim() } })) as { id: number };
        id = fam.id;
      }
      await add.mutateAsync({ id, guest_id: guest.id, relation: relation ?? 'other' });
      toast.success(t('sanGuests.familyAdded'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="add-family-sheet">
      <Text variant="body" weight="600">{guest.full_name}</Text>
      <ChoiceField
        label={t('sanGuests.existingFamily')}
        value={familyId}
        noneLabel={t('sanGuests.chooseOrNew')}
        options={(families.data ?? []).map((f) => ({ value: f.id, label: f.name, sub: `${f.members.length} ${t('sanatorium.members')}` }))}
        onChange={setFamilyId}
        loading={families.isPending}
        testID="af-family"
      />
      {!familyId && (
        <>
          <FormInput label={t('sanGuests.newFamilyName')} value={newName} onChangeText={(v) => setNewName(clip(v, LIMITS.family))} testID="af-new-name" />
          <Text variant="caption" tone="muted">{t('sanGuests.newFamilyHint')}</Text>
        </>
      )}
      <ChoiceField
        label={t('sanatorium.relationLabel')}
        value={relation}
        options={RELATIONS.map((r) => ({ value: r as string, label: t(`sanatorium.relation.${r}`) }))}
        onChange={setRelation}
        testID="af-relation"
      />
      <ErrorLine message={error} testID="af-error" />
      <Button testID="af-save" label={t('common.save')} full loading={busy} disabled={!familyId && newName.trim().length < 2} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 4, paddingBottom: 8 } });
