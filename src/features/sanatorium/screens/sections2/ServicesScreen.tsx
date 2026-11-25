// Paid services: catalog CRUD (+photo, reorder) and the orders list with filters and a create sheet.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { radii } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, SearchField, Segmented, Sheet, Text } from '@/ui';
import {
  servicesQuery, useDeleteService, useDeleteServicePhoto, useReorderServices, useSaveService, useUploadServicePhoto, type SanService,
} from '../../api/sections2';
import { QueryBlock } from '../../components/common';
import { ChoiceField, ErrorLine, SwitchRow } from '../../components/forms';
import {
  ChipWrap, FieldLabel, PhotoField, RowTools, SectionScreen, TextTrio, emptyPhoto, useConfirmDelete, useContentLang, useWeekdayNames, type PhotoValue,
} from '../../components/sections2/kit';
import { OrderFilters, OrderList, ServiceOrderSheet } from '../../components/sections2/ServiceOrders';
import {
  SERVICE_UNITS, draftFromService, emptyServiceDraft, filterServices, pickText, reorderIds, serviceBody, serviceCategories, serviceFilterOn, toggleValue, weekdaysLabel,
  type OrderStatus, type ServiceDraft, type ServiceFilter,
} from '../../utils/sections2';
import { fmtMoney, sanErrorMessage } from '../../utils/sanatorium';

export default function ServicesScreen() {
  const { t } = useTranslation();
  const [seg, setSeg] = useState<'catalog' | 'orders'>('orders');
  const [edit, setEdit] = useState<SanService | 'new' | null>(null);
  const [newOrder, setNewOrder] = useState(false);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const q = useQuery(servicesQuery(true, seg === 'catalog'));
  return (
    <SectionScreen
      title={t('sanatorium.s2.services')}
      feature="paid_services"
      roles={['registrar']}
      testID="san-services-screen"
      refreshing={seg === 'catalog' ? q.isRefetching : false}
      onRefresh={seg === 'catalog' ? () => void q.refetch() : undefined}
      onAdd={() => (seg === 'catalog' ? setEdit('new') : setNewOrder(true))}
      addLabel={seg === 'catalog' ? t('sanatorium.s2.addService') : t('sanatorium.s2.newOrder')}
    >
      <Segmented testID="services-seg" value={seg} onChange={setSeg} options={[{ value: 'orders', label: t('sanatorium.s2.orders') }, { value: 'catalog', label: t('sanatorium.s2.catalog') }]} />
      {seg === 'catalog' ? <Catalog q={q} onEdit={setEdit} /> : (
        <>
          <OrderFilters status={status} day={day} onStatus={setStatus} onDay={setDay} serviceId={serviceId} onService={setServiceId} />
          <OrderList filter={{ ...(status ? { status } : {}), ...(day ? { day } : {}), ...(serviceId ? { service_id: serviceId } : {}) }} />
        </>
      )}
      <ServiceOrderSheet open={newOrder} onClose={() => setNewOrder(false)} />
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('sanatorium.s2.addService') : t('sanatorium.s2.editService')} scroll>
        {edit && <ServiceForm key={edit === 'new' ? 'new' : edit.id} svc={edit === 'new' ? null : edit} categories={serviceCategories(q.data ?? [])} onClose={() => setEdit(null)} />}
      </Sheet>
    </SectionScreen>
  );
}

function Catalog({ q, onEdit }: { q: ReturnType<typeof useQuery<SanService[]>>; onEdit: (s: SanService) => void }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const names = useWeekdayNames();
  const reorder = useReorderServices();
  const del = useDeleteService();
  const confirmDelete = useConfirmDelete();
  const [f, setF] = useState<ServiceFilter>({ q: '', category: null, active: null });
  const all = q.data ?? [];
  const ids = all.map((s) => s.id);
  const filtering = serviceFilterOn(f);
  const move = (id: number, d: number) => reorder.mutate(reorderIds(ids, id, d), { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });
  const categories = serviceCategories(all);
  return (
    <View style={styles.stack}>
      <SearchField testID="svc-search" value={f.q} onChangeText={(v) => setF((x) => ({ ...x, q: v }))} placeholder={t('sanCatalog.svc.search')} />
      <ChoiceField label={t('sanatorium.s2.category')} value={f.category} noneLabel={t('sanCatalog.svc.anyCategory')} options={categories.map((c) => ({ value: c, label: c }))} onChange={(v) => setF((x) => ({ ...x, category: v }))} testID="svc-category-filter" />
      <ChipWrap
        testID="svc-active-filter"
        options={[{ value: 'on', label: t('sanatorium.s2.active') }, { value: 'off', label: t('sanatorium.s2.inactive') }]}
        isOn={(v) => (v === 'on' ? f.active === true : f.active === false)}
        onToggle={(v) => setF((x) => ({ ...x, active: v === 'on' ? (x.active === true ? null : true) : x.active === false ? null : false }))}
      />
      {filtering && <Button testID="svc-filters-clear" label={t('sanatorium.clearFilters')} size="sm" variant="ghost" onPress={() => setF({ q: '', category: null, active: null })} />}
      <QueryBlock query={q}>
        {(data) => {
          const list = filterServices(data, f);
          return list.length === 0 ? (
            <EmptyState title={t('sanatorium.s2.noServices')} />
          ) : (
            <View style={styles.stack}>
              {list.map((s, i) => (
                <Card key={s.id} testID={`service-${s.id}`}>
                  <View style={styles.head}>
                    {s.photo ? <Image source={{ uri: s.photo.thumb_url }} style={styles.thumb} contentFit="cover" /> : null}
                    <View style={styles.flex}>
                      <Text variant="heading">{pickText(s as never, 'name', lang)}</Text>
                      <Text variant="caption" tone="muted">{fmtMoney(s.price)} · {t(`sanatorium.s2.unit.${s.unit}`)}{s.category ? ` · ${s.category}` : ''}</Text>
                      {s.needs_booking && <Text variant="caption" tone="subtle">{s.duration_min} {t('sanatorium.min')} · {t('sanatorium.s2.capacity')}: {s.capacity} · {s.work_from?.slice(0, 5) ?? '09:00'}–{s.work_to?.slice(0, 5) ?? '18:00'} · {weekdaysLabel(s.weekdays, names, t('sanatorium.s2.everyDay'))}</Text>}
                      {!s.needs_booking && s.capacity > 1 && <Text variant="caption" tone="subtle">{t('sanatorium.s2.capacity')}: {s.capacity}</Text>}
                    </View>
                    {!s.is_active && <Badge label={t('sanatorium.s2.inactive')} tone="warning" />}
                  </View>
                  <RowTools testID={`service-tools-${s.id}`} onUp={filtering ? undefined : i > 0 ? () => move(s.id, -1) : null} onDown={filtering ? undefined : i < list.length - 1 ? () => move(s.id, 1) : null} onEdit={() => onEdit(s)} onDelete={() => void confirmDelete(t('sanatorium.s2.deleteService'), () => del.mutateAsync(s.id))} />
                </Card>
              ))}
            </View>
          );
        }}
      </QueryBlock>
    </View>
  );
}

