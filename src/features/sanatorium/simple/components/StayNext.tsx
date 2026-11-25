// Top of the stay screen for the registrar: ONE «next step» button, the route stepper and the
// four short actions (extend / change room / take payment / check out). Everything else of the stay
// stays below under «Batafsil».
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, Text } from '@/ui';
import { useCheckIn } from '../../api/mutations';
import { AppointmentSheet } from '../../components/AppointmentSheet';
import { StayDietSheet } from '../../components/sections2/DietParts';
import type { StayFull } from '../../types';
import { useSanFeatures } from '../../utils/features';
import { fmtMoney, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { groupStaysQuery, routeSheetQuery, useGroupCheckIn } from '../api';
import { debtNumber, hasDebt, nextStepFor } from '../utils';
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

export function StayNext({ stay, onEarlyLeave }: { stay: StayFull; onEarlyLeave: () => void }) {
  const { t } = useTranslation();
  const sheetQ = useQuery(routeSheetQuery(stay.id));
  const features = useSanFeatures();
  const checkIn = useCheckIn();
  const checkOut = useCheckOutFlow();
  const groupIn = useGroupCheckIn();
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
      try {
        if (groupIds.length > 1) await groupIn.mutateAsync(groupIds);
        else await checkIn.mutateAsync(stay.id);
        toast.success(t('sanatorium.checkedIn'));
      } catch (e) {
        toast.error(sanErrorMessage(e, t('errors.generic')));
      }
    } else if (next.kind === 'choose_room') setSheet('move');
    else if (next.kind === 'book_exam') setAppt(true);
    else if (next.kind === 'diet') setDiet(true);
    else if (next.kind === 'check_out') await out();
  };
  const out = async (whole = false) => {
    const r = whole && groupIds.length > 1 ? await checkOut.run(groupIds, groupDebt) : await checkOut.run([stay.id], stay.debt);
    if (r === 'early') onEarlyLeave();
  };

  return (
    <Card title={t('sanSimple.next.title')} icon="target" testID="stay-next">
      {route && <RouteStepper steps={route.steps} />}
      {hasDebt(stay.debt) && <Badge label={`${t('sanatorium.debt')}: ${fmtMoney(stay.debt)}`} tone="danger" testID="stay-debt-badge" />}
      {next.kind !== 'none' ? (
        <Button testID="stay-next-btn" label={label[next.kind]!} size="lg" full loading={checkIn.isPending} onPress={() => void runNext()} />
      ) : (
        <Text variant="body" tone="muted" testID="stay-next-none">{t('sanSimple.next.none')}</Text>
      )}
      {live && (
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
