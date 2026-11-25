// One stay: details, money (registrar), and every action — check-in / out, early leave,
// edit, payment, cancel, book an appointment.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Card, PageHeader, Screen, Text } from '@/ui';
import { useCheckIn, useCheckOut } from '../api/mutations';
import { stayQuery } from '../api/queries';
import { AppointmentSheet } from '../components/AppointmentSheet';
import { Denied, PhoneLink, QueryBlock, useSanAccess } from '../components/common';
import { EarlyLeaveSheet } from '../components/EarlyLeaveSheet';
import { JourneyCard } from '../components/sections1/JourneyCard';
import { StayDietSheet } from '../components/sections2/DietParts';
import { StayDocumentsCard, StayServicesCard } from '../components/sections2/StayDocuments';
import { StayNext } from '../simple/components/StayNext';
import { RefundSheet } from '../simple/components/StayActions';
import { refundOf } from '../simple/utils';
import { toastWarnings } from '../simple/warnings';
import { useSanFeatures } from '../utils/features';
import { StaySheets, type StaySheetKind } from '../components/StaySheets';
import type { StayFull } from '../types';
import { fmtDate, fmtDateTime, fmtMoney, hasSanRole, isSanReadOnly, sanErrorInfo, sanErrorMessage, stayTone } from '../utils/sanatorium';

export default function StayScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar', 'room_keeper');
  const id = Number(useLocalSearchParams<{ id?: string }>().id ?? 0);
  const q = useQuery(stayQuery(id, allowed));
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-stay-screen">
      <PageHeader title={t('sanatorium.stay')} />
      <QueryBlock query={q}>{(s) => <Detail stay={s} />}</QueryBlock>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      <Text variant="caption" tone="muted" style={styles.factLabel}>{label}</Text>
      <Text variant="body" style={styles.flex}>{value}</Text>
    </View>
  );
}

