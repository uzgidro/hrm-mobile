// Sheets of the stay detail: edit, payment, cancel.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet, Text } from '@/ui';
import { useCancelStay, useUpdatePayment, useUpdateStay } from '../api/mutations';
import { PAYMENT_STATUSES, type PaymentStatus, type StayFull } from '../types';
import { fmtMoney, sanErrorMessage } from '../utils/sanatorium';
import { BookingFields, newBookingDraft, type BookingDraft } from './BookingFields';
import { ChoiceField, ErrorLine, optNull, SwitchRow } from './forms';

export type StaySheetKind = 'edit' | 'payment' | 'cancel';

export function StaySheets({ stay, kind, onClose }: { stay: StayFull; kind: StaySheetKind | null; onClose: () => void }) {
  const { t } = useTranslation();
  const title = kind === 'edit' ? t('sanatorium.editStay') : kind === 'payment' ? t('sanatorium.payment') : t('sanatorium.cancelStay');
  return (
    <Sheet visible={!!kind} onClose={onClose} title={title} scroll>
      {kind === 'edit' && <EditForm key="e" stay={stay} onClose={onClose} />}
      {kind === 'payment' && <PaymentForm key="p" stay={stay} onClose={onClose} />}
      {kind === 'cancel' && <CancelForm key="c" stay={stay} onClose={onClose} />}
    </Sheet>
  );
}

function EditForm({ stay, onClose }: { stay: StayFull; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useUpdateStay();
  const [draft, setDraft] = useState<BookingDraft>(() =>
    newBookingDraft({
      type: stay.guest_type,
      from: stay.planned_from,
      to: stay.planned_to,
      roomId: stay.room?.id ?? null,
      meals: stay.with_meals,
      diet: stay.diet_note ?? '',
      doctorId: stay.doctor?.id ?? null,
      nurseId: stay.nurse?.id ?? null,
      contract: stay.contract_note ?? '',
      note: stay.note ?? '',
    }),
  );
  const [child, setChild] = useState(!!stay.child_discount);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!dayjs(draft.to).isAfter(dayjs(draft.from))) return setError(t('sanatorium.errors.invalid_period'));
    try {
      await save.mutateAsync({
        id: stay.id,
        body: {
          guest_type: draft.type,
          room_id: draft.roomId,
          planned_from: draft.from,
          planned_to: draft.to,
          with_meals: draft.meals,
          diet_note: draft.meals ? optNull(draft.diet) : null,
          child_discount: child,
          doctor_staff_id: draft.doctorId,
          nurse_staff_id: draft.nurseId,
          contract_note: optNull(draft.contract),
          note: optNull(draft.note),
        },
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="stay-edit-sheet">
      <BookingFields
        draft={draft}
        onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
        keepRoom={stay.room ? { id: stay.room.id, label: [stay.room.number, stay.room.building].filter(Boolean).join(' · ') } : null}
      />
      <SwitchRow label={t('sanatorium.childDiscount')} value={child} onChange={setChild} testID="stay-child" />
      <ErrorLine message={error} testID="stay-edit-error" />
      <Button testID="stay-edit-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

function PaymentForm({ stay, onClose }: { stay: StayFull; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useUpdatePayment();
  const [paid, setPaid] = useState(stay.paid_amount ? String(Number(stay.paid_amount)) : '0');
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const n = Number(paid.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return setError(t('sanatorium.priceInvalid'));
    try {
      await save.mutateAsync({ id: stay.id, body: { paid_amount: n.toFixed(2), ...(status ? { payment_status: status } : {}) } });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="payment-sheet">
      <Text variant="body">{t('sanatorium.total')}: {fmtMoney(stay.total_amount)} · {t('sanatorium.debt')}: {fmtMoney(stay.debt)}</Text>
      <FormInput label={t('sanatorium.paidAmount')} value={paid} onChangeText={setPaid} keyboardType="decimal-pad" testID="pay-amount" />
      <ChoiceField
        label={t('sanatorium.paymentStatus')}
        value={status}
        noneLabel={t('sanatorium.paymentAuto')}
        options={PAYMENT_STATUSES.map((p) => ({ value: p, label: t(`sanatorium.pay.${p}`) }))}
        onChange={setStatus}
      />
      <ErrorLine message={error} />
      <Button testID="pay-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

function CancelForm({ stay, onClose }: { stay: StayFull; onClose: () => void }) {
  const { t } = useTranslation();
  const cancel = useCancelStay();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (reason.trim().length < 3) return setError(t('sanatorium.reasonShort'));
    try {
      await cancel.mutateAsync({ id: stay.id, reason: reason.trim() });
      toast.success(t('sanatorium.stayCancelled'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="cancel-sheet">
      <Text variant="body" weight="600">{stay.guest?.full_name}</Text>
      <FormInput label={t('sanatorium.reason')} value={reason} onChangeText={(v) => { setReason(v); setError(null); }} multiline required testID="cancel-reason" />
      <ErrorLine message={error} />
      <Button testID="cancel-save" label={t('sanatorium.cancelStay')} variant="danger" full loading={cancel.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 4, paddingBottom: 8 } });
