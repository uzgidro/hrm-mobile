// Transfers (registrar): airport / station pick-ups and drop-offs. Status tabs with counts,
// direction filter, search, paging; create for a guest, edit, move along the status flow
// (requested → confirmed → assigned → done, cancel), assign a vehicle or a driver.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, EmptyState, ListRow, PageHeader, Screen, SearchField, Segmented, SelectField, Sheet, Text } from '@/ui';
import { formatUzPhone } from '@/utils/phone';
import { guestsQuery } from '../../api/queries';
import { useConfirmTransfer, useCreateTransfer, usePatchTransfer, transfersInfinite, vehiclesQuery } from '../../api/sections1';
import { PagedBlock, PhoneLink, useSanReadOnly } from '../../components/common';
import { ChoiceField, DateField, ErrorLine, opt, optNull } from '../../components/forms';
import { MultiRow } from '../../components/sections1/MultiRow';
import { SectionGate } from '../../components/sections1/shared';
import { TRANSFER_STATUSES, type Transfer, type TransferDirection, type TransferStatus } from '../../types1';
import { nextTransferStatuses, transferNeedsCar, validTransferPeople } from '../../utils/sections1';
import { fmtDateTime, sanErrorMessage, toLocalIso } from '../../utils/sanatorium';

type Tab = 'all' | TransferStatus;
/** «01 A 123 BC · Chevrolet Cobalt» or «Driver · +998…» ; null when neither is set. */
function carLine(x: Transfer): string | null {
  const car = x.vehicle ? [x.vehicle.plate_number, x.vehicle.model_name].filter(Boolean).join(' · ') : '';
  const driver = [x.driver_name, x.driver_phone ? formatUzPhone(x.driver_phone) : null].filter(Boolean).join(' · ');
  return [car, driver].filter(Boolean).join(' / ') || null;
}
const tone = (s: TransferStatus) => ({ requested: 'warning', confirmed: 'info', assigned: 'info', done: 'success', cancelled: 'neutral' } as const)[s];

export default function TransfersScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('all');
  const [dir, setDir] = useState<'all' | TransferDirection>('all');
  const [term, setTerm] = useState('');
  const q = useDebouncedValue(term);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [edit, setEdit] = useState<Transfer | 'new' | null>(null);
  const readOnly = useSanReadOnly();
  const query = useInfiniteQuery(transfersInfinite({ status: tab, direction: dir, q, from, to }));
  const counts = query.data?.pages[0]?.counts ?? {};
  const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
  return (
    <SectionGate feature="transfer" roles={['registrar']}>
      <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()} testID="sanatorium-transfers-screen">
        <PageHeader title={t('san1.transfer.title')} right={readOnly ? undefined : <Button testID="tr-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEdit('new')} />} />
        <Segmented
          testID="tr-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all' as Tab, label: t('common.all'), count: total || undefined },
            ...TRANSFER_STATUSES.map((s) => ({ value: s as Tab, label: t(`san1.transfer.status.${s}`), count: counts[s] || undefined })),
          ]}
        />
        <View style={styles.filters}>
          <Segmented
            testID="tr-dir"
            value={dir}
            onChange={setDir}
            options={[
              { value: 'all' as const, label: t('common.all') },
              { value: 'arrival' as const, label: t('san1.transfer.direction.arrival') },
              { value: 'departure' as const, label: t('san1.transfer.direction.departure') },
            ]}
          />
          <SearchField testID="tr-search" value={term} onChangeText={setTerm} placeholder={t('san1.transfer.search')} />
          <View style={styles.pair}>
            <View style={styles.flex}><DateField label={t('san1.waitlist.from')} value={from} onChange={setFrom} testID="tr-from" /></View>
            <View style={styles.flex}><DateField label={t('san1.waitlist.to')} value={to} onChange={setTo} testID="tr-to" /></View>
          </View>
          {(from || to) && <Button label={t('san1.waitlist.clearDates')} variant="link" size="sm" onPress={() => { setFrom(null); setTo(null); }} />}
        </View>
        <PagedBlock query={query}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('san1.transfer.empty')} />
            ) : (
              <View style={styles.stack}>
                {items.map((x) => (
                  <MultiRow
                    key={x.id}
                    testID={`tr-${x.id}`}
                    title={x.guest?.full_name ?? `#${x.guest_id}`}
                    right={<Badge label={t(`san1.transfer.status.${x.status}`)} tone={tone(x.status)} />}
                    lines={[
                      [t(`san1.transfer.direction.${x.direction}`), fmtDateTime(x.scheduled_at), `${x.people} ${t('san1.waitlist.people')}`].join(' · '),
                      x.pickup_point,
                      x.guest?.phone || x.contact_phone ? formatUzPhone(x.guest?.phone || x.contact_phone) : null,
                      carLine(x),
                    ]}
                    onPress={readOnly ? undefined : () => setEdit(x)}
                  />
                ))}
              </View>
            )
          }
        </PagedBlock>
        <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('san1.transfer.add') : t('san1.transfer.entry')} scroll>
          {edit && <TransferForm key={edit === 'new' ? 'new' : edit.id} item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
        </Sheet>
      </Screen>
    </SectionGate>
  );
}

