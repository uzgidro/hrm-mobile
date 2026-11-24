// Paid service orders: slot picker, create sheet, order cards with status actions, and a
// list bound to a filter (used by the services screen and by the stay screen's services block).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, SearchField, Sheet, Text } from '@/ui';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  ordersInfinite, servicesQuery, slotsQuery, useCreateServiceOrder, useDeleteServiceOrder, usePatchServiceOrder,
  type OrderFilter, type SanService, type ServiceOrder,
} from '../../api/sections2';
import { staysInfinite } from '../../api/queries';
import { PagedBlock, useSanReadOnly } from '../common';
import { ChoiceField, DateField, ErrorLine } from '../forms';
import { canDeleteOrder, nextOrderStatuses, pickText, type OrderStatus } from '../../utils/sections2';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { ChipWrap, FieldLabel, useContentLang } from './kit';
import type { Tone } from '@/ui/Chip';

const TONE: Record<OrderStatus, Tone> = { requested: 'warning', confirmed: 'info', done: 'success', cancelled: 'danger' };

/** Day field + free slot chips of a bookable service; `value` is the slot's `at` (naive local ISO). */
export function SlotPicker({ serviceId, value, onChange }: { serviceId: number; value: string | null; onChange: (at: string | null) => void }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(todayIso());
  const q = useQuery(slotsQuery(serviceId, day));
  const slots = q.data ?? [];
  return (
    <View testID="slot-picker">
      <DateField label={t('sanatorium.s2.slotDay')} value={day} onChange={(v) => { setDay(v); onChange(null); }} testID="slot-day" />
      {q.isPending ? <Text variant="caption" tone="muted">{t('sanatorium.loading')}</Text> : slots.length === 0 ? (
        <Text variant="caption" tone="muted">{t('sanatorium.s2.noSlots')}</Text>
      ) : (
        <ChipWrap
          testID="slot-list"
          options={slots.filter((s) => s.available).map((s) => ({ value: s.at, label: `${fmtTime(s.at)} (${s.free})` }))}
          isOn={(v) => v === value}
          onToggle={(v) => onChange(v === value ? null : v)}
        />
      )}
    </View>
  );
}

/** New order for a stay (`stayId` given) or any live stay picked by name. */
export function ServiceOrderSheet({ open, stayId, onClose }: { open: boolean; stayId?: number; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={open} onClose={onClose} title={t('sanatorium.s2.newOrder')} scroll>
      {open && <OrderForm stayId={stayId} onClose={onClose} />}
    </Sheet>
  );
}

