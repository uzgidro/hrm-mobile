// Kitchen: arrivals / departures strip, headcounts, the eating list and the menu (view + a simple day editor).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Card, PageHeader, Screen, Segmented, Sheet, Text } from '@/ui';
import { usePutMenu } from '../api/mutations';
import { menuQuery, sanKeys } from '../api/queries';
import { Denied, QueryBlock, useSanAccess, useSanReadOnly } from '../components/common';
import { FeatureOff } from '../components/sections1/shared';
import { KitchenCounts, KitchenFlowStrip, KitchenToday } from '../components/KitchenParts';
import { KitchenDietView } from '../components/sections2/DietParts';
import { useSanFeatures } from '../utils/features';
import { MEALS, type Meal, type MenuDay, type MenuMeal } from '../types';
import { fmtDate, sanErrorMessage, todayIso } from '../utils/sanatorium';

type Seg = 'counts' | 'today' | 'menu' | 'diets';

export default function KitchenScreen() {
  const { t } = useTranslation();
  // The registrar (and the view-only chairman) opens the kitchen too, as on the web.
  const allowed = useSanAccess('kitchen', 'registrar');
  const readOnly = useSanReadOnly();
  const { on, loaded } = useSanFeatures();
  const [seg, setSeg] = useState<Seg>('counts');
  const today = todayIso();
  const menu = useQuery(menuQuery(today, 7, allowed && seg === 'menu'));
  const [editing, setEditing] = useState<MenuDay | null>(null);
  const dietOn = useSanFeatures().on('diet');
  const qc = useQueryClient();
  const [spin, setSpin] = useState(false);
  // Pull to refresh reloads whatever tab is open (they all live under the sanatorium query key).
  const refresh = async () => {
    setSpin(true);
    try {
      await qc.invalidateQueries({ queryKey: sanKeys.all });
    } finally {
      setSpin(false);
    }
  };
  if (!allowed) return <Denied />;
  if (loaded && !on('kitchen_menu')) return <FeatureOff />;
  const dietSeg = seg === 'diets';

  return (
    <Screen refreshing={spin} onRefresh={() => void refresh()} testID="sanatorium-kitchen-screen">
      <PageHeader title={t('sanatorium.nav.kitchen')} subtitle={fmtDate(today)} />
      <KitchenFlowStrip enabled />
      <Segmented
        testID="kitchen-seg"
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'counts', label: t('sanatorium.counts') },
          { value: 'today', label: t('sanatorium.eatingToday') },
          { value: 'menu', label: t('sanatorium.menu') },
          ...(dietOn ? [{ value: 'diets' as const, label: t('sanatorium.s2.diets') }] : []),
        ]}
      />
      <View style={styles.body}>
        {dietSeg && <KitchenDietView />}
        {seg === 'counts' && <KitchenCounts enabled />}
        {seg === 'today' && <KitchenToday enabled />}
        {seg === 'menu' && !readOnly && <Button testID="menu-week" label={t('sanatorium.editWeek')} icon="edit" variant="soft" full onPress={() => router.push('/sanatorium-menu')} />}
        {seg === 'menu' && (
          <QueryBlock query={menu}>
            {(days) => (
              <View style={styles.stack}>
                {days.map((d) => (
                  <Card key={d.date} testID={`menu-${d.date}`}>
                    <View style={styles.row}>
                      <Text variant="heading" style={styles.flex}>{fmtDate(d.date)}</Text>
                      {!readOnly && <Button label={t("sanatorium.edit")} variant="soft" size="sm" icon="edit" onPress={() => setEditing(d)} testID="menu-edit" />}
                    </View>
                    {MEALS.map((m) => {
                      const x = d.meals.find((y) => y.meal === m);
                      return (
                        <View key={m} style={styles.meal}>
                          <Text variant="label" tone="brand">{t(`sanatorium.meal.${m}`)}</Text>
                          <Text variant="body">{x?.dishes || '—'}</Text>
                          {!!x?.diet_dishes && <Text variant="caption" tone="muted">{t('sanatorium.diet')}: {x.diet_dishes}</Text>}
                        </View>
                      );
                    })}
                  </Card>
                ))}
              </View>
            )}
          </QueryBlock>
        )}
      </View>
      <MenuEditor day={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

type Draft = Record<Meal, { dishes: string; diet: string }>;
const emptyDraft = (): Draft => ({ breakfast: { dishes: '', diet: '' }, lunch: { dishes: '', diet: '' }, dinner: { dishes: '', diet: '' } });

function MenuEditor({ day, onClose }: { day: MenuDay | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!day} onClose={onClose} title={day ? `${t('sanatorium.menu')} · ${fmtDate(day.date)}` : undefined} scroll>
      {day && <MenuForm key={day.date} day={day} onClose={onClose} />}
    </Sheet>
  );
}

// Mounted per opening; the draft starts from the day's saved dishes.
function MenuForm({ day, onClose }: { day: MenuDay; onClose: () => void }) {
  const { t } = useTranslation();
  const save = usePutMenu();
  const [draft, setDraft] = useState<Draft>(() => {
    const d = emptyDraft();
    for (const m of day.meals as MenuMeal[]) d[m.meal] = { dishes: m.dishes ?? '', diet: m.diet_dishes ?? '' };
    return d;
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      await save.mutateAsync(
        MEALS.map((m) => ({ menu_date: day.date, meal: m, dishes: draft[m].dishes.trim(), diet_dishes: draft[m].diet.trim() || null })),
      );
      toast.success(t('sanatorium.menuSaved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View testID="menu-editor">
        {MEALS.map((m) => (
          <View key={m}>
            <FormInput
              label={t(`sanatorium.meal.${m}`)}
              value={draft[m].dishes}
              onChangeText={(v) => setDraft((d) => ({ ...d, [m]: { ...d[m], dishes: v } }))}
              multiline
              maxLength={2000}
              testID={`menu-${m}`}
            />
            <FormInput
              label={`${t(`sanatorium.meal.${m}`)} · ${t('sanatorium.diet')}`}
              value={draft[m].diet}
              onChangeText={(v) => setDraft((d) => ({ ...d, [m]: { ...d[m], diet: v } }))}
              multiline
              maxLength={2000}
            />
          </View>
        ))}
        {!!error && <Text variant="label" tone="danger">{error}</Text>}
        <Button testID="menu-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { marginTop: 12 },
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  meal: { paddingVertical: 4, gap: 1 },
});