function TransferForm({ item, onClose }: { item: Transfer | null; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateTransfer();
  const patch = usePatchTransfer();
  const confirmTr = useConfirmTransfer();
  const vehicles = useQuery(vehiclesQuery());
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const guests = useQuery({ ...guestsQuery(debounced), enabled: !item && debounced.trim().length >= 2 });
  const [guest, setGuest] = useState<{ id: number; name: string } | null>(item ? { id: item.guest_id, name: item.guest?.full_name ?? `#${item.guest_id}` } : null);
  const [direction, setDirection] = useState<TransferDirection>(item?.direction ?? 'arrival');
  const [pickup, setPickup] = useState(item?.pickup_point ?? '');
  const [when, setWhen] = useState<string>(() => item?.scheduled_at ?? toLocalIso(dayjs().add(1, 'day').hour(10).minute(0).second(0)));
  const [pickWhen, setPickWhen] = useState(false);
  const [people, setPeople] = useState(String(item?.people ?? 1));
  const [transportNo, setTransportNo] = useState(item?.transport_no ?? '');
  const [contact, setContact] = useState(item?.contact_phone ?? '');
  const [note, setNote] = useState(item?.note ?? '');
  const [price, setPrice] = useState(item?.price ? String(Number(item.price)) : '');
  const [status, setStatus] = useState<TransferStatus>(item?.status ?? 'requested');
  const [vehicleId, setVehicleId] = useState<number | null>(item?.vehicle?.id ?? null);
  const [driver, setDriver] = useState(item?.driver_name ?? '');
  const [driverPhone, setDriverPhone] = useState(item?.driver_phone ?? '');
  const [reason, setReason] = useState(item?.cancel_reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const final = !!item && (item.status === 'done' || item.status === 'cancelled');
  const nexts = item ? nextTransferStatuses(item.status) : [];

  const submit = async () => {
    const n = Number.parseInt(people, 10);
    const pr = price.trim() ? Number(price.replace(',', '.')) : null;
    if (!guest) return setError(t('san1.transfer.pickGuest'));
    if (!pickup.trim()) return setError(t('san1.transfer.pickupRequired'));
    if (!validTransferPeople(n)) return setError(t('sanPlaces.transfer.peopleRange'));
    if (item && !final && transferNeedsCar(status, vehicleId, driver)) return setError(t('sanPlaces.transfer.driverRequired'));
    if (pr != null && (!Number.isFinite(pr) || pr < 0)) return setError(t('sanatorium.priceInvalid'));
    try {
      if (item) {
        await patch.mutateAsync({
          id: item.id,
          body: {
            direction,
            pickup_point: pickup.trim(),
            scheduled_at: toLocalIso(when),
            people: n,
            transport_no: optNull(transportNo),
            contact_phone: optNull(contact),
            note: optNull(note),
            price: pr != null ? pr.toFixed(2) : null,
            // Status only travels when it moved: the server auto-assigns on a vehicle / driver otherwise.
            ...(status !== item.status ? { status } : {}),
            vehicle_id: vehicleId,
            driver_name: optNull(driver),
            driver_phone: optNull(driverPhone),
            ...(status === 'cancelled' ? { cancel_reason: optNull(reason) } : {}),
          },
        });
      } else {
        await create.mutateAsync({
          guest_id: guest.id,
          direction,
          pickup_point: pickup.trim(),
          scheduled_at: toLocalIso(when),
          people: n,
          ...(opt(transportNo) ? { transport_no: opt(transportNo) } : {}),
          ...(opt(contact) ? { contact_phone: opt(contact) } : {}),
          ...(opt(note) ? { note: opt(note) } : {}),
          ...(pr != null ? { price: pr.toFixed(2) } : {}),
        });
      }
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const confirmNow = async () => {
    if (!item) return;
    try {
      await confirmTr.mutateAsync(item.id);
      toast.success(t('sanPlaces.transfer.confirmed'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="transfer-sheet">
      {item && (
        <View style={styles.pair}>
          <Badge label={t(`san1.transfer.status.${item.status}`)} tone={tone(item.status)} />
          <Badge label={t(`san1.transfer.source.${item.source}`, { defaultValue: item.source })} tone="neutral" />
          <PhoneLink phone={item.guest?.phone} />
        </View>
      )}
      {guest ? (
        <View style={styles.pair}>
          <Text variant="heading" style={styles.flex}>{guest.name}</Text>
          {!item && <Button label={t('sanatorium.change')} variant="link" size="sm" onPress={() => setGuest(null)} />}
        </View>
      ) : (
        <>
          <SearchField testID="tr-guest-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.guestSearch')} />
          {(guests.data ?? []).map((g) => (
            <ListRow key={g.id} testID={`tr-guest-${g.id}`} title={g.full_name} subtitle={g.phone ?? undefined} chevron onPress={() => setGuest({ id: g.id, name: g.full_name })} />
          ))}
        </>
      )}
      <ChoiceField
        label={t('san1.transfer.directionLabel')}
        value={direction}
        options={(['arrival', 'departure'] as const).map((d) => ({ value: d as TransferDirection, label: t(`san1.transfer.direction.${d}`) }))}
        onChange={(v) => v && setDirection(v)}
        testID="tr-direction"
      />
      <FormInput label={t('san1.transfer.pickup')} value={pickup} onChangeText={setPickup} required maxLength={255} testID="tr-pickup" />
      <SelectField label={t('sanatorium.dateTime')} value={fmtDateTime(when)} icon="calendar" onPress={() => setPickWhen(true)} testID="tr-when" />
      <FormInput label={t('san1.waitlist.partySize')} value={people} onChangeText={setPeople} keyboardType="number-pad" maxLength={2} testID="tr-people" />
      <FormInput label={t('san1.transfer.transportNo')} value={transportNo} onChangeText={setTransportNo} maxLength={50} testID="tr-transport" />
      <FormInput label={t('san1.transfer.contactPhone')} value={contact} onChangeText={setContact} keyboardType="phone-pad" testID="tr-contact" />
      <FormInput label={t('san1.transfer.price')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" testID="tr-price" />
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={setNote} multiline maxLength={500} testID="tr-note" />
      {item && !final && (
        <>
          <ChoiceField
            label={t('san1.transfer.statusLabel')}
            value={status}
            options={[item.status, ...nexts].map((s) => ({ value: s, label: t(`san1.transfer.status.${s}`) }))}
            onChange={(v) => v && setStatus(v)}
            testID="tr-status"
          />
          <ChoiceField
            label={t('san1.transfer.vehicle')}
            value={vehicleId}
            noneLabel={t('sanatorium.none')}
            options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: v.plate_number, sub: [v.model_name, v.seats ? `${v.seats} ${t('san1.transfer.seats')}` : null].filter(Boolean).join(' · ') || undefined }))}
            onChange={setVehicleId}
            loading={vehicles.isPending}
            testID="tr-vehicle"
          />
          <FormInput label={t('san1.transfer.driver')} value={driver} onChangeText={setDriver} maxLength={150} testID="tr-driver" />
          <FormInput label={t('san1.transfer.driverPhone')} value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" testID="tr-driver-phone" />
          {status === 'cancelled' && <FormInput label={t('san1.transfer.cancelReason')} value={reason} onChangeText={setReason} maxLength={255} testID="tr-reason" />}
        </>
      )}
      {final && item && (
        <View style={styles.ro} testID="tr-readonly">
          <Text variant="label" tone="muted">{t('sanPlaces.transfer.vehicleReadonly')}</Text>
          <Text variant="body" testID="tr-ro-vehicle">
            {item.vehicle ? [item.vehicle.plate_number, item.vehicle.model_name].filter(Boolean).join(' · ') : t('sanPlaces.transfer.notSet')}
          </Text>
          <Text variant="body" testID="tr-ro-driver">
            {[item.driver_name, item.driver_phone ? formatUzPhone(item.driver_phone) : null].filter(Boolean).join(' · ') || t('sanPlaces.transfer.notSet')}
          </Text>
          <Text variant="caption" tone="muted">{`${t('san1.transfer.statusLabel')}: ${t(`san1.transfer.status.${item.status}`)}`}</Text>
          {!!item.cancel_reason && <Text variant="caption" tone="muted">{item.cancel_reason}</Text>}
        </View>
      )}
      <ErrorLine message={error} testID="tr-error" />
 {item?.status === 'requested' && (
        <Button testID="tr-confirm" label={t('sanPlaces.transfer.confirm')} variant="soft" full icon="check" loading={confirmTr.isPending} onPress={() => void confirmNow()} />
      )}
      {!final && <Button testID="tr-save" label={t('common.save')} full loading={create.isPending || patch.isPending} onPress={() => void submit()} />}
      <DateTimePickerModal visible={pickWhen} value={when} title={t('sanatorium.dateTime')} onConfirm={(iso) => setWhen(toLocalIso(iso))} onClose={() => setPickWhen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, marginTop: 8 },
  filters: { gap: 6, marginTop: 10 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  form: { gap: 6, paddingBottom: 8 },
  ro: { gap: 2, paddingVertical: 4 },
});
