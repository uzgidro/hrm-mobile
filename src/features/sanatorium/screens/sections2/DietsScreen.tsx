// Diet catalog (registrar CRUD): code, trilingual name, description, order, active.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, SearchField, Sheet, Text } from '@/ui';
import { dietsQuery, useDeleteDiet, useSaveDiet, type Diet } from '../../api/sections2';
import { QueryBlock, useSanAccess } from '../../components/common';
import { ErrorLine, SwitchRow } from '../../components/forms';
import { RowTools, SectionScreen, TextTrio, useConfirmDelete, useContentLang } from '../../components/sections2/kit';
import { KitchenDietView } from '../../components/sections2/DietParts';
import { dietBody, emptyDietDraft, pickText, type DietDraft } from '../../utils/sections2';
import { sanErrorMessage } from '../../utils/sanatorium';
import { useSingleFlight } from '../../simple/useSingleFlight';

// The kitchen has no catalog to edit: it opens the day's diet list (the same view as the kitchen's diets tab).
export default function DietsScreen() {
  const { t } = useTranslation();
  const registrar = useSanAccess('registrar');
  if (!registrar) {
    return (
      <SectionScreen title={t('sanatorium.s2.diets')} feature="diet" roles={['kitchen']} testID="san-diets-screen">
        <KitchenDietView />
      </SectionScreen>
    );
  }
  return <DietCatalog />;
}

function DietCatalog() {
  const { t } = useTranslation();
  const lang = useContentLang();
  const q = useQuery(dietsQuery(true));
  const del = useDeleteDiet();
  const confirmDelete = useConfirmDelete();
  const [edit, setEdit] = useState<Diet | 'new' | null>(null);
  const [term, setTerm] = useState('');
  return (
    <SectionScreen title={t('sanatorium.s2.diets')} feature="diet" roles={['registrar']} testID="san-diets-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()} onAdd={() => setEdit('new')} addLabel={t('sanatorium.s2.addDiet')}>
      <SearchField testID="diet-catalog-search" value={term} onChangeText={setTerm} placeholder={t('sanCatalog.diet.search')} />
      <QueryBlock query={q}>
        {(all) => {
          const needle = term.trim().toLowerCase();
          const list = needle ? all.filter((d) => `${d.code} ${d.name_uz} ${d.name_ru ?? ''} ${d.name_en ?? ''}`.toLowerCase().includes(needle)) : all;
          return list.length === 0 ? (
            <EmptyState title={t('sanatorium.s2.noDiets')} />
          ) : (
            <View style={styles.stack}>
              {list.map((x) => (
                <Card key={x.id} testID={`diet-${x.id}`}>
                  <View style={styles.head}>
                    <Badge label={x.code} tone="brand" />
                    <Text variant="heading" style={styles.flex}>{pickText(x as never, 'name', lang)}</Text>
                    {!x.is_active && <Badge label={t('sanatorium.s2.inactive')} tone="warning" />}
                  </View>
                  {!!x.description && <Text variant="caption" tone="muted">{x.description}</Text>}
                  {x.stays_count != null && <Text variant="caption" tone="subtle">{t('sanatorium.s2.staysCount')}: {x.stays_count}</Text>}
                  <RowTools testID={`diet-tools-${x.id}`} onEdit={() => setEdit(x)} onDelete={() => void confirmDelete(t('sanatorium.s2.deleteDiet'), () => del.mutateAsync(x.id))} />
                </Card>
              ))}
            </View>
          );
        }}
      </QueryBlock>
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('sanatorium.s2.addDiet') : t('sanatorium.s2.editDiet')} scroll>
        {edit && <DietForm key={edit === 'new' ? 'new' : edit.id} diet={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </SectionScreen>
  );
}

function DietForm({ diet, onClose }: { diet: Diet | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveDiet();
  const [d, setD] = useState<DietDraft>(() =>
    diet ? { code: diet.code, nameUz: diet.name_uz, nameRu: diet.name_ru ?? '', nameEn: diet.name_en ?? '', description: diet.description ?? '', sort: String(diet.sort_order), active: diet.is_active } : emptyDietDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<DietDraft>) => setD((x) => ({ ...x, ...p }));
  const flight = useSingleFlight();
  const submit = () => flight.run(async () => {
    const r = dietBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: diet?.id, body: r.body });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  });
  return (
    <View testID="diet-form">
      <FormInput label={t('sanatorium.s2.dietCode')} value={d.code} onChangeText={(v) => set({ code: v })} required testID="dt-code" />
      <TextTrio label={t('sanatorium.s2.name')} values={[d.nameUz, d.nameRu, d.nameEn]} onChange={(i, v) => set(i === 0 ? { nameUz: v } : i === 1 ? { nameRu: v } : { nameEn: v })} testID="dt-name" />
      <FormInput label={t('sanatorium.s2.description')} value={d.description} onChangeText={(v) => set({ description: v })} multiline testID="dt-desc" />
      <FormInput label={t('sanatorium.s2.sortOrder')} value={d.sort} onChangeText={(v) => set({ sort: v })} keyboardType="number-pad" testID="dt-sort" />
      <SwitchRow label={t('sanatorium.s2.active')} value={d.active} onChange={(v) => set({ active: v })} testID="dt-active" />
      <ErrorLine message={error} testID="dt-error" />
      <Button testID="dt-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, flex: { flex: 1 }, head: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
