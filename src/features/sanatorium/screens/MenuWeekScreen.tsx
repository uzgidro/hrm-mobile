// Kitchen: the whole week's menu in one form (3 meals + diet dishes per day) with week navigation.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Card, IconButton, PageHeader, Screen, Text } from '@/ui';
import { usePutMenu } from '../api/mutations';
import { menuQuery } from '../api/queries';
import { ErrorLine } from '../components/forms';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import { MEALS, type Meal, type MenuDay } from '../types';
import { addDays, fmtDate, sanErrorMessage, todayIso } from '../utils/sanatorium';

const DAYS = 7;

export default function MenuWeekScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('kitchen');
  const [start, setStart] = useState(todayIso());
  const q = useQuery(menuQuery(start, DAYS, allowed));
  if (!allowed) return <Denied />;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-menu-screen">
      <PageHeader title={t('sanatorium.weekMenu')} subtitle={`${fmtDate(start)} – ${fmtDate(addDays(start, DAYS - 1))}`} />
      <View style={styles.nav}>
        <IconButton icon="chevronLeft" tone="soft" accessibilityLabel={t('sanatorium.prevWeek')} onPress={() => setStart((s) => addDays(s, -DAYS))} testID="menu-prev" />
        <Button label={t('sanatorium.thisWeek')} variant="ghost" size="sm" onPress={() => setStart(todayIso())} />
        <IconButton icon="chevronRight" tone="soft" accessibilityLabel={t('sanatorium.nextWeek')} onPress={() => setStart((s) => addDays(s, DAYS))} testID="menu-next" />
      </View>
      <QueryBlock query={q}>{(days) => <WeekForm key={`${start}:${JSON.stringify(days)}`} start={start} days={days} />}</QueryBlock>
    </Screen>
  );
}

type Cell = { dishes: string; diet: string };
type Draft = Record<string, Cell>; // key = `${date}|${meal}`

function WeekForm({ start, days }: { start: string; days: MenuDay[] }) {
  const { t } = useTranslation();
  const save = usePutMenu();
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const [draft, setDraft] = useState<Draft>(() => {
    const d: Draft = {};
    for (const date of dates) for (const m of MEALS) d[`${date}|${m}`] = { dishes: '', diet: '' };
    for (const day of days) for (const m of day.meals) d[`${day.date}|${m.meal}`] = { dishes: m.dishes ?? '', diet: m.diet_dishes ?? '' };
    return d;
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: string, patch: Partial<Cell>) => setDraft((d) => ({ ...d, [key]: { ...d[key]!, ...patch } }));

  const submit = async () => {
    try {
      await save.mutateAsync(
        dates.flatMap((date) =>
          MEALS.map((m: Meal) => ({ menu_date: date, meal: m, dishes: draft[`${date}|${m}`]!.dishes.trim(), diet_dishes: draft[`${date}|${m}`]!.diet.trim() || null })),
        ),
      );
      setError(null);
      toast.success(t('sanatorium.menuSaved'));
      router.back();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.stack}>
      {dates.map((date) => (
        <Card key={date} testID={`week-${date}`}>
          <Text variant="heading" style={styles.dayTitle}>{fmtDate(date)}</Text>
          {MEALS.map((m) => (
            <View key={m}>
              <FormInput label={t(`sanatorium.meal.${m}`)} value={draft[`${date}|${m}`]!.dishes} onChangeText={(v) => set(`${date}|${m}`, { dishes: v })} multiline testID={`wk-${date}-${m}`} />
              <FormInput label={`${t(`sanatorium.meal.${m}`)} · ${t('sanatorium.diet')}`} value={draft[`${date}|${m}`]!.diet} onChangeText={(v) => set(`${date}|${m}`, { diet: v })} multiline />
            </View>
          ))}
        </Card>
      ))}
      <ErrorLine message={error} />
      <Button testID="week-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dayTitle: { marginBottom: 6 },
});