function OrderForm({ stayId, onClose }: { stayId?: number; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const create = useCreateServiceOrder();
  const services = useQuery(servicesQuery(false));
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term);
  const stays = useInfiniteQuery({ ...staysInfinite({ q: debounced.trim() || undefined }), enabled: stayId == null });
  const [stay, setStay] = useState<number | null>(stayId ?? null);
  const [svcId, setSvcId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [slot, setSlot] = useState<string | null>(null);
  const [status, setStatus] = useState<'confirmed' | 'requested' | 'done'>('confirmed');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const svc: SanService | undefined = (services.data ?? []).find((s) => s.id === svcId);
  const live = (stays.data?.pages.flatMap((p) => p.items) ?? []).filter((s) => s.status === 'booked' || s.status === 'checked_in');

  const submit = async () => {
    const n = Number.parseInt(qty, 10);
    if (!stay) return setError(t('sanatorium.s2.pickStay'));
    if (!svc) return setError(t('sanatorium.s2.pickService'));
    if (!Number.isFinite(n) || n < 1 || n > 50) return setError(t('sanatorium.s2.qtyRange'));
    if (svc.needs_booking && !slot) return setError(t('sanatorium.errors.schedule_required'));
    try {
      await create.mutateAsync({ stay_id: stay, service_id: svc.id, quantity: n, status, ...(svc.needs_booking && slot ? { scheduled_at: slot } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="order-form">
      {stayId == null && (
        <>
          <SearchField testID="or-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.s2.searchStay')} />
          {live.slice(0, 8).map((s) => (
            <ListRow key={s.id} testID={`or-stay-${s.id}`} title={s.guest?.full_name ?? '—'} subtitle={`${s.room ? `${t('sanatorium.room')} ${s.room.number} · ` : ''}${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`} right={stay === s.id ? <Badge label={t('sanatorium.s2.selected')} tone="success" /> : undefined} onPress={() => setStay(s.id)} />
          ))}
        </>
      )}
      <ChoiceField label={t('sanatorium.s2.service')} value={svcId} options={(services.data ?? []).map((s) => ({ value: s.id, label: pickText(s as never, 'name', lang), sub: s.price ? fmtMoney(s.price) : undefined }))} onChange={(v) => { setSvcId(v); setSlot(null); }} loading={services.isPending} testID="or-service" />
      <FormInput label={t('sanatorium.s2.quantity')} value={qty} onChangeText={setQty} keyboardType="number-pad" testID="or-qty" />
      {svc?.needs_booking && <SlotPicker serviceId={svc.id} value={slot} onChange={setSlot} />}
      <ChoiceField label={t('sanatorium.statusLabel')} value={status} options={(['confirmed', 'requested', 'done'] as const).map((s) => ({ value: s, label: t(`sanatorium.s2.orderStatus.${s}`) }))} onChange={(v) => v && setStatus(v)} testID="or-status" />
      <FormInput label={t('sanatorium.notes')} value={note} onChangeText={setNote} multiline testID="or-note" />
      <ErrorLine message={error} testID="or-error" />
      <Button testID="or-save" label={t('sanatorium.s2.createOrder')} full loading={create.isPending} onPress={() => void submit()} />
    </View>
  );
}

export function OrderCard({ o, showGuest = true }: { o: ServiceOrder; showGuest?: boolean }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const patch = usePatchServiceOrder();
  const del = useDeleteServiceOrder();
  const readOnly = useSanReadOnly();
  const [resched, setResched] = useState(false);
  const act = (status: OrderStatus) => {
    const run = async () => {
      if (status === 'cancelled' && !(await confirm({ title: t('sanatorium.s2.cancelOrder'), confirmLabel: t('sanatorium.s2.cancelOrder'), cancelLabel: t('common.cancel'), destructive: true }))) return;
      patch.mutate({ id: o.id, body: { status } }, { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });
    };
    void run();
  };
  const remove = async () => {
    if (!(await confirm({ title: t('sanatorium.s2.deleteOrder'), confirmLabel: t('sanatorium.remove'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    del.mutate(o.id, { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });
  };
  return (
    <Card testID={`order-${o.id}`}>
      <View style={styles.head}>
        <Text variant="heading" style={styles.flex}>{pickText(o.service as never, 'name', lang)}</Text>
        <Badge label={t(`sanatorium.s2.orderStatus.${o.status}`)} tone={TONE[o.status]} />
      </View>
      {showGuest && !!o.guest && <Text variant="body">{o.guest.full_name}{o.room_number ? ` · ${t('sanatorium.room')} ${o.room_number}` : ''}</Text>}
      <Text variant="caption" tone="muted">
        {[o.scheduled_at ? fmtDateTime(o.scheduled_at) : null, `${o.quantity} × ${fmtMoney(o.unit_price)} = ${fmtMoney(o.total)}`, o.source === 'guest' ? t('sanatorium.s2.fromGuest') : null].filter(Boolean).join(' · ')}
      </Text>
      {!!o.note && <Text variant="caption" tone="subtle">{o.note}</Text>}
      {!readOnly && <View style={styles.actions}>
        {nextOrderStatuses(o.status).map((s) => (
          <Button key={s} testID={`order-${o.id}-${s}`} label={t(`sanatorium.s2.orderAction.${s}`)} size="sm" variant={s === 'cancelled' ? 'dangerGhost' : 'soft'} loading={patch.isPending} onPress={() => act(s)} />
        ))}
        {o.service.needs_booking && (o.status === 'requested' || o.status === 'confirmed') && <Button label={t('sanatorium.s2.reschedule')} size="sm" variant="soft" onPress={() => setResched(true)} />}
        {canDeleteOrder(o.status) && <Button testID={`order-${o.id}-del`} label={t('sanatorium.remove')} size="sm" variant="dangerGhost" onPress={() => void remove()} />}
      </View>}
      <Sheet visible={resched} onClose={() => setResched(false)} title={t('sanatorium.s2.reschedule')} scroll>
        {resched && <RescheduleForm o={o} onClose={() => setResched(false)} />}
      </Sheet>
    </Card>
  );
}

function RescheduleForm({ o, onClose }: { o: ServiceOrder; onClose: () => void }) {
  const { t } = useTranslation();
  const patch = usePatchServiceOrder();
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!slot) return setError(t('sanatorium.errors.schedule_required'));
    try {
      await patch.mutateAsync({ id: o.id, body: { scheduled_at: slot } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View>
      <SlotPicker serviceId={o.service.id} value={slot} onChange={setSlot} />
      <ErrorLine message={error} />
      <Button testID="resched-save" label={t('common.save')} full loading={patch.isPending} onPress={() => void submit()} />
    </View>
  );
}

/** Paged list of orders for `filter`. */
export function OrderList({ filter, showGuest = true, enabled = true }: { filter: OrderFilter; showGuest?: boolean; enabled?: boolean }) {
  const { t } = useTranslation();
  const q = useInfiniteQuery(ordersInfinite(filter, enabled));
  return (
    <PagedBlock query={q}>
      {(items) => (items.length === 0 ? <EmptyState title={t('sanatorium.s2.noOrders')} /> : <View style={styles.stack}>{items.map((o) => <OrderCard key={o.id} o={o} showGuest={showGuest} />)}</View>)}
    </PagedBlock>
  );
}

/** Filter bar (status chips + day) above an `OrderList`. */
export function OrderFilters({ status, day, onStatus, onDay }: { status: OrderStatus | null; day: string | null; onStatus: (s: OrderStatus | null) => void; onDay: (d: string | null) => void }) {
  const { t } = useTranslation();
  return (
    <View>
      <FieldLabel>{t('sanatorium.statusLabel')}</FieldLabel>
      <ChipWrap testID="order-status-filter" options={(['requested', 'confirmed', 'done', 'cancelled'] as OrderStatus[]).map((s) => ({ value: s, label: t(`sanatorium.s2.orderStatus.${s}`) }))} isOn={(v) => v === status} onToggle={(v) => onStatus(v === status ? null : v)} />
      <DateField label={t('sanatorium.s2.slotDay')} value={day} onChange={onDay} testID="order-day-filter" />
      {day && <Button label={t('sanatorium.clearFilters')} size="sm" variant="ghost" onPress={() => onDay(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
