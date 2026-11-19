// Packages («putyovka»): registrar CRUD — trilingual texts, nights, price, per person / per room,
// guest types, included items, child discount, active flag, photo; reorder; delete (or deactivate).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, Sheet, Text } from '@/ui';
import {
  packagesQuery, servicesQuery, useDeletePackage, useDeletePackagePhoto, useReorderPackages, useSavePackage, useUploadPackagePhoto,
  type SanPackage,
} from '../../api/sections2';
import { QueryBlock } from '../../components/common';
import { ChoiceField, ErrorLine, SwitchRow } from '../../components/forms';
import {
  ChipWrap, FieldLabel, PhotoField, RowTools, SectionScreen, TextTrio, emptyPhoto, useConfirmDelete, useContentLang, type PhotoValue,
} from '../../components/sections2/kit';
import { GUEST_TYPES } from '../../types';
import { emptyPackageDraft, packageBody, pickText, reorderIds, toggleValue, type PackageDraft } from '../../utils/sections2';
import { fmtMoney, sanErrorMessage } from '../../utils/sanatorium';
import { useSanFeatures } from '../../utils/features';

export default function PackagesScreen() {
  const { t } = useTranslation();
  const lang = useContentLang();
  const q = useQuery(packagesQuery(true));
  const reorder = useReorderPackages();
  const del = useDeletePackage();
  const confirmDelete = useConfirmDelete();
  const [edit, setEdit] = useState<SanPackage | 'new' | null>(null);
  const ids = (q.data ?? []).map((p) => p.id);
  const move = (id: number, d: number) => reorder.mutate(reorderIds(ids, id, d), { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });

  return (
    <SectionScreen title={t('sanatorium.s2.packages')} feature="packages" roles={['registrar']} testID="san-packages-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()} onAdd={() => setEdit('new')} addLabel={t('sanatorium.s2.addPackage')}>
      <QueryBlock query={q}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('sanatorium.s2.noPackages')} />
          ) : (
            <View style={styles.stack}>
              {list.map((p, i) => (
                <Card key={p.id} testID={`package-${p.id}`}>
                  <View style={styles.head}>
                    {p.photo ? <Image source={{ uri: p.photo.thumb_url }} style={styles.thumb} contentFit="cover" /> : null}
                    <View style={styles.flex}>
                      <Text variant="heading">{pickText(p as never, 'name', lang)}</Text>
                      <Text variant="caption" tone="muted">
                        {p.nights} {t('sanatorium.s2.nightsShort')} · {fmtMoney(p.price)} · {t(`sanatorium.s2.mode.${p.price_mode}`)}
                      </Text>
                    </View>
                    {!p.is_active && <Badge label={t('sanatorium.s2.inactive')} tone="warning" />}
                  </View>
                  {p.items.length > 0 && (
                    <Text variant="caption" tone="muted">
                      {p.items.map((it) => `${it.quantity > 1 ? `${it.quantity}× ` : ''}${it.service ? pickText(it.service as never, 'name', lang) : it.text ?? ''}`).join(' · ')}
                    </Text>
                  )}
                  <RowTools
                    testID={`package-tools-${p.id}`}
                    onUp={i > 0 ? () => move(p.id, -1) : null}
                    onDown={i < list.length - 1 ? () => move(p.id, 1) : null}
                    onEdit={() => setEdit(p)}
                    onDelete={() => void confirmDelete(t('sanatorium.s2.deletePackage'), () => del.mutateAsync(p.id))}
                  />
                </Card>
              ))}
            </View>
          )
        }
      </QueryBlock>
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('sanatorium.s2.addPackage') : t('sanatorium.s2.editPackage')} scroll>
        {edit && <PackageForm key={edit === 'new' ? 'new' : edit.id} pkg={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </SectionScreen>
  );
}

function draftOf(p: SanPackage | null): PackageDraft {
  if (!p) return emptyPackageDraft();
  return {
    nameUz: p.name_uz, nameRu: p.name_ru ?? '', nameEn: p.name_en ?? '', descUz: p.description_uz ?? '', descRu: p.description_ru ?? '', descEn: p.description_en ?? '',
    nights: String(p.nights), price: p.price ? String(Number(p.price)) : '', mode: p.price_mode, guestTypes: p.guest_types ?? [],
    items: p.items.map((it) => ({ serviceId: it.service_id, quantity: String(it.quantity), text: it.text ?? '' })),
    childDiscount: p.child_discount, active: p.is_active,
  };
}

