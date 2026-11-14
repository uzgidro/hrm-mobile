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
import { StaySheets, type StaySheetKind } from '../components/StaySheets';
import type { StayFull } from '../types';
import { fmtDate, fmtDateTime, fmtMoney, hasSanRole, sanErrorInfo, sanErrorMessage, stayTone } from '../utils/sanatorium';

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
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [sheet, setSheet] = useState<StaySheetKind | null>(null);
  const [early, setEarly] = useState(false);
  const [appt, setAppt] = useState(false);
  const live = stay.status === 'booked' || stay.status === 'checked_in';

  const run = async (kind: 'in' | 'out') => {
    try {
      await (kind === 'in' ? checkIn : checkOut).mutateAsync(stay.id);
      toast.success(t(kind === 'in' ? 'sanatorium.checkedIn' : 'sanatorium.checkedOut'));
    } catch (e) {
      if (kind === 'out' && sanErrorInfo(e).code === 'use_early_leave') setEarly(true);
      else toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.stack}>
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
          <Button testID="stay-pay" label={t('sanatorium.payment')} variant="soft" size="sm" onPress={() => setSheet('payment')} />
        </Card>
      )}

      <View style={styles.actions}>
        {stay.status === 'booked' && <Button testID="stay-checkin" label={t('sanatorium.checkIn')} icon="check" loading={checkIn.isPending} onPress={() => void run('in')} />}
        {stay.status === 'checked_in' && (
          <>
            <Button testID="stay-checkout" label={t('sanatorium.checkOut')} icon="logout" loading={checkOut.isPending} onPress={() => void run('out')} />
            <Button testID="stay-early" label={t('sanatorium.earlyLeave')} variant="soft" onPress={() => setEarly(true)} />
          </>
        )}
        {live && registrar && <Button testID="stay-edit" label={t('sanatorium.edit')} variant="soft" icon="edit" onPress={() => setSheet('edit')} />}
        {live && <Button testID="stay-appt" label={t('sanatorium.newAppointment')} variant="soft" icon="plus" onPress={() => setAppt(true)} />}
        {stay.status === 'booked' && registrar && <Button testID="stay-cancel" label={t('sanatorium.cancelStay')} variant="dangerGhost" onPress={() => setSheet('cancel')} />}
      </View>

      <StaySheets stay={stay} kind={sheet} onClose={() => setSheet(null)} />
      <EarlyLeaveSheet stay={early ? stay : null} onClose={() => setEarly(false)} />
      <AppointmentSheet stayId={appt ? stay.id : null} onClose={() => setAppt(false)} />
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
