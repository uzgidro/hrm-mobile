// Short stay actions shared by the queue and the stay screen: extend, change room, take a payment
// and the check-out flow with a debt warning. Each one tells the server the whole group when the
// stay belongs to one.
import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Button, Sheet, Text } from '@/ui';
import { DateField, ErrorLine, SwitchRow } from '../../components/forms';
import { RoomPickerField } from '../../components/RoomPickerField';
import type { GuestType } from '../../types';
import { availabilityQuery } from '../../api/queries';
import { fmtMoney, minFreeBeds, sanErrorInfo, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { debtFromWarnings, optionsQuery, useAddPayment, useCheckOutStays, useExtendStay, useMoveStay } from '../api';
import { useSingleFlight } from '../useSingleFlight';
import { hasDebt, isMissingEndpoint, moneyString, newClientRef, warningsOf } from '../utils';
import { toastWarnings } from '../warnings';

/** What the short actions need to know about a stay (a queue card and a stay screen both build it). */
export type StayRef = {
  id: number;
  guestName?: string | null;
  plannedFrom?: string | null;
  plannedTo?: string | null;
  guestType?: GuestType;
  /** Stay ids of the group (>1 = the whole-group switch appears). */
  groupIds?: number[];
  /** Group size when the ids are not known (a stay screen). */
  groupSize?: number;
  debt?: string | null;
  paid?: string | null;
  roomId?: number | null;
};

export type StayActionKind = 'extend' | 'move' | 'payment';

export function StayActionSheets({ stay, kind, onClose }: { stay: StayRef | null; kind: StayActionKind | null; onClose: () => void }) {
  const { t } = useTranslation();
  const title = kind === 'extend' ? t('sanSimple.act.extend') : kind === 'move' ? t('sanSimple.act.move') : t('sanSimple.act.payment');
  return (
    <Sheet visible={!!stay && !!kind} onClose={onClose} title={title} scroll>
      {stay && kind === 'extend' && <ExtendForm key={`e${stay.id}`} stay={stay} onClose={onClose} />}
      {stay && kind === 'move' && <MoveForm key={`m${stay.id}`} stay={stay} onClose={onClose} />}
      {stay && kind === 'payment' && <PaymentForm key={`p${stay.id}`} stay={stay} onClose={onClose} />}
    </Sheet>
  );
}

const groupSize = (s: StayRef) => s.groupIds?.length ?? s.groupSize ?? 1;

function ExtendForm({ stay, onClose }: { stay: StayRef; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useExtendStay();
  const flight = useSingleFlight();
  // An overstayer's end is already in the past: the suggestion starts from today, not from the old end.
  const [to, setTo] = useState(() => {
    const base = stay.plannedTo && dayjs(stay.plannedTo).isAfter(dayjs(todayIso())) ? stay.plannedTo : todayIso();
    return dayjs(base).add(1, 'day').format('YYYY-MM-DD');
  });
  const [group, setGroup] = useState(groupSize(stay) > 1);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (stay.plannedTo && !dayjs(to).isAfter(dayjs(stay.plannedTo))) return setError(t('sanSimple.val.extendLater'));
    await flight.run(async () => {
      try {
        const res = await save.mutateAsync({ id: stay.id, planned_to: to, whole_group: group && groupSize(stay) > 1 });
        toast.success(t('sanSimple.act.extended'));
        toastWarnings(res);
        onClose();
      } catch (e) {
        setError(sanErrorMessage(e, t('errors.generic')));
      }
    });
  };
  return (
    <View style={styles.form} testID="extend-sheet">
      {!!stay.guestName && <Text variant="body" weight="600">{stay.guestName}</Text>}
      <DateField label={t('sanSimple.act.newEnd')} value={to} onChange={(v) => { setTo(v); setError(null); }} testID="extend-date" />
      {groupSize(stay) > 1 && <SwitchRow label={t('sanSimple.act.wholeGroup', { count: groupSize(stay) })} value={group} onChange={setGroup} testID="extend-group" />}
      <ErrorLine message={error} testID="extend-error" />
      <Button testID="extend-save" label={t('sanSimple.act.extend')} full loading={save.isPending || flight.pending} onPress={() => void submit()} />
    </View>
  );
}

function MoveForm({ stay, onClose }: { stay: StayRef; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useMoveStay();
  const flight = useSingleFlight();
  const start = stay.plannedFrom && dayjs(stay.plannedFrom).isAfter(dayjs()) ? stay.plannedFrom : todayIso();
  const end = stay.plannedTo && dayjs(stay.plannedTo).isAfter(dayjs(start)) ? stay.plannedTo : dayjs(start).add(1, 'day').format('YYYY-MM-DD');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [group, setGroup] = useState(groupSize(stay) > 1);
  const wholeGroup = group && groupSize(stay) > 1;
  // Beds are counted for the people who really move: the whole group, or this guest alone.
  const opts = useQuery(optionsQuery({ start, end, people: wholeGroup ? groupSize(stay) : 1, guest_type: stay.guestType ?? 'treatment', stay_id: stay.id, whole_group: wholeGroup }));
  // An older server has no /arrivals/options: rooms come from the classic availability grid instead.
  const oldServer = opts.isError && isMissingEndpoint(opts.error);
  const avail = useQuery(availabilityQuery(start, Math.max(1, dayjs(end).diff(dayjs(start), 'day')), oldServer));
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!roomId) return setError(t('sanSimple.val.room'));
    await flight.run(async () => {
      try {
        const res = await save.mutateAsync({ id: stay.id, room_id: roomId, whole_group: wholeGroup });
        toast.success(t('sanSimple.act.moved'));
        toastWarnings(res);
        onClose();
      } catch (e) {
        setError(sanErrorMessage(e, t('errors.generic')));
      }
    });
  };
  return (
    <View style={styles.form} testID="move-sheet">
      {!!stay.guestName && <Text variant="body" weight="600">{stay.guestName}</Text>}
      <RoomPickerField
        label={t('sanSimple.act.newRoom')}
        value={roomId}
        loading={opts.isPending || (oldServer && avail.isPending)}
        options={oldServer
          ? (avail.data?.rooms ?? []).filter((r) => !r.out_of_service && r.id !== stay.roomId && minFreeBeds(r.capacity, r.occupancy) > 0).map((r) => ({
            id: r.id,
            title: [r.number, r.building].filter(Boolean).join(' · '),
            sub: `${t('sanatorium.freeBeds')}: ${minFreeBeds(r.capacity, r.occupancy)}/${r.capacity}`,
          }))
          : (opts.data?.rooms ?? []).filter((r) => r.id !== stay.roomId).map((r) => ({
            id: r.id,
            title: [r.number, r.building].filter(Boolean).join(' · '),
            sub: `${t('sanatorium.freeBeds')}: ${r.free_beds}/${r.capacity}${r.ready === false ? ` · ${t('sanSimple.room.notReady')}` : ''}${r.fits === false ? ` · ${t('sanSimple.room.noFit')}` : ''}`,
          }))}
        onChange={(v) => { setRoomId(v); setError(null); }}
        testID="move-room"
      />
      {groupSize(stay) > 1 && <SwitchRow label={t('sanSimple.act.wholeGroup', { count: groupSize(stay) })} value={group} onChange={(v) => { setGroup(v); setRoomId(null); }} testID="move-group" />}
      <ErrorLine message={error} testID="move-error" />
      <Button testID="move-save" label={t('sanSimple.act.move')} full loading={save.isPending || flight.pending} onPress={() => void submit()} />
    </View>
  );
}

