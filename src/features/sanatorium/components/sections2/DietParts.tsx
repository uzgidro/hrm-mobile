// Diet building blocks: the stay's diet + allergies editor (registrar, treating doctor), the
// optional diet picker of booking forms and the kitchen's diet view.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, SearchField, Sheet, Text } from '@/ui';
import { dietCountsQuery, dietDayQuery, dietsQuery, useSaveStayDiet, type Diet } from '../../api/sections2';
import { DayBar, QueryBlock } from '../common';
import { ChoiceField, DateField, ErrorLine } from '../forms';
import { fmtDate, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { DIET_COUNT_DAYS, NO_DIET, canEditStayDiet, dietCodes, dietRoomNumber, filterDietGuests, pickText } from '../../utils/sections2';
import { ChipWrap, HBar, useContentLang } from './kit';

export { canEditStayDiet };

/** Diet catalog as picker options (active diets only for non-registrars; the server decides). */
export function useDietOptions(enabled: boolean) {
  const lang = useContentLang();
  const q = useQuery(dietsQuery(false, enabled));
  return { q, options: (q.data ?? []).map((d) => ({ value: d.id, label: `${d.code} · ${pickText(d as never, 'name', lang)}` })) };
}

/** Stay shape the diet editor needs; `allergies` is prefilled when the server sends it (stay or stay.guest). */
export type DietStay = {
  id: number; diet_id?: number | null; diet_note?: string | null; allergies?: string | null; guest?: object | null;
};
const knownAllergies = (s: DietStay): string | undefined => {
  if (s.allergies !== undefined) return s.allergies ?? '';
  const g = (s.guest ?? null) as { allergies?: string | null } | null;
  return g && g.allergies !== undefined ? g.allergies ?? '' : undefined;
};

/** Stay diet + diet note + allergies. Send only what changed; `diet_id: null` clears the diet.
 *  The registrar and the stay's attending doctor may open it (see `canEditStayDiet`). */
export function StayDietSheet({ stay, onClose }: { stay: DietStay | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!stay} onClose={onClose} title={t('sanatorium.s2.dietAndAllergies')} scroll>
      {stay && <DietForm key={stay.id} stay={stay} onClose={onClose} />}
    </Sheet>
  );
}

