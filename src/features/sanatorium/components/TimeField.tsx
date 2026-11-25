// Time-of-day field (HH:MM): a select field that opens a small sheet with hour / minute steppers.
// `optional` adds «Clear» (empty = the server default).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, SelectField, Sheet, Text } from '@/ui';
import { stepTime } from '../utils/staffParity';

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

function Stepper({ label, value, onStep, testID }: { label: string; value: string; onStep: (d: 1 | -1) => void; testID: string }) {
  return (
    <View style={styles.col}>
      <Text variant="caption" tone="muted">{label}</Text>
      <IconButton icon="arrowUp" tone="soft" accessibilityLabel={`${label} +`} onPress={() => onStep(1)} testID={`${testID}-up`} />
      <Text variant="number" testID={`${testID}-value`}>{value}</Text>
      <IconButton icon="arrowDown" tone="soft" accessibilityLabel={`${label} -`} onPress={() => onStep(-1)} testID={`${testID}-down`} />
    </View>
  );
}

export function TimeField({
  label, value, onChange, optional, testID,
}: {
  label: string;
  value: string;
  onChange: (hm: string) => void;
  optional?: boolean;
  testID: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('09:00');
  const show = () => {
    setDraft(HM.test(value) ? value : '09:00');
    setOpen(true);
  };
  return (
    <>
      <SelectField label={label} value={value || undefined} placeholder={optional ? t('sanStaff.time.default') : '—'} icon="clock" onPress={show} testID={testID} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.body} testID={`${testID}-sheet`}>
          <View style={styles.steppers}>
            <Stepper label={t('sanStaff.time.hour')} value={draft.slice(0, 2)} onStep={(d) => setDraft((x) => stepTime(x, 'h', d))} testID={`${testID}-h`} />
            <Text variant="number">:</Text>
            <Stepper label={t('sanStaff.time.minute')} value={draft.slice(3)} onStep={(d) => setDraft((x) => stepTime(x, 'm', d))} testID={`${testID}-m`} />
          </View>
          <Button testID={`${testID}-done`} label={t('common.done')} full onPress={() => { onChange(draft); setOpen(false); }} />
          {optional && !!value && <Button testID={`${testID}-clear`} label={t('sanStaff.time.clear')} variant="ghost" full onPress={() => { onChange(''); setOpen(false); }} />}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  steppers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  col: { alignItems: 'center', gap: 4 },
});
