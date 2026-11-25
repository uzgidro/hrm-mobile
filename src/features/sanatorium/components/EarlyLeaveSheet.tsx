// Early departure: a date and a reason, for one guest or the whole family. Saving notifies the kitchen, the room
// keeper and the doctors (the server does it) — the sheet says so before the user confirms. The money line comes
// from the server's preview for the chosen day; a server without it shows no money at all.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useAuthStore } from '@/store/authStore';
import { useEarlyLeave } from '../api/mutations';
import { debtFromWarnings, earlyPreviewQuery, groupStaysQuery } from '../simple/api';
import { Note } from '../simple/components/parts';
import { RefundSheet } from '../simple/components/StayActions';
import { flowErrorText } from '../simple/errors';
import { useSingleFlight } from '../simple/useSingleFlight';
import { moneyLine, partyOfStays, refundOf, type Party } from '../simple/utils';
import { toastWarnings } from '../simple/warnings';
import type { Stay } from '../types';
import { fmtDate, fmtMoney, hasSanRole, todayIso } from '../utils/sanatorium';
import { SwitchRow } from './forms';

/** `group` undefined = the sheet finds the family itself (people of the same group who live here too). */
export function EarlyLeaveSheet({ stay, group, onClose }: { stay: Stay | null; group?: Party; onClose: () => void }) {
  const { t } = useTranslation();
  const family = useQuery(groupStaysQuery(stay?.group_key, 'checked_in', !!stay && !group && stay.status === 'checked_in'));
  const mates = (family.data ?? []).filter((m) => m.id !== stay?.id && m.planned_to > todayIso());
  return (
    <Sheet visible={!!stay} onClose={onClose} title={t('sanatorium.earlyLeave')} scroll>
      {stay && <EarlyLeaveForm key={stay.id} stay={stay} group={group ?? (mates.length ? partyOfStays(stay, mates) : undefined)} onClose={onClose} />}
    </Sheet>
  );
}

// State lives here and starts fresh each time the sheet opens (the form is mounted per stay).
export function EarlyLeaveForm({ stay, group, onClose }: { stay: Stay; group?: Party; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useEarlyLeave();
  const flight = useSingleFlight();
  const registrar = hasSanRole(useAuthStore((s) => s.user), 'registrar');
  const size = group?.size ?? 1;
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [whole, setWhole] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refund, setRefund] = useState(0);
  const all = size > 1 && whole;
  // Money is the registrar's business; the preview already knows the nights that will not be paid.
  const preview = useQuery(earlyPreviewQuery(stay.id, date, all, registrar));
  const money = moneyLine(preview.data);

  const submit = () => flight.run(async () => {
    if (reason.trim().length < 3) return setError(t('sanatorium.reasonShort'));
    try {
      const res = await save.mutateAsync({ id: stay.id, leave_date: date, reason: reason.trim(), whole_group: all });
      toast.success(t('sanatorium.earlyLeaveSaved'));
      toastWarnings(res, ['prepaid', 'refund']);
      const left = debtFromWarnings(res);
      if (left > 0) toast.info(t('sanSimple.debtLeft', { amount: fmtMoney(left) }), 8000);
      const back = refundOf(res);
      if (back > 0 && registrar) setRefund(back);
      else onClose();
    } catch (e) {
      setError(flowErrorText(e, t('errors.generic')));
    }
  });
  if (refund > 0) return <RefundSheet name={(all ? group!.name : stay.guest?.full_name) ?? ''} amount={refund} kind="refund" onClose={onClose} />;

  return (
    <>
      <View style={styles.body} testID="early-leave-sheet">
        <Text variant="body" weight="600">{all ? group!.name : stay.guest?.full_name}</Text>
        <Text variant="caption" tone="muted">{fmtDate(stay.planned_from)} — {fmtDate(stay.planned_to)}</Text>
        <Text variant="caption" tone="muted">{t('sanatorium.earlyLeaveInfo')}</Text>
        {size > 1 && <SwitchRow label={t('sanFlow.early.wholeGroup', { n: size })} value={whole} onChange={(v) => { setWhole(v); setError(null); }} testID="early-whole" />}
        <SelectField label={t('sanatorium.leaveDate')} value={fmtDate(date)} icon="calendar" onPress={() => setPickDate(true)} testID="early-date" />
        {!!money && (
          <Note tone={money.kind === 'debt' ? 'danger' : money.kind === 'refund' ? 'warning' : 'success'} testID={`early-${money.kind}`}>
            {[
              money.kind === 'none' ? t('sanFlow.review.noDebt') : t(money.kind === 'debt' ? 'sanFlow.early.debt' : 'sanFlow.early.refund', { sum: fmtMoney(money.amount) }),
              ...((preview.data?.members?.length ?? 0) > 1 ? preview.data!.members!.map((m) => `${m.full_name}: ${fmtMoney(money.kind === 'refund' ? m.refund : m.debt)}`) : []),
            ].join('\n')}
          </Note>
        )}
        <FormInput
          label={t('sanatorium.reason')}
          value={reason}
          maxLength={1000}
          onChangeText={(v) => {
            setReason(v);
            setError(null);
          }}
          multiline
          required
          testID="early-reason"
        />
        {!!error && (
          <Text variant="label" tone="danger" testID="early-error">
            {error}
          </Text>
        )}
        <Button testID="early-save" label={t('sanatorium.confirm')} full loading={save.isPending || flight.pending} onPress={() => void submit()} />
      </View>
      {pickDate && <DatePickerModal
        visible value={date} title={t('sanatorium.leaveDate')} onClose={() => setPickDate(false)}
        onConfirm={(v) => {
          if (v < stay.planned_from) return setError(t('sanFlow.early.beforeFrom'));
          setError(null);
          setDate(v);
        }}
      />}
    </>
  );
}

const styles = StyleSheet.create({ body: { gap: 10, paddingBottom: 8 } });