function DietForm({ stay, onClose }: { stay: DietStay; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveStayDiet();
  const { q, options } = useDietOptions(true);
  const initialAllergies = knownAllergies(stay);
  const [dietId, setDietId] = useState<number | null>(stay.diet_id ?? null);
  const [note, setNote] = useState(stay.diet_note ?? '');
  // Prefilled when the server gives the allergies; otherwise blank = unchanged and a clear switch.
  const [allergies, setAllergies] = useState(initialAllergies ?? '');
  const [clear, setClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const allergyPatch =
      initialAllergies !== undefined
        ? allergies.trim() !== initialAllergies.trim() ? { allergies: allergies.trim() || null } : {}
        : clear ? { allergies: null } : allergies.trim() ? { allergies: allergies.trim() } : {};
    try {
      await save.mutateAsync({
        id: stay.id,
        body: {
          ...(dietId !== (stay.diet_id ?? null) ? { diet_id: dietId } : {}),
          ...(note.trim() !== (stay.diet_note ?? '') ? { diet_note: note.trim() || null } : {}),
          ...allergyPatch,
        },
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="stay-diet-form">
      <ChoiceField label={t('sanatorium.s2.diet')} value={dietId} noneLabel={t('sanatorium.none')} options={options} onChange={setDietId} loading={q.isPending} testID="sd-diet" />
      <FormInput label={t('sanatorium.dietNote')} value={note} onChangeText={setNote} multiline maxLength={255} testID="sd-note" />
      <FormInput label={t('sanatorium.s2.allergies')} value={allergies} onChangeText={(v) => { setAllergies(v); setClear(false); }} placeholder={t('sanatorium.s2.allergiesPlaceholder')} multiline maxLength={1000} testID="sd-allergies" />
      <Text variant="caption" tone="subtle">{t('sanCatalog.diet.allergiesHint')}</Text>
      {initialAllergies === undefined && (
        <Button label={clear ? t('sanatorium.s2.allergiesWillClear') : t('sanatorium.s2.clearAllergies')} size="sm" variant={clear ? 'danger' : 'dangerGhost'} onPress={() => { setClear((v) => !v); setAllergies(''); }} testID="sd-clear" />
      )}
      <ErrorLine message={error} testID="sd-error" />
      <Button testID="sd-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

/** Kitchen: the day's diet list (search + diet filter), counts per diet, allergies and the coming days. */
export function KitchenDietView() {
  const { t } = useTranslation();
  const lang = useContentLang();
  const [day, setDay] = useState(todayIso());
  const [search, setSearch] = useState('');
  const [dietFilter, setDietFilter] = useState<string | null>(null);
  const q = useQuery(dietDayQuery(day));
  const dietName = (d: Diet | null) => (d ? `${d.code} · ${pickText(d as never, 'name', lang)}` : t('sanatorium.s2.noDiet'));
  return (
    <View style={styles.stack} testID="kitchen-diet-view">
      <DayBar value={day} onChange={setDay} />
      <QueryBlock query={q}>
        {(d) => {
          const guests = filterDietGuests(d.guests, search, dietFilter);
          const options = [
            ...d.by_diet.filter((b) => b.diet).map((b) => ({ value: String(b.diet!.id), label: dietName(b.diet) })),
            { value: NO_DIET, label: t('sanatorium.s2.noDiet') },
          ];
          return (
            <View style={styles.stack}>
              <Card title={t('sanatorium.s2.dietCounts')} icon="gift" tint="orange">
                <Text variant="caption" tone="muted">{t('sanatorium.total')}: {d.total}</Text>
                {d.by_diet.map((x, i) => <HBar key={i} label={dietName(x.diet)} value={x.count} max={d.total} />)}
              </Card>
              {d.allergy_count > 0 && (
                <Card title={`${t('sanatorium.s2.allergyList')} (${d.allergy_count})`} icon="bell" tint="pink" testID="allergy-list">
                  {d.allergic_guests.map((g) => (
                    <ListRow key={g.stay_id} title={g.guest.full_name} subtitle={`${dietRoomNumber(g.room) ? `${t('sanatorium.room')} ${dietRoomNumber(g.room)} · ` : ''}${g.allergies ?? ''}`} />
                  ))}
                </Card>
              )}
              <Card title={t('sanatorium.s2.dietGuests')} icon="users" tint="green" testID="diet-guests">
                <SearchField testID="diet-search" value={search} onChangeText={setSearch} placeholder={t('sanCatalog.diet.searchGuest')} />
                <ChoiceField label={t('sanatorium.s2.diet')} value={dietFilter} noneLabel={t('sanCatalog.diet.anyDiet')} options={options} onChange={setDietFilter} testID="diet-filter" />
                {guests.length === 0 && <EmptyState title={t('sanatorium.s2.noDietGuests')} />}
                {guests.map((g) => (
                  <ListRow
                    key={g.stay_id}
                    testID={`diet-guest-${g.stay_id}`}
                    title={g.guest.full_name}
                    subtitle={[dietRoomNumber(g.room) ? `${t('sanatorium.room')} ${dietRoomNumber(g.room)}` : null, g.diet_note, g.allergies ? `${t('sanatorium.s2.allergies')}: ${g.allergies}` : null].filter(Boolean).join(' · ')}
                    right={g.diet ? <Badge label={g.diet.code} tone="brand" /> : undefined}
                  />
                ))}
              </Card>
            </View>
          );
        }}
      </QueryBlock>
      <DietCounts />
    </View>
  );
}

/** Coming days: pick the start date and 7 / 14 / 30 days; one row per day with the count per diet. */
export function DietCounts() {
  const { t } = useTranslation();
  const lang = useContentLang();
  const [start, setStart] = useState(todayIso());
  const [days, setDays] = useState<number>(7);
  const counts = useQuery(dietCountsQuery(start, days));
  const diets = useQuery(dietsQuery(false));
  const nameOf = (code: string) => (code === NO_DIET ? t('sanatorium.s2.noDiet') : (diets.data ?? []).find((x) => x.code === code) ? pickText((diets.data ?? []).find((x) => x.code === code) as never, 'name', lang) : code);
  return (
    <Card title={t('sanatorium.s2.comingDays')} icon="calendar" tint="cyan" testID="diet-counts">
      <DateField label={t('sanCatalog.diet.startDate')} value={start} onChange={setStart} testID="dc-start" />
      <ChipWrap options={DIET_COUNT_DAYS.map((n) => ({ value: n as number, label: t('sanCatalog.diet.daysN', { n }) }))} isOn={(v) => v === days} onToggle={setDays} testID="dc-days" />
      <QueryBlock query={counts}>
        {(c) => {
          const codes = dietCodes(c.days);
          return (
            <View>
              {codes.length > 0 && (
                <Text variant="caption" tone="subtle" testID="dc-legend">{codes.map((code) => `${code === NO_DIET ? t('sanatorium.s2.noDiet') : code} = ${nameOf(code)}`).join(' · ')}</Text>
              )}
              {c.days.length === 0 && <EmptyState title={t('sanatorium.s2.noDietGuests')} />}
              {c.days.map((x) => (
                <ListRow
                  key={x.date}
                  title={fmtDate(x.date)}
                  subtitle={Object.entries(x.by_diet).map(([code, n]) => `${code === NO_DIET ? t('sanatorium.s2.noDiet') : code}: ${n}`).join(' · ') || undefined}
                  right={<View style={styles.right}><Text variant="heading">{x.total}</Text>{x.with_allergies > 0 && <Badge label={`${t('sanatorium.s2.allergies')}: ${x.with_allergies}`} tone="danger" />}</View>}
                />
              ))}
            </View>
          );
        }}
      </QueryBlock>
    </Card>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, right: { alignItems: 'flex-end', gap: 2 } });
