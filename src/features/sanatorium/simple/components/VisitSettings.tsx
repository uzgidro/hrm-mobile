// Settings S8: when the doctor receives, how long a visit lasts, meal times, check-in/out times.
// Shown only when the server returns these fields (an older server would reject them as unknown keys).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Card, Text } from '@/ui';
import { useSaveSettings } from '../../api/mutations';
import { ErrorLine, SwitchRow } from '../../components/forms';
import { GUEST_TYPES, type GuestType, type SanSettings } from '../../types';
import { sanErrorMessage } from '../../utils/sanatorium';
import { splitHours, validateVisitSettings } from '../utils';

export const hasVisitSettings = (s: SanSettings | undefined) => s?.exam_slot_min !== undefined;

export function VisitSettings({ s }: { s: SanSettings }) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const [from0, to0] = splitHours(s.exam_hours);
  const [from, setFrom] = useState(from0);
  const [to, setTo] = useState(to0);
  const [slot, setSlot] = useState(String(s.exam_slot_min ?? 20));
  const [weekend, setWeekend] = useState(!!s.exam_weekend);
  const [types, setTypes] = useState<GuestType[]>((s.exam_types as GuestType[] | undefined) ?? ['treatment']);
  const [bf, setBf] = useState(s.meal_times?.breakfast ?? '');
  const [lunch, setLunch] = useState(s.meal_times?.lunch ?? '');
  const [dinner, setDinner] = useState(s.meal_times?.dinner ?? '');
  const [cin, setCin] = useState(s.checkin_time ?? '');
  const [cout, setCout] = useState(s.checkout_time ?? '');
  const [error, setError] = useState<string | null>(null);
  const toggle = (g: GuestType) => setTypes((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const submit = async () => {
    const bad = validateVisitSettings({ from, to, slot, meals: [bf, lunch, dinner], checkin: cin, checkout: cout });
    if (bad) return setError(t(`sanSimple.val.${bad}`));
    try {
      await save.mutateAsync({
        exam_hours: `${from.trim()}-${to.trim()}`,
        exam_slot_min: Number.parseInt(slot, 10),
        exam_weekend: weekend,
        exam_types: types,
        meal_times: { breakfast: bf.trim(), lunch: lunch.trim(), dinner: dinner.trim() },
        checkin_time: cin.trim(),
        checkout_time: cout.trim(),
      });
      setError(null);
      toast.success(t('sanatorium.saved'));
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Card testID="settings-visit">
      <Text variant="heading">{t('sanSimple.set.examTitle')}</Text>
      <View style={styles.row}>
        <View style={styles.flex}><FormInput label={t('sanSimple.set.from')} value={from} onChangeText={setFrom} placeholder="09:00" testID="set-exam-from" /></View>
        <View style={styles.flex}><FormInput label={t('sanSimple.set.to')} value={to} onChangeText={setTo} placeholder="17:00" testID="set-exam-to" /></View>
      </View>
      <FormInput label={t('sanSimple.set.slot')} value={slot} onChangeText={setSlot} keyboardType="number-pad" testID="set-slot" />
      <SwitchRow label={t('sanSimple.set.weekend')} value={weekend} onChange={setWeekend} testID="set-weekend" />
      <Text variant="label" tone="muted">{t('sanSimple.set.types')}</Text>
      {GUEST_TYPES.map((g) => (
        <SwitchRow key={g} label={t(`sanatorium.guestType.${g}`)} value={types.includes(g)} onChange={() => toggle(g)} testID={`set-type-${g}`} />
      ))}
      <Text variant="heading">{t('sanSimple.set.mealsTitle')}</Text>
      <FormInput label={t('sanatorium.meal.breakfast')} value={bf} onChangeText={setBf} placeholder="08:00" testID="set-meal-breakfast" />
      <FormInput label={t('sanatorium.meal.lunch')} value={lunch} onChangeText={setLunch} placeholder="13:00" testID="set-meal-lunch" />
      <FormInput label={t('sanatorium.meal.dinner')} value={dinner} onChangeText={setDinner} placeholder="19:00" testID="set-meal-dinner" />
      <Text variant="heading">{t('sanSimple.set.stayTitle')}</Text>
      <FormInput label={t('sanSimple.set.checkin')} value={cin} onChangeText={setCin} placeholder="12:00" testID="set-checkin" />
      <FormInput label={t('sanSimple.set.checkout')} value={cout} onChangeText={setCout} placeholder="10:00" testID="set-checkout" />
      <ErrorLine message={error} testID="visit-error" />
      <Button testID="visit-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </Card>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 } });
