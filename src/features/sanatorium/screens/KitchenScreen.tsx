// Kitchen: seven-day headcounts, today's eating list and the menu (view + a simple day editor).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, Segmented, Sheet, Text } from '@/ui';
import { usePutMenu } from '../api/mutations';
import { countsQuery, kitchenDayQuery, menuQuery } from '../api/queries';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import { MEALS, type Meal, type MenuDay, type MenuMeal } from '../types';
import { fmtDate, sanErrorMessage, todayIso } from '../utils/sanatorium';

type Seg = 'counts' | 'today' | 'menu';

export default function KitchenScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('kitchen');
  const [seg, setSeg] = useState<Seg>('counts');
  const today = todayIso();
  const counts = useQuery(countsQuery(today, 7, allowed && seg === 'counts'));
  const list = useQuery(kitchenDayQuery(today, allowed && seg === 'today'));
  const menu = useQuery(menuQuery(today, 7, allowed && seg === 'menu'));
  const [editing, setEditing] = useState<MenuDay | null>(null);
  if (!allowed) return <Denied />;
  const cur = seg === 'counts' ? counts : seg === 'today' ? list : menu;

  return (
    <Screen refreshing={cur.isRefetching} onRefresh={() => void cur.refetch()} testID="sanatorium-kitchen-screen">
      <PageHeader title={t('sanatorium.nav.kitchen')} subtitle={fmtDate(today)} />
      <Segmented
        testID="kitchen-seg"
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'counts', label: t('sanatorium.counts') },
          { value: 'today', label: t('sanatorium.eatingToday') },
          { value: 'menu', label: t('sanatorium.menu') },
        ]}
      />
      <View style={styles.body}>
        {seg === 'counts' && (
          <QueryBlock query={counts}>
            {(c) => (
              <View style={styles.stack}>
                {c.days.map((d) => (
                  <Card key={d.date} testID={`count-${d.date}`}>
                    <View style={styles.row}>
                      <Text variant="heading" style={styles.flex}>{fmtDate(d.date)}</Text>
                      <Text variant="number">{d.total}</Text>
                    </View>
                    <Text variant="caption" tone="muted">
                      {t('sanatorium.adults')}: {d.adults} · {t('sanatorium.children')}: {d.children} · {t('sanatorium.diet')}: {d.diet}
                    </Text>
                  </Card>
                ))}
                {(c.early_leaves ?? []).length > 0 && (
                  <Card title={t('sanatorium.earlyLeaves')} icon="logout" tint="amber">
                    {c.early_leaves!.map((e, i) => (
                      <ListRow key={i} title={e.guest.full_name} subtitle={fmtDate(e.date)} />
                    ))}
                  </Card>
                )}
              </View>
            )}
          </QueryBlock>
        )}
        {seg === 'today' && (
          <QueryBlock query={list}>
            {(items) =>
              items.length === 0 ? (
                <EmptyState title={t('sanatorium.noEating')} />
              ) : (
                <Card>
                  {items.map((p) => (
                    <ListRow
                      key={p.stay_id}
                      testID={`eat-${p.stay_id}`}
                      title={p.guest.full_name}
                      subtitle={[p.room ? `${t('sanatorium.room')} ${p.room}` : null, p.diet_note].filter(Boolean).join(' · ')}
                      right={
                        p.diet_note ? <Badge label={t('sanatorium.diet')} tone="warning" /> : p.is_child ? <Badge label={t('sanatorium.child')} tone="info" /> : undefined
                      }
                    />
                  ))}
                </Card>
              )
            }
          </QueryBlock>
        )}
        {seg === 'menu' && (
          <QueryBlock query={menu}>
            {(days) => (
              <View style={styles.stack}>
                {days.map((d) => (
                  <Card key={d.date} testID={`menu-${d.date}`}>
                    <View style={styles.row}>
                      <Text variant="heading" style={styles.flex}>{fmtDate(d.date)}</Text>
                      <Button label={t('sanatorium.edit')} variant="soft" size="sm" icon="edit" onPress={() => setEditing(d)} testID="menu-edit" />
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
              testID={`menu-${m}`}
            />
            <FormInput
              label={`${t(`sanatorium.meal.${m}`)} · ${t('sanatorium.diet')}`}
              value={draft[m].diet}
              onChangeText={(v) => setDraft((d) => ({ ...d, [m]: { ...d[m], diet: v } }))}
              multiline
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
