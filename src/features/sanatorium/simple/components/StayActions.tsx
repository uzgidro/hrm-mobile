// Short actions on a stay or a family, shared by the queue and the guest's card (web `simple/ActionDialogs`):
// extend, change / first room, take a payment, check out, no-show, first doctor's visit. Every sheet keeps the
// server's answer in sight and never sends the same press twice.
import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Chip, LoadingView, Sheet, Text } from '@/ui';
import { useCreateAppointment, useUpdateStay } from '../../api/mutations';
import { availabilityQuery, stayQuery } from '../../api/queries';
import { AppointmentSheet } from '../../components/AppointmentSheet';
import { EarlyLeaveForm } from '../../components/EarlyLeaveSheet';
import { DateField, ErrorLine, SwitchRow } from '../../components/forms';
import type { StayFull } from '../../types';
import { fmtDate, fmtMoney, minFreeBeds, sanErrorInfo, todayIso } from '../../utils/sanatorium';
import { debtFromWarnings, optionsQuery, useAddPayment, useCheckOutStays, useExtendStay, useMoveStay, useNoShow, type ShortResult } from '../api';
import { flowErrorText } from '../errors';
import type { OptionRoom } from '../types';
import { useSingleFlight } from '../useSingleFlight';
import { debtNumber, isMissingEndpoint, newClientRef, partyOfStays, refundOf, warningsOf, type Party } from '../utils';
import { toastWarnings } from '../warnings';
import { plusDays } from '../wizard/state';
import { ChoiceCard, MoneyInput, Note, useRoomText, type ChoiceBadge } from './parts';
import { SlotPicker } from './SlotPicker';

export type StayAction =
  | { kind: 'extend'; party: Party; plannedTo: string }
  | { kind: 'room'; party: Party }
  | { kind: 'pay'; party: Party; debt?: string | null }
  | { kind: 'out'; party: Party; debt?: string | null; stay?: StayFull }
  | { kind: 'noshow'; party: Party; plannedFrom?: string | null }
  | { kind: 'doctor'; party: Party };

export function StayActionSheet({ action, onClose }: { action: StayAction | null; onClose: () => void }) {
  if (!action) return null;
  const key = `${action.kind}${action.party.stayId}`;
  switch (action.kind) {
    case 'extend': return <ExtendSheet key={key} party={action.party} plannedTo={action.plannedTo} onClose={onClose} />;
    case 'room': return <RoomSheet key={key} party={action.party} onClose={onClose} />;
    case 'pay': return <PaymentSheet key={key} party={action.party} debt={action.debt} onClose={onClose} />;
    case 'out': return <CheckOutSheet key={key} party={action.party} debt={action.debt} stay={action.stay} onClose={onClose} />;
    case 'noshow': return <NoShowSheet key={key} party={action.party} plannedFrom={action.plannedFrom} onClose={onClose} />;
    case 'doctor': return <AssignDoctorSheet key={key} party={action.party} onClose={onClose} />;
  }
}

/** Success toast + the server's warnings + (after a repricing) what is owed now. */
function useDone() {
  const { t } = useTranslation();
  return (res: ShortResult, text: string, priced = false) => {
    if (res?.replayed) toast.info(t('sanFlow.act.paidBefore'));
    else toast.success(text);
    toastWarnings(res, ['prepaid', 'refund']);
    const debt = priced ? (res?.stays ?? []).reduce((n, s) => n + Math.max(0, debtNumber(s.debt)), 0) : 0;
    if (debt > 0) toast.info(t('sanFlow.queue.debt', { sum: fmtMoney(debt) }), 6000);
  };
}

function WholeGroup({ party, on, set }: { party: Party; on: boolean; set: (v: boolean) => void }) {
  const { t } = useTranslation();
  return party.size > 1 ? <SwitchRow label={t('sanFlow.act.wholeGroup', { n: party.size })} value={on} onChange={set} testID="whole-group" /> : null;
}

const groupArg = (party: Party, whole: boolean) => (party.size > 1 ? { whole_group: whole } : {});

