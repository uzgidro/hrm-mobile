// Early departure: a date and a reason. Saving notifies the kitchen, the room keeper and the
// doctors (the server does it) — the sheet says so before the user confirms.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useEarlyLeave } from '../api/mutations';
import type { Stay } from '../types';
import { fmtDate, sanErrorMessage, todayIso } from '../utils/sanatorium';

export function EarlyLeaveSheet({ stay, onClose }: { stay: Stay | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!stay} onClose={onClose} title={t('sanatorium.earlyLeave')} scroll>
      {stay && <EarlyLeaveForm key={stay.id} stay={stay} onClose={onClose} />}
    </Sheet>
  );
}

// State lives here and starts fresh each time the sheet opens (the form is mounted per stay).
function EarlyLeaveForm({ stay, onClose }: { stay: Stay; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useEarlyLeave();
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [pickDate, setPickDate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (reason.trim().length < 3) return setError(t('sanatorium.reasonShort'));
    try {
      await save.mutateAsync({ id: stay.id, leave_date: date, reason: reason.trim() });
      toast.success(t('sanatorium.earlyLeaveSaved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <>
      <View style={styles.body} testID="early-leave-sheet">
        <Text variant="body" weight="600">
          {stay.guest?.full_name}
        </Text>
        <Text variant="caption" tone="muted">
          {t('sanatorium.earlyLeaveInfo')}
        </Text>
        <SelectField label={t('sanatorium.leaveDate')} value={fmtDate(date)} icon="calendar" onPress={() => setPickDate(true)} testID="early-date" />
        <FormInput
          label={t('sanatorium.reason')}
          value={reason}
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
        <Button testID="early-save" label={t('sanatorium.confirm')} full loading={save.isPending} onPress={() => void submit()} />
      </View>
      <DatePickerModal visible={pickDate} value={date} title={t('sanatorium.leaveDate')} onConfirm={setDate} onClose={() => setPickDate(false)} />
    </>
  );
}

const styles = StyleSheet.create({ body: { gap: 10, paddingBottom: 8 } });