function Detail({ stay }: { stay: StayFull }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const registrar = hasSanRole(user, 'registrar');
  // The view-only chairman reads the stay but changes nothing.
  const canWrite = !isSanReadOnly(user);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [sheet, setSheet] = useState<StaySheetKind | null>(null);
  const [early, setEarly] = useState(false);
  const [appt, setAppt] = useState(false);
  const [dietOpen, setDietOpen] = useState(false);
  const [refund, setRefund] = useState(0);
  const leaveCard = () => (router.canGoBack() ? router.back() : router.replace('/sanatorium-stays'));
  const [more, setMore] = useState(false);
  const features = useSanFeatures();
  const live = stay.status === 'booked' || stay.status === 'checked_in';

  const run = async (kind: 'in' | 'out') => {
    try {
      const res = await (kind === 'in' ? checkIn : checkOut).mutateAsync(stay.id);
      toast.success(t(kind === 'in' ? 'sanatorium.checkedIn' : 'sanatorium.checkedOut'));
      toastWarnings(res, ['refund']);
      // Money to give back is shown until it is read (the registrar only gets it).
      const back = refundOf(res);
      if (kind === 'out' && back > 0) return setRefund(back);
      // Who has left is out of the room keeper's sight: the card would only answer 404.
      if (kind === 'out' && !registrar) leaveCard();
    } catch (e) {
      if (kind === 'out' && sanErrorInfo(e).code === 'use_early_leave') setEarly(true);
      else toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.stack}>
      {registrar && <StayNext stay={stay} readOnly={!canWrite} />}
      <Card testID="stay-detail">
        <View style={styles.row}>
          <Text
            variant="title"
            style={styles.flex}
            onPress={() => stay.guest && router.push({ pathname: '/sanatorium-guest', params: { id: String(stay.guest.id) } })}
          >
            {stay.guest?.full_name}
          </Text>
          <Badge label={t(`sanatorium.stayStatus.${stay.status}`)} tone={stayTone(stay.status)} />
        </View>
        <PhoneLink phone={stay.guest?.phone} />
        <Row label={t('sanatorium.guestTypeLabel')} value={t(`sanatorium.guestType.${stay.guest_type}`)} />
        <Row label={t('sanatorium.room')} value={stay.room ? [stay.room.number, stay.room.building].filter(Boolean).join(' · ') : t('sanatorium.noRoom')} />
        <Row label={t('sanatorium.period')} value={`${fmtDate(stay.planned_from)} → ${fmtDate(stay.planned_to)} (${stay.nights})`} />
        {stay.left_early && <Row label={t('sanatorium.leftEarly')} value={`${fmtDate(stay.early_leave_date)}${stay.early_leave_reason ? ` · ${stay.early_leave_reason}` : ''}`} />}
        {stay.days_left != null && live && <Row label={t('sanFlow.stay.daysLeft')} value={String(stay.days_left)} />}
        <Row label={t('sanatorium.meals')} value={stay.with_meals ? t('sanatorium.yes') : t('sanatorium.no')} />
        <Row label={t('sanatorium.dietNote')} value={stay.diet_note} />
        <Row label={t('sanatorium.doctor')} value={stay.doctor?.full_name} />
        <Row label={t('sanatorium.nurse')} value={stay.nurse?.full_name} />
        <Row label={t('sanatorium.contractNote')} value={stay.contract_note} />
        <Row label={t('sanatorium.notes')} value={stay.note} />
        <Row label={t('sanatorium.checkedInAt')} value={stay.checked_in_at ? fmtDateTime(stay.checked_in_at) : null} />
        <Row label={t('sanatorium.checkedOutAt')} value={stay.checked_out_at ? fmtDateTime(stay.checked_out_at) : null} />
      </Card>

      {registrar && stay.total_amount != null && (
        <Card title={t('sanatorium.payment')} icon="wallet" tint="green" testID="stay-money">
          <Row label={t('sanatorium.pricePerDay')} value={`${fmtMoney(stay.price_per_day)}${stay.child_discount ? ` · -${stay.discount_percent ?? 0}%` : ''}`} />
          <Row label={t('sanatorium.total')} value={fmtMoney(stay.total_amount)} />
          <Row label={t('sanatorium.paidAmount')} value={fmtMoney(stay.paid_amount)} />
          <Row label={t('sanatorium.debt')} value={fmtMoney(stay.debt)} />
          <View style={styles.row}>{stay.payment_status && <Badge label={t(`sanatorium.pay.${stay.payment_status}`)} tone={stay.payment_status === 'paid' ? 'success' : stay.payment_status === 'partial' ? 'warning' : 'danger'} />}</View>
          {canWrite && <Button testID="stay-pay" label={t('sanatorium.payment')} variant="soft" size="sm" onPress={() => setSheet('payment')} />}
        </Card>
      )}

      <JourneyCard stayId={stay.id} />
      <StayServicesCard stay={stay} />
      <StayDocumentsCard stay={stay} />

      {registrar && canWrite && <Button testID="stay-more" label={more ? t('sanSimple.next.lessDetails') : t('sanSimple.next.details')} variant="soft" full onPress={() => setMore((v) => !v)} />}
      {canWrite && (!registrar || more) && <View style={styles.actions}>
        {live && registrar && features.on('diet') && <Button testID="stay-diet" label={t('sanatorium.s2.dietAndAllergies')} variant="soft" onPress={() => setDietOpen(true)} />}
        {stay.status === 'booked' && <Button testID="stay-checkin" label={t('sanatorium.checkIn')} icon="check" loading={checkIn.isPending} onPress={() => void run('in')} />}
        {stay.status === 'checked_in' && (
          <>
            <Button testID="stay-checkout" label={t('sanatorium.checkOut')} icon="logout" loading={checkOut.isPending} onPress={() => void run('out')} />
            <Button testID="stay-early" label={t('sanatorium.earlyLeave')} variant="soft" onPress={() => setEarly(true)} />
          </>
        )}
        {live && registrar && <Button testID="stay-edit" label={t('sanatorium.edit')} variant="soft" icon="edit" onPress={() => setSheet('edit')} />}
        {live && registrar && <Button testID="stay-appt" label={t('sanatorium.newAppointment')} variant="soft" icon="plus" onPress={() => setAppt(true)} />}
        {stay.status === 'booked' && registrar && <Button testID="stay-cancel" label={t('sanatorium.cancelStay')} variant="dangerGhost" onPress={() => setSheet('cancel')} />}
      </View>}

      <StaySheets stay={stay} kind={sheet} onClose={() => setSheet(null)} />
      <EarlyLeaveSheet stay={early ? stay : null} onDone={registrar ? undefined : leaveCard} onClose={() => setEarly(false)} />
      {refund > 0 && <RefundSheet name={stay.guest?.full_name ?? ''} amount={refund} kind="refund" onClose={() => setRefund(0)} />}
      <AppointmentSheet stayId={appt ? stay.id : null} from={stay.planned_from} to={stay.planned_to} onClose={() => setAppt(false)} />
      <StayDietSheet stay={dietOpen ? stay : null} onClose={() => setDietOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  fact: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  factLabel: { width: 96 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