function ExtendSheet({ party, plannedTo, onClose }: { party: Party; plannedTo: string; onClose: () => void }) {
  const { t } = useTranslation();
  const done = useDone();
  const save = useExtendStay();
  const flight = useSingleFlight();
  // An overstayer's end is already in the past: the suggestion starts from today.
  const base = plannedTo > todayIso() ? plannedTo : todayIso();
  const [to, setTo] = useState(plusDays(base, 1));
  const [whole, setWhole] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const submit = () => flight.run(async () => {
    if (to <= plannedTo || to < todayIso()) return setError(t('sanSimple.val.extendLater'));
    try {
      done(await save.mutateAsync({ id: party.stayId, planned_to: to, ...groupArg(party, whole) }) as ShortResult, t('sanFlow.act.extended', { date: fmtDate(to) }), true);
      onClose();
    } catch (e) {
      setError(flowErrorText(e, t('errors.generic')));
    }
  });
  return (
    <Sheet visible onClose={onClose} title={t('sanFlow.act.extendTitle')} scroll>
      <View style={styles.form} testID="extend-sheet">
        <Text variant="body" weight="600">{party.name}</Text>
        <Text variant="label" tone="muted">{t('sanFlow.act.leavesOn', { date: fmtDate(plannedTo) })}</Text>
        <View style={styles.wrap}>
          {[1, 2, 3, 5, 7, 10].map((n) => <Chip key={n} label={`+${t('sanFlow.common.nightsN', { n })}`} selected={to === plusDays(base, n)} onPress={() => { setTo(plusDays(base, n)); setError(null); }} testID={`extend-${n}`} />)}
        </View>
        <DateField label={t('sanFlow.act.newEnd')} value={to} onChange={(v) => { setTo(v); setError(null); }} testID="extend-date" />
        <WholeGroup party={party} on={whole} set={setWhole} />
        <ErrorLine message={error} testID="extend-error" />
        <Button testID="extend-save" label={t('sanFlow.act.extendOk')} full loading={save.isPending || flight.pending} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

function RoomSheet({ party, onClose }: { party: Party; onClose: () => void }) {
  const { t } = useTranslation();
  const done = useDone();
  const roomText = useRoomText();
  const save = useMoveStay();
  const flight = useSingleFlight();
  const stay = useQuery(stayQuery(party.stayId));
  const s = stay.data;
  const inHouse = s?.status === 'checked_in';
  const [whole, setWhole] = useState(true);
  const solo = party.size > 1 && !whole;
  const people = whole ? party.size : 1;
  const today = todayIso();
  const start = s ? (inHouse && s.planned_from < today ? today : s.planned_from) : undefined;
  const end = s && start ? (s.planned_to > start ? s.planned_to : plusDays(start, 1)) : undefined;
  const opts = useQuery(optionsQuery({ stay_id: party.stayId, start, end, people, guest_type: s?.guest_type, ...(solo ? { whole_group: false } : {}) }, !!s));
  // An older server has no /arrivals/options: rooms come from the classic availability grid instead.
  const oldServer = opts.isError && isMissingEndpoint(opts.error);
  const avail = useQuery(availabilityQuery(start ?? today, Math.max(1, dayjs(end ?? today).diff(dayjs(start ?? today), 'day')), oldServer));
  const [picked, setPicked] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rooms: OptionRoom[] = oldServer
    ? (avail.data?.rooms ?? []).filter((r) => !r.out_of_service && r.id !== s?.room?.id && minFreeBeds(r.capacity, r.occupancy) >= people)
      .map((r) => ({ id: r.id, number: r.number, building: r.building, floor: r.floor, capacity: r.capacity, free_beds: minFreeBeds(r.capacity, r.occupancy), fits: true, ready: true }))
    // `own` = beds this party already has there: such a room is offered only when everybody fits into it.
    : (opts.data?.rooms ?? []).filter((r) => r.fits !== false && r.id !== s?.room?.id && (!r.own || r.free_beds >= people));
  const suggested = opts.data?.suggested_room_id;
  const value = rooms.some((r) => r.id === picked) ? picked : rooms.find((r) => r.id === suggested)?.id ?? (s && !s.room ? rooms[0]?.id : null) ?? null;
  const loading = stay.isPending || (opts.isPending && !!s) || (oldServer && avail.isPending);
  const submit = () => flight.run(async () => {
    if (!value) return setError(t('sanSimple.val.room'));
    try {
      done(await save.mutateAsync({ id: party.stayId, room_id: value, ...groupArg(party, whole) }) as ShortResult, t('sanFlow.act.roomChanged'), true);
      onClose();
    } catch (e) {
      setError(flowErrorText(e, t('errors.generic')));
    }
  });
  return (
    <Sheet visible onClose={onClose} title={t(s && !s.room ? 'sanFlow.act.roomFirstTitle' : 'sanFlow.act.roomTitle')} scroll>
      <View style={styles.form} testID="move-sheet">
        <Text variant="body" weight="600">{solo ? s?.guest?.full_name : party.name}</Text>
        {!!s?.room && <Text variant="label" tone="muted" testID="room-now">{t('sanFlow.act.roomNow', { room: roomText(s.room) })}</Text>}
        {inHouse && <Note tone="info">{t('sanFlow.act.roomInfo')}</Note>}
        <WholeGroup party={party} on={whole} set={(v) => { setPicked(null); setError(null); setWhole(v); }} />
        {loading && <LoadingView rows={2} />}
        {opts.isError && !oldServer && <Note tone="danger">{flowErrorText(opts.error, t('errors.generic'))}</Note>}
        {!loading && !opts.isError && rooms.length === 0 && <Note tone="danger" testID="room-none">{t('sanFlow.room.none')}</Note>}
        {rooms.length > 0 && !value && <Text variant="label">{t('sanFlow.act.roomPick')}</Text>}
        <View style={styles.form} accessibilityRole="radiogroup">
          {(all ? rooms : rooms.slice(0, 6)).map((r) => {
            const badges: ChoiceBadge[] = [];
            if (r.id === suggested) badges.push({ label: t('sanFlow.room.suggested'), tone: 'success' });
            if (r.ready === false) badges.push({ label: t('sanFlow.room.notReady'), tone: 'warning' });
            return (
              <ChoiceCard
                key={r.id} on={value === r.id} icon="building" title={roomText(r)} badges={badges} testID={`room-${r.number}`} onPress={() => { setPicked(r.id); setError(null); }}
                hint={[r.room_type, t('sanFlow.room.freeBeds', { free: r.free_beds, cap: r.capacity }), r.price_per_day ? `${fmtMoney(r.price_per_day)} ${t(r.price_mode === 'per_room' ? 'sanFlow.room.perRoom' : 'sanFlow.room.perBed')}` : null].filter(Boolean).join(' · ')}
              />
            );
          })}
        </View>
        {!all && rooms.length > 6 && <Button label={t('sanFlow.room.showAll', { n: rooms.length })} variant="ghost" onPress={() => setAll(true)} testID="room-all" />}
        <ErrorLine message={error} testID="move-error" />
        <Button testID="move-save" label={t('sanFlow.act.roomOk')} full disabled={!value} loading={save.isPending || flight.pending} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

function PaymentSheet({ party, debt, onClose, onPaid }: { party: Party; debt?: string | null; onClose: () => void; onPaid?: () => void }) {
  const { t } = useTranslation();
  const done = useDone();
  const save = useAddPayment();
  const flight = useSingleFlight();
  // One per sheet: a retry or a double tap is recognised by the server and never adds the money twice.
  const clientRef = useRef(newClientRef());
  const stay = useQuery(stayQuery(party.stayId));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const owed = Math.max(0, Math.round(debtNumber(debt ?? (party.size === 1 ? stay.data?.debt : null))));
  const n = Number(amount || 0);
  const submit = () => flight.run(async () => {
    if (!(n > 0)) return setError(t('sanSimple.val.payment'));
    try {
      const res = await save.mutateAsync({ id: party.stayId, amount, note: note.trim() || undefined, paid_before: stay.data?.paid_amount, whole_group: party.size > 1, client_ref: clientRef.current });
      done(res as ShortResult, t('sanFlow.act.paid', { sum: fmtMoney(amount) }));
      const over = warningsOf(res).some((w) => w.code === 'overpaid');
      if (over && !(res as ShortResult)?.replayed) toast.info(t('sanSimple.act.overpaid'), 6000);
      onClose();
      onPaid?.();
    } catch (e) {
      // The same money was just taken: nothing to send again, only to look at the debt.
      if (sanErrorInfo(e).code === 'duplicate_payment') setLocked(true);
      setError(flowErrorText(e, t('errors.generic')));
    }
  });
  return (
    <Sheet visible onClose={onClose} title={t('sanFlow.act.payTitle')} scroll>
      <View style={styles.form} testID="payment-add-sheet">
        <Text variant="body" weight="600">{party.name}</Text>
        <View style={styles.owes}>
          <Text variant="body">{t('sanFlow.act.owes')}</Text>
          <Text variant="heading" tone={owed > 0 ? 'danger' : 'success'} testID="pay-owed">{t('sanFlow.common.sum', { sum: fmtMoney(owed) })}</Text>
        </View>
        <MoneyInput label={t('sanFlow.act.payAmount')} value={amount} onChange={(v) => { setAmount(v); if (!locked) setError(null); }} testID="payment-amount" />
        <Text variant="caption" tone="muted">{t('sanFlow.act.payHint')}</Text>
        {owed > 0 && n !== owed && <Button testID="pay-all" label={t('sanFlow.act.payAll', { sum: fmtMoney(owed) })} size="sm" variant="soft" onPress={() => setAmount(String(owed))} />}
        {n > owed && n > 0 && <Note tone="warning" testID="pay-over">{t('sanFlow.act.payOver', { sum: fmtMoney(n - owed) })}</Note>}
        <FormInput label={t('sanSimple.act.payNote')} value={note} maxLength={255} onChangeText={setNote} testID="payment-note" />
        <ErrorLine message={error} testID="payment-error" />
        {locked
          ? <Button testID="pay-check" label={t('sanFlow.act.payCheck')} full variant="soft" onPress={onClose} />
          : <Button testID="payment-save" label={t('sanFlow.act.payOk')} full disabled={!(n > 0)} loading={save.isPending || flight.pending} onPress={() => void submit()} />}
      </View>
    </Sheet>
  );
}

type DebtParams = { amount?: string; stays?: { name: string; amount: string }[] };

function CheckOutSheet({ party, debt, stay, onClose }: { party: Party; debt?: string | null; stay?: StayFull; onClose: () => void }) {
  const { t } = useTranslation();
  const done = useDone();
  const save = useCheckOutStays();
  const flight = useSingleFlight();
  const full = useQuery(stayQuery(party.stayId, !stay));
  const s = stay ?? full.data;
  const [pay, setPay] = useState(false);
  // The sum on the card is from before the payment: after it the server says what is left.
  const [paid, setPaid] = useState(false);
  const [early, setEarly] = useState(false);
  const [whole, setWhole] = useState(true);
  const [failure, setFailure] = useState<unknown>(null);
  const [refund, setRefund] = useState(0);
  const solo = party.size > 1 && !whole;
  const { code, params } = sanErrorInfo(failure);
  const server = params as DebtParams;
  const known = solo || party.size === 1 ? (paid ? null : s?.debt ?? (party.size === 1 ? debt : null)) : paid ? null : debt;
  const owed = debtNumber(code === 'debt_exists' ? server.amount ?? known : known);
  const run = (allow: boolean) => flight.run(async () => {
    try {
      const res = await save.mutateAsync({ ids: solo ? [party.stayId] : party.stayIds, allow_debt: allow, group: true });
      done(res as ShortResult, t('sanFlow.act.out', { name: solo ? s?.guest?.full_name ?? party.name : party.name }));
      const left = debtFromWarnings(res);
      if (left > 0) toast.info(t('sanSimple.debtLeft', { amount: fmtMoney(left) }), 8000);
      const back = refundOf(res);
      if (back > 0) setRefund(back);
      else onClose();
    } catch (e) {
      setFailure(e);
    }
  });
  if (refund > 0) return <RefundSheet name={solo ? s?.guest?.full_name ?? party.name : party.name} amount={refund} kind="refund" onClose={onClose} />;
  if (early && s) {
    return (
      <Sheet visible onClose={onClose} title={t('sanatorium.earlyLeave')} scroll>
        <EarlyLeaveForm stay={s} group={solo ? undefined : party} onClose={onClose} />
      </Sheet>
    );
  }
  if (pay) {
    return <PaymentSheet party={solo && s ? partyOfStays(s, []) : party} debt={String(owed)} onClose={() => setPay(false)} onPaid={() => { setFailure(null); setPaid(true); setPay(false); }} />;
  }
  const busy = save.isPending || flight.pending;
  return (
    <Sheet visible onClose={onClose} title={t('sanFlow.act.outTitle')} scroll>
      <View style={styles.form} testID="checkout-sheet">
        <Text variant="body" weight="600">{solo ? s?.guest?.full_name : party.name}</Text>
        <WholeGroup party={party} on={whole} set={(v) => { setFailure(null); setWhole(v); }} />
        <Text variant="body">{t(party.size > 1 && whole ? 'sanFlow.act.outGroup' : 'sanFlow.act.outOne', { n: party.size })}</Text>
        {owed > 0 && <Note tone="danger" testID="out-owes">{[t('sanFlow.act.outOwes', { sum: fmtMoney(owed) }), (server.stays?.length ?? 0) > 1 ? server.stays!.map((x) => `${x.name}: ${fmtMoney(x.amount)}`).join('; ') : ''].filter(Boolean).join('\n')}</Note>}
        {failure != null && code !== 'debt_exists' && (
          <Note tone="danger" testID="out-error" action={code === 'use_early_leave' && s ? { label: t('sanFlow.act.goEarly'), onPress: () => setEarly(true), testID: 'out-early' } : undefined}>
            {flowErrorText(failure, t('errors.generic'))}
          </Note>
        )}
        <Text variant="caption" tone="muted">{t('sanFlow.act.outInfo')}</Text>
        {owed > 0 ? (
          <>
            <Button testID="out-pay" label={t('sanFlow.act.payFirst')} icon="wallet" full disabled={busy} onPress={() => setPay(true)} />
            <Button testID="out-debt" label={t('sanFlow.act.outWithDebt')} variant="soft" full loading={busy} onPress={() => void run(true)} />
          </>
        ) : (
          <Button testID="out-ok" label={t('sanFlow.act.outOk')} icon="logout" full loading={busy} disabled={!s} onPress={() => void run(false)} />
        )}
      </View>
    </Sheet>
  );
}

function NoShowSheet({ party, plannedFrom, onClose }: { party: Party; plannedFrom?: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const done = useDone();
  const save = useNoShow();
  const flight = useSingleFlight();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refund, setRefund] = useState(0);
  if (refund > 0) return <RefundSheet name={party.name} amount={refund} onClose={onClose} />;
  const submit = () => flight.run(async () => {
    try {
      const res = await save.mutateAsync({ id: party.stayId, reason: reason.trim() || undefined, ...(party.size > 1 ? { whole_group: true } : {}) });
      done(res, t('sanFlow.act.noShowDone'));
      const back = refundOf(res);
      if (back > 0) setRefund(back);
      else onClose();
    } catch (e) {
      setError(isMissingEndpoint(e) ? t('sanSimple.unavailable') : flowErrorText(e, t('errors.generic')));
    }
  });
  return (
    <Sheet visible onClose={onClose} title={t('sanFlow.act.noShowTitle')} scroll>
      <View style={styles.form} testID="noshow-sheet">
        <Text variant="body" weight="600">{party.name}</Text>
        <Text variant="body">{t('sanFlow.act.noShowText', { date: fmtDate(plannedFrom) })}</Text>
        <FormInput label={t('sanFlow.act.noShowReason')} placeholder={t('sanFlow.common.optional')} value={reason} maxLength={255} onChangeText={setReason} testID="noshow-reason" />
        <ErrorLine message={error} testID="noshow-error" />
        <Button testID="noshow-save" label={t('sanFlow.act.noShowOk')} variant="danger" full loading={save.isPending || flight.pending} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

/** The booking is closed, but money was taken for it: stays on screen until it is read. */
export function RefundSheet({ name, amount, kind = 'prepaid', onClose }: { name: string; amount: number; kind?: 'prepaid' | 'refund'; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible onClose={onClose} title={t('sanFlow.act.refundTitle')}>
      <View style={styles.form} testID="refund-sheet">
        <Text variant="body" weight="600">{name}</Text>
        <Note tone="warning" testID="refund-text">{t(kind === 'refund' ? 'sanFlow.early.refund' : 'sanFlow.warn.prepaid', { sum: fmtMoney(amount) })}</Note>
        <Button testID="refund-ok" label={t('sanFlow.act.refundOk')} full onPress={onClose} />
      </View>
    </Sheet>
  );
}

/** First doctor's visit of a guest who already lives here: the suggested doctor and the nearest free time. */
function AssignDoctorSheet({ party, onClose }: { party: Party; onClose: () => void }) {
  const { t } = useTranslation();
  const stay = useQuery(stayQuery(party.stayId));
  const s = stay.data;
  const start = s && s.planned_from > todayIso() ? s.planned_from : todayIso();
  const end = s && s.planned_to > start ? s.planned_to : plusDays(start, 1);
  const q = useQuery(optionsQuery({ stay_id: party.stayId, start, end, people: 1, guest_type: s?.guest_type, ...(party.size > 1 ? { whole_group: false } : {}) }, !!s));
  const create = useCreateAppointment();
  const patch = useUpdateStay();
  const flight = useSingleFlight();
  const [docId, setDocId] = useState<number | null>(null);
  const [at, setAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  // An older server cannot suggest: the classic form with every doctor and any time.
  if (q.isError && isMissingEndpoint(q.error)) return <AppointmentSheet stayId={party.stayId} onClose={onClose} />;
  const doctors = q.data?.doctors ?? [];
  const current = docId ?? s?.doctor?.id ?? q.data?.suggested_doctor_id ?? doctors[0]?.staff_id ?? null;
  const doc = doctors.find((x) => x.staff_id === current) ?? null;
  const time = at || (doc && doc.staff_id === q.data?.suggested_doctor_id ? q.data?.suggested_exam_at ?? '' : '') || doc?.next_slots[0] || '';
  const minutes = q.data?.exam_slot_min ?? 20;
  const submit = () => flight.run(async () => {
    if (!doc || !time) return;
    try {
      await create.mutateAsync({ stay_id: party.stayId, doctor_staff_id: doc.staff_id, ...(doc.specialty_id ? { specialty_id: doc.specialty_id } : {}), scheduled_at: time, duration_min: minutes });
      if (s && !s.doctor) await patch.mutateAsync({ id: party.stayId, body: { doctor_staff_id: doc.staff_id } });
      toast.success(t('sanFlow.act.doctorDone'));
      onClose();
    } catch (e) {
      setError(flowErrorText(e, t('errors.generic')));
      void q.refetch();
    }
  });
  return (
    <Sheet visible onClose={onClose} title={t('sanFlow.act.doctorTitle')} scroll>
      <View style={styles.form} testID="assign-doctor-sheet">
        <Text variant="body" weight="600">{s?.guest?.full_name ?? party.name}</Text>
        {(stay.isPending || q.isPending) && <LoadingView rows={2} />}
        {q.isError && <Note tone="danger">{flowErrorText(q.error, t('errors.generic'))}</Note>}
        {!!q.data && doctors.length === 0 && <Note tone="warning">{t('sanFlow.doctor.none')}</Note>}
        <View style={styles.form} accessibilityRole="radiogroup">
          {doctors.map((x) => (
            <ChoiceCard
              key={x.staff_id} on={x.staff_id === current} icon="user" title={x.full_name} testID={`doctor-${x.staff_id}`} onPress={() => { setDocId(x.staff_id); setAt(''); setError(null); }}
              badges={q.data?.suggested_doctor_id === x.staff_id ? [{ label: t('sanFlow.room.suggested'), tone: 'success' }] : []}
              hint={[x.specialty, x.cabinet ? t('sanFlow.doctor.cabinet', { n: x.cabinet }) : null, t('sanFlow.doctor.load', { n: x.load ?? 0 })].filter(Boolean).join(' · ')}
            />
          ))}
        </View>
        {!!doc && (
          <>
            <Text variant="heading">{t('sanFlow.doctor.when')}</Text>
            <SlotPicker key={doc.staff_id} staffId={doc.staff_id} slots={doc.next_slots} value={time} onChange={(v) => { setAt(v); setError(null); }} min={start} max={plusDays(end, -1)} minutes={minutes} testID="assign-slots" />
          </>
        )}
        <ErrorLine message={error} testID="assign-error" />
        <Button testID="assign-save" label={t('sanFlow.act.doctorOk')} full disabled={!doc || !time} loading={create.isPending || patch.isPending || flight.pending} onPress={() => void submit()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, paddingBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  owes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
