// Paid service orders: slot picker, create sheet, order cards with status actions, and a
// list bound to a filter (used by the services screen and by the stay screen's services block).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, SearchField, Sheet, Text } from '@/ui';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  ordersInfinite, servicesQuery, slotsQuery, useCreateServiceOrder, useDeleteServiceOrder, usePatchServiceOrder,
  type OrderFilter, type SanService, type ServiceOrder, type Slot,
} from '../../api/sections2';
import { staysInfinite } from '../../api/queries';
import { PagedBlock, useSanReadOnly } from '../common';
import { ChoiceField, DateField, ErrorLine } from '../forms';
import { canDeleteOrder, canEditOrder, isPastDay, nextOrderStatuses, orderQuantity, pickText, slotCaption, type OrderStatus } from '../../utils/sections2';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { ChipWrap, FieldLabel, useContentLang } from './kit';
import type { Tone } from '@/ui/Chip';
import { useSingleFlight } from '../../simple/useSingleFlight';

const TONE: Record<OrderStatus, Tone> = { requested: 'warning', confirmed: 'info', done: 'success', cancelled: 'danger' };

/** One slot: time + free / capacity; a full slot is shown but cannot be picked. */
function SlotChip({ slot, on, onPress }: { slot: Slot; on: boolean; onPress: () => void }) {
  const { colors: c } = useTheme();
  const full = !slot.available;
  return (
    <Pressable
      onPress={onPress}
      disabled={full}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: full }}
      accessibilityLabel={`${fmtTime(slot.at)} ${slotCaption(slot)}`}
      testID={`slot-${fmtTime(slot.at).replace(':', '')}`}
      style={[styles.slot, { backgroundColor: on ? c.brand : c.surface, borderColor: on ? c.brand : c.borderStrong, opacity: full ? 0.45 : 1 }]}
    >
      <Text variant="label" style={[{ color: on ? c.fgOnBrand : c.fg }, full && styles.struck]}>{fmtTime(slot.at)}</Text>
      <Text variant="caption" style={{ color: on ? c.fgOnBrand : c.fgMuted }}>{slotCaption(slot)}</Text>
    </Pressable>
  );
}

/** Day field + slot chips of a bookable service; `value` is the slot's `at` (naive local ISO). Past days are refused. */
export function SlotPicker({ serviceId, value, onChange, initialDay }: { serviceId: number; value: string | null; onChange: (at: string | null) => void; initialDay?: string }) {
  const { t } = useTranslation();
  const today = todayIso();
  const [day, setDay] = useState(initialDay && initialDay >= today ? initialDay : today);
  const past = isPastDay(day, today);
  const q = useQuery(slotsQuery(serviceId, day, !past));
  const slots = q.data ?? [];
  return (
    <View testID="slot-picker">
      <DateField label={t('sanatorium.s2.slotDay')} value={day} onChange={(v) => { setDay(v); onChange(null); }} testID="slot-day" />
      {past ? <ErrorLine message={t('sanCatalog.orders.dayPast')} testID="slot-past" /> : q.isPending ? <Text variant="caption" tone="muted">{t('sanatorium.loading')}</Text> : slots.length === 0 ? (
        <Text variant="caption" tone="muted" testID="slot-none">{t('sanatorium.s2.noSlots')}</Text>
      ) : (
        <View style={styles.slots} testID="slot-list">
          {slots.map((sl) => <SlotChip key={sl.at} slot={sl} on={sl.at === value} onPress={() => onChange(sl.at === value ? null : sl.at)} />)}
        </View>
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

  const flight = useSingleFlight();
  const submit = () => flight.run(async () => {
    const n = orderQuantity(qty);
    if (!stay) return setError(t('sanatorium.s2.pickStay'));
    if (!svc) return setError(t('sanatorium.s2.pickService'));
    if (n == null) return setError(t('sanCatalog.orders.qtyRange'));
    if (svc.needs_booking && !slot) return setError(t('sanatorium.errors.schedule_required'));
    try {
      await create.mutateAsync({ stay_id: stay, service_id: svc.id, quantity: n, status, ...(svc.needs_booking && slot ? { scheduled_at: slot } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  });
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
      <FormInput label={t('sanatorium.s2.quantity')} value={qty} onChangeText={setQty} keyboardType="number-pad" maxLength={4} testID="or-qty" />
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
        {o.service.needs_booking && canEditOrder(o.status) && <Button testID={`order-${o.id}-resched`} label={t('sanatorium.s2.reschedule')} size="sm" variant="soft" onPress={() => setResched(true)} />}
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
  const flight = useSingleFlight();
  const submit = () => flight.run(async () => {
    if (!slot) return setError(t('sanatorium.errors.schedule_required'));
    try {
      await patch.mutateAsync({ id: o.id, body: { scheduled_at: slot } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  });
  return (
    <View>
      <Text variant="caption" tone="muted">{o.scheduled_at ? `${t('sanCatalog.orders.current')}: ${fmtDateTime(o.scheduled_at)}` : ''}</Text>
      <SlotPicker serviceId={o.service.id} value={slot} onChange={setSlot} initialDay={o.scheduled_at?.slice(0, 10)} />
      <ErrorLine message={error} testID="resched-error" />
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

/** Filter bar (status chips, service, day) above an `OrderList`; every filter can be cleared. */
export function OrderFilters({
  status, day, onStatus, onDay, serviceId, onService,
}: {
  status: OrderStatus | null; day: string | null; onStatus: (s: OrderStatus | null) => void; onDay: (d: string | null) => void;
  serviceId?: number | null; onService?: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const services = useQuery(servicesQuery(true, !!onService));
  const any = !!status || !!day || !!serviceId;
  return (
    <View>
      <FieldLabel>{t('sanatorium.statusLabel')}</FieldLabel>
      <ChipWrap testID="order-status-filter" options={(['requested', 'confirmed', 'done', 'cancelled'] as OrderStatus[]).map((s) => ({ value: s, label: t(`sanatorium.s2.orderStatus.${s}`) }))} isOn={(v) => v === status} onToggle={(v) => onStatus(v === status ? null : v)} />
      {onService && (
        <ChoiceField label={t('sanatorium.s2.service')} value={serviceId ?? null} noneLabel={t('sanCatalog.orders.anyService')} options={(services.data ?? []).map((x) => ({ value: x.id, label: pickText(x as never, 'name', lang) }))} onChange={onService} loading={services.isPending} testID="order-service-filter" />
      )}
      <DateField label={t('sanatorium.s2.slotDay')} value={day} onChange={onDay} testID="order-day-filter" />
      {any && <Button testID="order-filters-clear" label={t('sanatorium.clearFilters')} size="sm" variant="ghost" onPress={() => { onStatus(null); onDay(null); onService?.(null); }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  slot: { minWidth: 64, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: radii.md, borderWidth: 1 },
  struck: { textDecorationLine: 'line-through' },
});
