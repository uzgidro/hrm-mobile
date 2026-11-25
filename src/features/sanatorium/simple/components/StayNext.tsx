// Top of the stay screen for the registrar: ONE «next step» button, the route stepper and the
// four short actions (extend / change room / take payment / check out). Everything else of the stay
// stays below under «Batafsil».
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, Text } from '@/ui';
import { useCheckIn } from '../../api/mutations';
import { AppointmentSheet } from '../../components/AppointmentSheet';
import { StayDietSheet } from '../../components/sections2/DietParts';
import type { StayFull } from '../../types';
import { useSanFeatures } from '../../utils/features';
import { fmtDate, fmtMoney, sanErrorInfo, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { groupStaysQuery, routeSheetQuery, useGroupCheckIn } from '../api';
import { useSingleFlight } from '../useSingleFlight';
import { debtNumber, hasDebt, nextStepFor } from '../utils';
import { toastWarnings } from '../warnings';
import { RouteStepper } from './RouteSheetView';
import { StayActionSheets, useCheckOutFlow, type StayActionKind, type StayRef } from './StayActions';

export function stayRefOf(stay: StayFull, groupSize = 1): StayRef {
  const size = groupSize;
  return {
    id: stay.id,
    guestName: stay.guest?.full_name,
    plannedFrom: stay.planned_from,
    plannedTo: stay.planned_to,
    guestType: stay.guest_type,
    groupSize: size,
    debt: stay.debt,
    paid: stay.paid_amount,
    roomId: stay.room?.id ?? null,
  };
}

export function StayNext({ stay, onEarlyLeave, readOnly = false }: { stay: StayFull; onEarlyLeave: () => void; readOnly?: boolean }) {
  const { t } = useTranslation();
  const sheetQ = useQuery(routeSheetQuery(stay.id));
  const features = useSanFeatures();
  const checkIn = useCheckIn();
  const checkOut = useCheckOutFlow();
  const groupIn = useGroupCheckIn();
  const flight = useSingleFlight();
  // The family: every stay with the same group key and status (a stay screen knows only its own row).
  const groupQ = useQuery(groupStaysQuery(stay.group_key, stay.status, stay.status === 'booked' || stay.status === 'checked_in'));
  const group = (groupQ.data ?? []).length > 1 ? groupQ.data! : [];
  const groupIds = group.map((s) => s.id);
  const groupDebt = group.reduce((n, s) => n + debtNumber(s.debt), 0);
  const [sheet, setSheet] = useState<StayActionKind | null>(null);
  const [appt, setAppt] = useState(false);
  const [diet, setDiet] = useState(false);
  const route = sheetQ.data ?? null;
  const next = nextStepFor(stay, route, todayIso());
  const live = stay.status === 'booked' || stay.status === 'checked_in';
  const ref = { ...stayRefOf(stay, Math.max(groupIds.length, (route?.members?.length ?? 0) + 1)), groupIds: groupIds.length > 1 ? groupIds : undefined };

  const label: Record<string, string> = {
    check_in: t('sanatorium.checkIn'), choose_room: t('sanSimple.action.choose_room'), book_exam: t('sanSimple.action.assign_doctor'),
    diet: t('sanSimple.action.diet'), check_out: t('sanSimple.action.check_out'),
  };
  const runNext = async () => {
    if (next.kind === 'check_in') {
      await flight.run(async () => {
        try {
          const res = groupIds.length > 1 ? await groupIn.mutateAsync(groupIds) : await checkIn.mutateAsync(stay.id);
          toast.success(t('sanatorium.checkedIn'));
          toastWarnings(res);
        } catch (e) {
          const info = sanErrorInfo(e);
          if (info.code === 'extend_first') {
            // The booked period is over: the wizard takes new dates.
            const ok = await confirm({
              title: t('sanSimple.wiz.extendAskTitle'),
              message: t('sanSimple.wiz.extendAsk', { name: String(info.params.name ?? stay.guest?.full_name ?? ''), planned_to: fmtDate(String(info.params.planned_to ?? stay.planned_to)) }),
              confirmLabel: t('sanSimple.wiz.extendGo'),
              cancelLabel: t('common.cancel'),
            });
            if (ok) router.push({ pathname: '/sanatorium-arrive', params: { stay: (groupIds.length > 1 ? groupIds : [stay.id]).join(',') } });
          } else toast.error(sanErrorMessage(e, t('errors.generic')));
        }
      });
    } else if (next.kind === 'choose_room') setSheet('move');
    else if (next.kind === 'book_exam') setAppt(true);
    else if (next.kind === 'diet') setDiet(true);
    else if (next.kind === 'check_out') await out();
  };
  const out = async (whole = false) => {
    // Leaving before the planned end is an early leave (its own form with a reason): no debt prompt, no 409 round trip.
    if (stay.status === 'checked_in' && dayjs(stay.planned_to).isAfter(dayjs(todayIso()))) return onEarlyLeave();
    const r = whole && groupIds.length > 1 ? await checkOut.run(groupIds, groupDebt) : await checkOut.run([stay.id], stay.debt);
    if (r === 'early') onEarlyLeave();
  };

  return (
    <Card title={t('sanSimple.next.title')} icon="target" testID="stay-next">
      {route && <RouteStepper steps={route.steps} />}
      {hasDebt(stay.debt) && <Badge label={`${t('sanatorium.debt')}: ${fmtMoney(stay.debt)}`} tone="danger" testID="stay-debt-badge" />}
      {readOnly ? null : next.kind !== 'none' ? (
        <Button testID="stay-next-btn" label={label[next.kind]!} size="lg" full loading={checkIn.isPending || groupIn.isPending || flight.pending} onPress={() => void runNext()} />
      ) : (
        <Text variant="body" tone="muted" testID="stay-next-none">{t('sanSimple.next.none')}</Text>
      )}
      {live && !readOnly && (
        <View style={styles.actions}>
          <Button testID="stay-extend" label={t('sanSimple.act.extend')} variant="soft" size="sm" onPress={() => setSheet('extend')} />
          <Button testID="stay-move" label={t('sanSimple.act.move')} variant="soft" size="sm" onPress={() => setSheet('move')} />
          <Button testID="stay-pay-add" label={t('sanSimple.act.payment')} variant="soft" size="sm" onPress={() => setSheet('payment')} />
          {stay.status === 'checked_in' && next.kind !== 'check_out' && <Button testID="stay-out" label={t('sanSimple.action.check_out')} variant="soft" size="sm" loading={checkOut.pending} onPress={() => void out()} />}
          {stay.status === 'checked_in' && groupIds.length > 1 && <Button testID="stay-out-group" label={t('sanSimple.act.checkOutGroup', { count: groupIds.length })} variant="soft" size="sm" loading={checkOut.pending} onPress={() => void out(true)} />}
        </View>
      )}
      <StayActionSheets stay={sheet ? ref : null} kind={sheet} onClose={() => setSheet(null)} />
      <AppointmentSheet stayId={appt ? stay.id : null} onClose={() => setAppt(false)} />
      {features.on('diet') && <StayDietSheet stay={diet ? stay : null} onClose={() => setDiet(false)} />}
    </Card>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
