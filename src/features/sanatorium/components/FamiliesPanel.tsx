// Families: list, create / rename, add a guest as a member (with the relation), remove a member.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Button, Card, EmptyState, ListRow, SearchField, Sheet, Text } from '@/ui';
import { useAddFamilyMember, useRemoveFamilyMember, useSaveFamily } from '../api/mutations';
import { familiesQuery, guestsQuery } from '../api/queries';
import { RELATIONS, type Family } from '../types';
import { sanErrorMessage } from '../utils/sanatorium';
import { QueryBlock } from './common';
import { ChoiceField, ErrorLine, optNull } from './forms';

export function FamiliesPanel() {
  const { t } = useTranslation();
  const q = useQuery(familiesQuery(''));
  const [edit, setEdit] = useState<Family | 'new' | null>(null);
  const [adding, setAdding] = useState<Family | null>(null);
  const remove = useRemoveFamilyMember();
  const drop = async (f: Family, guestId: number, name: string) => {
    const ok = await confirm({ title: t('sanatorium.removeMember'), message: name, confirmLabel: t('sanatorium.remove'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    remove.mutate({ id: f.id, guest_id: guestId }, { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });
  };
  return (
    <View style={styles.stack}>
      <Button testID="family-add" label={t('sanatorium.newFamily')} icon="plus" variant="soft" full onPress={() => setEdit('new')} />
      <QueryBlock query={q}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('sanatorium.noFamilies')} />
          ) : (
            <>
              {items.map((f) => (
                <Card key={f.id} testID={`family-${f.id}`}>
                  <View style={styles.row}>
                    <Text variant="heading" style={styles.flex}>{f.name}</Text>
                    <Button label={t('sanatorium.edit')} variant="soft" size="sm" icon="edit" onPress={() => setEdit(f)} />
                  </View>
                  {!!f.note && <Text variant="caption" tone="muted">{f.note}</Text>}
                  {f.members.map((m) => (
                    <ListRow
                      key={m.id}
                      title={m.full_name}
                      subtitle={[m.relation ? t(`sanatorium.relation.${m.relation}`) : null, m.age != null ? `${m.age} ${t('sanatorium.yearsOld')}` : null].filter(Boolean).join(' · ')}
                      right={<Button label={t('sanatorium.remove')} variant="dangerGhost" size="sm" onPress={() => void drop(f, m.id, m.full_name)} />}
                    />
                  ))}
                  <Button testID="family-add-member" label={t('sanatorium.addMember')} variant="link" size="sm" onPress={() => setAdding(f)} />
                </Card>
              ))}
            </>
          )
        }
      </QueryBlock>
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={t('sanatorium.family')} scroll>
        {edit && <FamilyForm key={edit === 'new' ? 'new' : edit.id} family={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      </Sheet>
      <Sheet visible={!!adding} onClose={() => setAdding(null)} title={t('sanatorium.addMember')} scroll>
        {adding && <MemberForm key={adding.id} family={adding} onClose={() => setAdding(null)} />}
      </Sheet>
    </View>
  );
}

function FamilyForm({ family, onClose }: { family: Family | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveFamily();
  const [name, setName] = useState(family?.name ?? '');
  const [note, setNote] = useState(family?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (name.trim().length < 2) return setError(t('sanatorium.nameShort'));
    try {
      await save.mutateAsync({ id: family?.id, body: { name: name.trim(), note: optNull(note) } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="family-sheet">
      <FormInput label={t('sanatorium.name')} value={name} onChangeText={setName} required testID="family-name" />
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={setNote} multiline />
      <ErrorLine message={error} />
      <Button testID="family-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

function MemberForm({ family, onClose }: { family: Family; onClose: () => void }) {
  const { t } = useTranslation();
  const add = useAddFamilyMember();
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const guests = useQuery({ ...guestsQuery(debounced), enabled: debounced.trim().length >= 2 });
  const [relation, setRelation] = useState<string | null>('other');
  const [error, setError] = useState<string | null>(null);
  const taken = new Set(family.members.map((m) => m.id));
  const pick = async (id: number) => {
    try {
      await add.mutateAsync({ id: family.id, guest_id: id, relation: relation ?? 'other' });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="member-sheet">
      <ChoiceField label={t('sanatorium.relationLabel')} value={relation} options={RELATIONS.map((r) => ({ value: r as string, label: t(`sanatorium.relation.${r}`) }))} onChange={setRelation} />
      <SearchField testID="member-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
      {(guests.data ?? []).filter((g) => !taken.has(g.id)).map((g) => (
        <ListRow key={g.id} testID={`member-${g.id}`} title={g.full_name} subtitle={g.phone ?? undefined} chevron onPress={() => void pick(g.id)} />
      ))}
      <ErrorLine message={error} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, flex: { flex: 1 }, form: { gap: 4, paddingBottom: 8 } });
