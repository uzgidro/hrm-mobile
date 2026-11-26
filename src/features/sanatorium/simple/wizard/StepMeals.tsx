// «Qanday ovqatlanadi?»: meals or not, the diet, the note for the kitchen and each person's allergies.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Chip, Text } from '@/ui';
import { useSanFeatures } from '../../utils/features';
import { pickLang } from '../../utils/sections1';
import { ChoiceCard } from '../components/parts';
import type { ArrivalOptions, OptionDiet } from '../types';
import type { Derived, WizState } from './state';
import type { StepSet } from './StepWho';

export const dietLabel = (x: OptionDiet, lang: string) =>
  [x.code, x.name_uz ? pickLang(lang, { uz: x.name_uz, ru: x.name_ru, en: x.name_en }) : x.name].filter(Boolean).join(' · ');

export function StepMeals({ s, set, o, d }: { s: WizState; set: StepSet; o?: ArrivalOptions; d: Derived }) {
  const { t, i18n } = useTranslation();
  const features = useSanFeatures();
  const meals = o?.meals;
  const times = (['breakfast', 'lunch', 'dinner'] as const).filter((k) => meals?.[k]).map((k) => `${t(`sanatorium.meal.${k}`)} ${meals![k]}`).join(' · ');
  return (
    <View style={styles.stack}>
      <View style={styles.stack} accessibilityRole="radiogroup">
        <ChoiceCard on={s.withMeals} icon="check" title={t('sanFlow.meals.yes')} hint={times || t('sanFlow.meals.yesHint')} onPress={() => set({ withMeals: true, mealsTouched: true })} testID="meals-yes" />
        <ChoiceCard on={!s.withMeals} icon="close" title={t('sanFlow.meals.no')} hint={t('sanFlow.meals.noHint')} onPress={() => set({ withMeals: false, mealsTouched: true })} testID="meals-no" />
      </View>
      {s.withMeals && (
        <>
          {features.on('diet') && (o?.diets.length ?? 0) > 0 && (
            <>
              <Text variant="heading">{t('sanFlow.meals.diet')}</Text>
              <View style={styles.wrap} testID="diet-list">
                <Chip label={t('sanFlow.meals.plain')} selected={!d.dietId} onPress={() => set({ dietId: '', mealsTouched: true })} testID="diet-plain" />
                {o!.diets.map((x) => <Chip key={x.id} label={dietLabel(x, i18n.language)} selected={d.dietId === String(x.id)} onPress={() => set({ dietId: String(x.id), mealsTouched: true })} testID={`diet-${x.id}`} />)}
              </View>
            </>
          )}
          <FormInput label={t('sanFlow.meals.note')} placeholder={t('sanFlow.meals.noteHint')} value={s.dietNote} maxLength={255} onChangeText={(v) => set({ dietNote: v, mealsTouched: true })} testID="wiz-diet-note" />
          {features.on('diet') && (
            <>
              <Text variant="heading">{t('sanFlow.meals.allergy')}</Text>
              {s.members.map((m, i) => (
                <FormInput
                  key={m.key} label={s.members.length > 1 ? m.full_name || t('sanFlow.who.guestN', { n: i + 1 }) : t('sanFlow.meals.allergyShort')} placeholder={t('sanFlow.meals.allergyNone')}
                  value={s.allergies[m.key] ?? ''} maxLength={1000} onChangeText={(v) => set({ allergies: { ...s.allergies, [m.key]: v } })} testID={`wiz-allergies-${i}`}
                />
              ))}
              <Text variant="caption" tone="muted">{t('sanFlow.meals.allergyHint')}</Text>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