function PackageForm({ pkg, onClose }: { pkg: SanPackage | null; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const features = useSanFeatures();
  const save = useSavePackage();
  const upload = useUploadPackagePhoto();
  const delPhoto = useDeletePackagePhoto();
  const services = useQuery(servicesQuery(false, features.on('paid_services')));
  const [d, setD] = useState<PackageDraft>(() => draftOf(pkg));
  const [photo, setPhoto] = useState<PhotoValue>(() => emptyPhoto(pkg?.photo ?? null));
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<PackageDraft>) => setD((x) => ({ ...x, ...p }));
  const { colors: c } = useTheme();

  const submit = async () => {
    const r = packageBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      const saved = await save.mutateAsync({ id: pkg?.id, body: { ...r.body, sort_order: pkg?.sort_order ?? 0 } });
      if (photo.pending) await upload.mutateAsync({ id: saved.id, file: photo.pending });
      else if (photo.remove && pkg?.photo) await delPhoto.mutateAsync(saved.id);
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View testID="package-form">
      <TextTrio label={t('sanatorium.s2.name')} values={[d.nameUz, d.nameRu, d.nameEn]} onChange={(i, v) => set(i === 0 ? { nameUz: v } : i === 1 ? { nameRu: v } : { nameEn: v })} testID="pk-name" />
      <TextTrio label={t('sanatorium.s2.description')} multiline values={[d.descUz, d.descRu, d.descEn]} onChange={(i, v) => set(i === 0 ? { descUz: v } : i === 1 ? { descRu: v } : { descEn: v })} testID="pk-desc" />
      <FormInput label={t('sanatorium.s2.nights')} value={d.nights} onChangeText={(v) => set({ nights: v })} keyboardType="number-pad" required testID="pk-nights" />
      <FormInput label={t('sanatorium.s2.price')} value={d.price} onChangeText={(v) => set({ price: v })} keyboardType="decimal-pad" required testID="pk-price" />
      <ChoiceField
        label={t('sanatorium.s2.priceMode')}
        value={d.mode}
        options={(['per_person', 'per_room'] as const).map((m) => ({ value: m, label: t(`sanatorium.s2.mode.${m}`) }))}
        onChange={(v) => v && set({ mode: v })}
        testID="pk-mode"
      />
      <FieldLabel>{t('sanatorium.s2.guestTypes')}</FieldLabel>
      <Text variant="caption" tone="subtle" style={styles.hint}>{t('sanatorium.s2.guestTypesHint')}</Text>
      <ChipWrap options={GUEST_TYPES.map((g) => ({ value: g as string, label: t(`sanatorium.guestType.${g}`) }))} isOn={(v) => d.guestTypes.includes(v)} onToggle={(v) => set({ guestTypes: toggleValue(d.guestTypes, v) })} testID="pk-types" />

      <FieldLabel>{t('sanatorium.s2.includedItems')}</FieldLabel>
      {d.items.map((it, i) => (
        <View key={i} style={[styles.item, { borderColor: c.border }]} testID={`pk-item-${i}`}>
          {features.on('paid_services') && (
            <ChoiceField
              label={t('sanatorium.s2.service')}
              value={it.serviceId}
              noneLabel={t('sanatorium.s2.freeText')}
              options={(services.data ?? []).map((s) => ({ value: s.id, label: pickText(s as never, 'name', lang) }))}
              onChange={(v) => set({ items: d.items.map((x, j) => (j === i ? { ...x, serviceId: v } : x)) })}
              loading={services.isPending}
            />
          )}
          <FormInput label={t('sanatorium.s2.itemText')} value={it.text} onChangeText={(v) => set({ items: d.items.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
          <FormInput label={t('sanatorium.s2.quantity')} value={it.quantity} onChangeText={(v) => set({ items: d.items.map((x, j) => (j === i ? { ...x, quantity: v } : x)) })} keyboardType="number-pad" />
          <Button label={t('sanatorium.remove')} variant="dangerGhost" size="sm" onPress={() => set({ items: d.items.filter((_, j) => j !== i) })} />
        </View>
      ))}
      <Button testID="pk-add-item" label={t('sanatorium.s2.addItem')} icon="plus" size="sm" variant="soft" onPress={() => set({ items: [...d.items, { serviceId: null, quantity: '1', text: '' }] })} />

      <SwitchRow label={t('sanatorium.childDiscount')} value={d.childDiscount} onChange={(v) => set({ childDiscount: v })} testID="pk-child" />
      <SwitchRow label={t('sanatorium.s2.active')} value={d.active} onChange={(v) => set({ active: v })} testID="pk-active" />
      <PhotoField value={photo} onChange={setPhoto} testID="pk-photo" />
      <ErrorLine message={error} testID="pk-error" />
      <Button testID="pk-save" label={t('common.save')} full loading={save.isPending || upload.isPending || delPhoto.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  thumb: { width: 56, height: 56, borderRadius: radii.md },
  hint: { marginBottom: 6 },
  item: { borderWidth: 1, borderRadius: radii.md, padding: 10, marginBottom: 8 },
});