function ServiceForm({ svc, categories, onClose }: { svc: SanService | null; categories: string[]; onClose: () => void }) {
  const { t } = useTranslation();
  const names = useWeekdayNames();
  const save = useSaveService();
  const upload = useUploadServicePhoto();
  const delPhoto = useDeleteServicePhoto();
  const [d, setD] = useState<ServiceDraft>(() => (svc ? draftFromService(svc) : emptyServiceDraft()));
  const [photo, setPhoto] = useState<PhotoValue>(() => emptyPhoto(svc?.photo ?? null));
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<ServiceDraft>) => setD((x) => ({ ...x, ...p }));
  const submit = async () => {
    const r = serviceBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      const saved = await save.mutateAsync({ id: svc?.id, body: { ...r.body, sort_order: svc?.sort_order ?? 0 } });
      if (photo.pending) await upload.mutateAsync({ id: saved.id, file: photo.pending });
      else if (photo.remove && svc?.photo) await delPhoto.mutateAsync(saved.id);
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="service-form">
      <TextTrio label={t('sanatorium.s2.name')} values={[d.nameUz, d.nameRu, d.nameEn]} onChange={(i, v) => set(i === 0 ? { nameUz: v } : i === 1 ? { nameRu: v } : { nameEn: v })} testID="sv-name" />
      <TextTrio label={t('sanatorium.s2.description')} multiline values={[d.descUz, d.descRu, d.descEn]} onChange={(i, v) => set(i === 0 ? { descUz: v } : i === 1 ? { descRu: v } : { descEn: v })} testID="sv-desc" />
      <FormInput label={t('sanatorium.s2.category')} value={d.category} onChangeText={(v) => set({ category: v })} maxLength={80} testID="sv-category" />
      {categories.length > 0 && <ChipWrap testID="sv-category-suggest" options={categories.map((c) => ({ value: c, label: c }))} isOn={(v) => v === d.category.trim()} onToggle={(v) => set({ category: v })} />}
      <FormInput label={t('sanatorium.s2.price')} value={d.price} onChangeText={(v) => set({ price: v })} keyboardType="decimal-pad" required testID="sv-price" />
      <ChoiceField label={t('sanatorium.s2.unitLabel')} value={d.unit} options={SERVICE_UNITS.map((u) => ({ value: u, label: t(`sanatorium.s2.unit.${u}`) }))} onChange={(v) => v && set({ unit: v })} testID="sv-unit" />
      <SwitchRow label={t('sanatorium.s2.needsBooking')} value={d.needsBooking} onChange={(v) => set({ needsBooking: v })} testID="sv-booking" />
      <FormInput label={t('sanatorium.s2.durationMin')} value={d.duration} onChangeText={(v) => set({ duration: v })} keyboardType="number-pad" required={d.needsBooking} testID="sv-duration" />
      <FormInput label={t('sanatorium.s2.capacity')} value={d.capacity} onChangeText={(v) => set({ capacity: v })} keyboardType="number-pad" testID="sv-capacity" />
      <FormInput label={t('sanatorium.s2.workFrom')} value={d.workFrom} onChangeText={(v) => set({ workFrom: v })} placeholder="09:00" testID="sv-from" />
      <FormInput label={t('sanatorium.s2.workTo')} value={d.workTo} onChangeText={(v) => set({ workTo: v })} placeholder="18:00" testID="sv-to" />
      <FieldLabel>{t('sanatorium.s2.weekdays')}</FieldLabel>
      <ChipWrap options={names.map((n, i) => ({ value: i, label: n }))} isOn={(v) => d.weekdays.includes(v)} onToggle={(v) => set({ weekdays: toggleValue(d.weekdays, v) })} testID="sv-days" />
      <SwitchRow label={t('sanatorium.s2.active')} value={d.active} onChange={(v) => set({ active: v })} testID="sv-active" />
      <PhotoField value={photo} onChange={setPhoto} testID="sv-photo" />
      <ErrorLine message={error} testID="sv-error" />
      <Button testID="sv-save" label={t('common.save')} full loading={save.isPending || upload.isPending || delPhoto.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  thumb: { width: 56, height: 56, borderRadius: radii.md },
});
