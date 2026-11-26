// Top of the guest's card for the registrar: one sentence, ONE button, the short actions and the route sheet.
// Everything else of the stay stays below under «Batafsil».
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Text } from '@/ui';
import { EarlyLeaveSheet } from '../../components/EarlyLeaveSheet';
import type { StayFull } from '../../types';
import { fmtDate, fmtMoney, todayIso } from '../../utils/sanatorium';
import { groupStaysQuery, routeSheetQuery, stayAppointmentsQuery } from '../api';
import { hasDebt, nextStepFor, partyOfStays, type NextAction } from '../utils';
import { RouteSheetBody, RouteSheetTools, RouteStepper, useSheetLang } from './RouteSheetView';
import { StayActionSheet, type StayAction } from './StayActions';
import { useSimpleAvailable } from '../useSimpleAvailable';

export function StayNext({ stay, readOnly = false }: { stay: StayFull; readOnly?: boolean }) {
  const { t } = useTranslation();
  const simple = useSimpleAvailable();
  const today = todayIso();
  const booked = stay.status === 'booked';
  const inHouse = stay.status === 'checked_in';
  const gone = !booked && !inHouse && stay.status !== 'cancelled';
  const sheetQ = useQuery(routeSheetQuery(stay.id, stay.status !== 'cancelled'));
  const route = sheetQ.data ?? null;
  const [lang, setLang] = useSheetLang(route);
  const [full, setFull] = useState(false);
  const [action, setAction] = useState<StayAction | null>(null);
  const [early, setEarly] = useState(false);
  // The server decides who needs a visit: the doctor step of the route is empty and nothing is booked.
  const appts = useQuery(stayAppointmentsQuery(stay.id, inHouse));
  const doctorStep = route?.steps.find((s) => s.key === 'doctor');
  const hasVisit = (appts.data ?? []).some((a) => a.status === 'scheduled' || a.status === 'done');
  const needsExam = inHouse && !!doctorStep && !doctorStep.done && !doctorStep.at && !appts.isPending && !hasVisit;
  // People who came together and are in the same state as this guest (a family may leave on different days).
  const family = useQuery(groupStaysQuery(stay.group_key, stay.status, booked || inHouse));
  const mates = (family.data ?? []).filter((m) => m.id !== stay.id);
  const solo = partyOfStays(stay, []);
  const group = partyOfStays(stay, mates);
  const next = nextStepFor(stay, today, needsExam);

  const run = (a: NextAction | 'move') => {
    if (a === 'arrive') return router.push(simple ? { pathname: '/sanatorium-arrive', params: { stay: String(stay.id) } } : { pathname: '/sanatorium-stays' });
    if (a === 'no_show') return setAction({ kind: 'noshow', party: partyOfStays(stay, mates.filter((m) => m.planned_from < today)), plannedFrom: stay.planned_from });
    if (a === 'choose_room' || a === 'move') return setAction({ kind: 'room', party: group });
    if (a === 'extend') return setAction({ kind: 'extend', party: group, plannedTo: stay.planned_to });
    if (a === 'assign_doctor') return setAction({ kind: 'doctor', party: solo });
    if (a === 'take_payment') return setAction({ kind: 'pay', party: solo, debt: stay.debt });
    // Leaving before the planned day needs a reason, so it has its own form.
    if (stay.planned_to > today) return setEarly(true);
    const leaving = mates.filter((m) => m.planned_to <= today);
    return setAction({ kind: 'out', party: partyOfStays(stay, leaving), stay, debt: leaving.length ? null : stay.debt });
  };
  const label = (a: NextAction | 'move') => t(a === 'move' ? 'sanSimple.act.move' : `sanSimple.action.${a}`);
  const quick: (NextAction | 'move')[] = [];
  if (booked || inHouse) quick.push('extend', stay.room ? 'move' : 'choose_room', 'take_payment');
  if (inHouse) quick.push('check_out');
  if (booked && stay.planned_from < today && stay.planned_to > today) quick.push('no_show');
  if (booked && stay.planned_to <= today) quick.push('arrive');
  // Somebody who has left may still pay what they owe.
  if (gone && hasDebt(stay.debt) && next.action !== 'take_payment') quick.push('take_payment');
  const early2 = early ? partyOfStays(stay, mates.filter((m) => m.planned_to > today)) : undefined;

  return (
    <Card title={t('sanFlow.next.title')} icon="target" testID="stay-next">
      <Text variant="body" weight="600" testID="stay-next-text">{t(`sanFlow.next.${next.text}`, { date: fmtDate(next.date), sum: fmtMoney(next.sum ?? 0) })}</Text>
      {hasDebt(stay.debt) && <Badge label={t('sanFlow.queue.debt', { sum: fmtMoney(stay.debt) })} tone="danger" testID="stay-debt-badge" />}
      {!readOnly && !!next.action && <Button testID="stay-next-btn" label={label(next.action)} size="lg" full onPress={() => run(next.action!)} />}
      {!readOnly && quick.length > 0 && (
        <View style={styles.actions} testID="short-actions">
          {quick.map((a) => <Button key={a} testID={`stay-${a}`} label={label(a)} variant="soft" size="sm" onPress={() => run(a)} />)}
        </View>
      )}
      {!!route && (
        <View style={styles.route} testID="stay-route">
          <RouteStepper steps={route.steps} />
          <Button testID="route-toggle" label={t(full ? 'sanFlow.sheet.hide' : 'sanFlow.sheet.full')} variant="link" size="sm" onPress={() => setFull((v) => !v)} />
          {full && (
            <>
              <RouteSheetTools stayId={stay.id} sheet={route} lang={lang} onLang={setLang} />
              <View style={styles.gap} />
              <RouteSheetBody sheet={route} lang={lang} />
            </>
          )}
        </View>
      )}
      <StayActionSheet action={action} onClose={() => setAction(null)} />
      <EarlyLeaveSheet stay={early ? stay : null} group={early2 && early2.size > 1 ? early2 : undefined} onClose={() => setEarly(false)} />
    </Card>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, route: { marginTop: 8, gap: 4 }, gap: { height: 12 } });
