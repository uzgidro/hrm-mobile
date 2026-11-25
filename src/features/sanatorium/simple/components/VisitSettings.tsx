// Settings S8: when the doctor receives, how long a visit lasts, meal windows (from / to), check-in/out times.
// Shown only when the server returns these fields (an older server would reject them as unknown keys).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { TimeField } from '../../components/TimeField';
import { toast } from '@/lib/toast';
import { Button, Card, Text } from '@/ui';
import { useSaveSettings } from '../../api/mutations';
import { useSanReadOnly } from '../../components/common';
import { ErrorLine, SwitchRow } from '../../components/forms';
import { GUEST_TYPES, type GuestType, type SanSettings } from '../../types';
import { sanErrorMessage } from '../../utils/sanatorium';
import { splitHours, validateVisitSettings } from '../utils';
import { joinWindow, mealTimesBody, splitWindow, windowValid } from '../../utils/staffParity';

export const hasVisitSettings = (s: SanSettings | undefined) => s?.exam_slot_min !== undefined;

export function VisitSettings({ s }: { s: SanSettings }) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const readOnly = useSanReadOnly();
  const [from0, to0] = splitHours(s.exam_hours);
  const [from, setFrom] = useState(from0);
  const [to, setTo] = useState(to0);
  const [slot, setSlot] = useState(String(s.exam_slot_min ?? 20));
  const [weekend, setWeekend] = useState(!!s.exam_weekend);
  const [types, setTypes] = useState<GuestType[]>((s.exam_types as GuestType[] | undefined) ?? ['treatment']);
  // Each meal is a from / to pair; empty = the server default (the meal is left out of the request).
  const [meals, setMeals] = useState<Record<'breakfast' | 'lunch' | 'dinner', [string, string]>>({
    breakfast: splitWindow(s.meal_times?.breakfast),
    lunch: splitWindow(s.meal_times?.lunch),
    dinner: splitWindow(s.meal_times?.dinner),
  });
  const setMeal = (m: 'breakfast' | 'lunch' | 'dinner', i: 0 | 1, v: string) => setMeals((p) => ({ ...p, [m]: i === 0 ? [v, p[m][1]] : [p[m][0], v] }));
  const [cin, setCin] = useState(s.checkin_time ?? '');
  const [cout, setCout] = useState(s.checkout_time ?? '');
  const [error, setError] = useState<string | null>(null);
  const toggle = (g: GuestType) => setTypes((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const submit = async () => {
    const names = ['breakfast', 'lunch', 'dinner'] as const;
    const mealsOk = names.every((m) => windowValid(meals[m][0], meals[m][1]));
    const bad = validateVisitSettings({ from, to, slot, meals: names.map((m) => joinWindow(meals[m][0], meals[m][1])).filter((x): x is string => !!x), checkin: cin, checkout: cout });
    if (bad) return setError(t(`sanSimple.val.${bad}`));
    if (!mealsOk) return setError(t('sanSimple.val.meal_time'));
    try {
      await save.mutateAsync({
        exam_hours: `${from.trim()}-${to.trim()}`,
        exam_slot_min: Number.parseInt(slot, 10),
        exam_weekend: weekend,
        exam_types: types,
        meal_times: mealTimesBody(meals),
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
        <View style={styles.flex}><TimeField label={t('sanSimple.set.from')} value={from} onChange={setFrom} testID="set-exam-from" /></View>
        <View style={styles.flex}><TimeField label={t('sanSimple.set.to')} value={to} onChange={setTo} testID="set-exam-to" /></View>
      </View>
      <FormInput label={t('sanSimple.set.slot')} value={slot} onChangeText={setSlot} keyboardType="number-pad" maxLength={3} testID="set-slot" />
      <SwitchRow label={t('sanSimple.set.weekend')} value={weekend} onChange={setWeekend} testID="set-weekend" />
      <Text variant="label" tone="muted">{t('sanSimple.set.types')}</Text>
      {GUEST_TYPES.map((g) => (
        <SwitchRow key={g} label={t(`sanatorium.guestType.${g}`)} value={types.includes(g)} onChange={() => toggle(g)} testID={`set-type-${g}`} />
      ))}
      <Text variant="heading">{t('sanSimple.set.mealsTitle')}</Text>
      <Text variant="caption" tone="muted">{t('sanStaff.regime.mealHint')}</Text>
      {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
        <View key={m}>
          <Text variant="label" tone="muted">{t(`sanatorium.meal.${m}`)}</Text>
          <View style={styles.row}>
            <View style={styles.flex}><TimeField optional label={t('sanSimple.set.from')} value={meals[m][0]} onChange={(v) => setMeal(m, 0, v)} testID={`set-meal-${m}-from`} /></View>
            <View style={styles.flex}><TimeField optional label={t('sanSimple.set.to')} value={meals[m][1]} onChange={(v) => setMeal(m, 1, v)} testID={`set-meal-${m}-to`} /></View>
          </View>
        </View>
      ))}
      <Text variant="heading">{t('sanSimple.set.stayTitle')}</Text>
      <View style={styles.row}>
        <View style={styles.flex}><TimeField label={t('sanSimple.set.checkin')} value={cin} onChange={setCin} testID="set-checkin" /></View>
        <View style={styles.flex}><TimeField label={t('sanSimple.set.checkout')} value={cout} onChange={setCout} testID="set-checkout" /></View>
      </View>
      <ErrorLine message={error} testID="visit-error" />
      {!readOnly && <Button testID="visit-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />}
    </Card>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 } });