function PaymentForm({ stay, onClose }: { stay: StayRef; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useAddPayment();
  const flight = useSingleFlight();
  // One reference per sheet: a retry or a double tap is recognised by the server and never adds the money twice.
  const clientRef = useRef(newClientRef());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [group, setGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const money = moneyString(amount);
    if (!money) return setError(t('sanSimple.val.payment'));
    await flight.run(async () => {
      try {
        const res = await save.mutateAsync({ id: stay.id, amount: money, note: note.trim() || undefined, paid_before: stay.paid, whole_group: group && groupSize(stay) > 1, client_ref: clientRef.current });
        const over = warningsOf(res).some((w) => w.code === 'overpaid');
        // `replayed`: this very payment was already recorded, nothing was added now.
        const replayed = (res as { replayed?: boolean } | undefined)?.replayed === true;
        if (replayed) toast.info(t('sanSimple.act.replayed'));
        else toast.success(t('sanSimple.act.paid'));
        if (over && !replayed) toast.info(t('sanSimple.act.overpaid'));
        toastWarnings(res);
        clientRef.current = newClientRef();
        onClose();
      } catch (e) {
        setError(sanErrorMessage(e, t('errors.generic')));
      }
    });
  };
  return (
    <View style={styles.form} testID="payment-add-sheet">
      {!!stay.guestName && <Text variant="body" weight="600">{stay.guestName}</Text>}
      {hasDebt(stay.debt) && <Text variant="label" tone="danger">{t('sanatorium.debt')}: {fmtMoney(stay.debt)}</Text>}
      <FormInput label={t('sanSimple.act.amount')} value={amount} onChangeText={(v) => { setAmount(v); setError(null); }} keyboardType="decimal-pad" testID="payment-amount" />
      <FormInput label={t('sanSimple.act.payNote')} value={note} onChangeText={setNote} testID="payment-note" />
      {groupSize(stay) > 1 && <SwitchRow label={t('sanSimple.act.wholeGroup', { count: groupSize(stay) })} value={group} onChange={setGroup} testID="payment-group" />}
      <ErrorLine message={error} testID="payment-error" />
      <Button testID="payment-save" label={t('sanSimple.act.payment')} full loading={save.isPending || flight.pending} onPress={() => void submit()} />
    </View>
  );
}

export type CheckOutOutcome = 'done' | 'cancelled' | 'early' | 'failed';

/** Check out one stay or a whole group; asks before leaving a debt and never throws. */
export function useCheckOutFlow() {
  const { t } = useTranslation();
  const m = useCheckOutStays();
  const flight = useSingleFlight();
  const ask = (amount: string | number | null | undefined) =>
    confirm({ title: t('sanSimple.debtTitle'), message: t('sanSimple.debtAsk', { amount: fmtMoney(amount) }), confirmLabel: t('sanSimple.debtGo'), cancelLabel: t('common.cancel'), destructive: true });
  const runOnce = async (ids: number[], debt?: string | number | null): Promise<CheckOutOutcome> => {
    let allow = false;
    if (hasDebt(debt)) {
      if (!(await ask(debt))) return 'cancelled';
      allow = true;
    }
    try {
      const res = await m.mutateAsync({ ids, allow_debt: allow });
      const left = debtFromWarnings(res);
      toast.success(t('sanatorium.checkedOut'));
      if (left > 0) toast.info(t('sanSimple.debtLeft', { amount: fmtMoney(left) }), 8000);
      toastWarnings(res);
      return 'done';
    } catch (e) {
      const info = sanErrorInfo(e);
      if (info.code === 'use_early_leave') return 'early';
      if (info.code === 'debt_exists' && !allow) {
        if (!(await ask(info.params.amount as string | undefined ?? debt))) return 'cancelled';
        try {
          await m.mutateAsync({ ids, allow_debt: true });
          toast.success(t('sanatorium.checkedOut'));
          return 'done';
        } catch (e2) {
          toast.error(sanErrorMessage(e2, t('errors.generic')));
          return 'failed';
        }
      }
      toast.error(sanErrorMessage(e, t('errors.generic')));
      return 'failed';
    }
  };
  const run = async (ids: number[], debt?: string | number | null): Promise<CheckOutOutcome> => (await flight.run(() => runOnce(ids, debt))) ?? 'cancelled';
  return { run, pending: m.isPending || flight.pending };
}

const styles = StyleSheet.create({ form: { gap: 4, paddingBottom: 8 } });
