// Diet building blocks: the stay's diet + allergies editor (registrar, treating doctor), the
// optional diet picker of booking forms and the kitchen's diet view.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, Sheet, Text } from '@/ui';
import { dietCountsQuery, dietDayQuery, dietsQuery, useSaveStayDiet, type Diet } from '../../api/sections2';
import { DayBar, QueryBlock } from '../common';
import { ChoiceField, ErrorLine } from '../forms';
import { fmtDate, sanErrorMessage, todayIso } from '../../utils/sanatorium';
import { pickText } from '../../utils/sections2';
import { HBar, useContentLang } from './kit';

/** Diet catalog as picker options (active diets only for non-registrars; the server decides). */
export function useDietOptions(enabled: boolean) {
  const lang = useContentLang();
  const q = useQuery(dietsQuery(false, enabled));
  return { q, options: (q.data ?? []).map((d) => ({ value: d.id, label: `${d.code} · ${pickText(d as never, 'name', lang)}` })) };
}

/** Stay diet + diet note + allergies. Send only what changed; `diet_id: null` clears the diet. */
export function StayDietSheet({
  stay, onClose,
}: {
  stay: { id: number; diet_id?: number | null; diet_note?: string | null } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!stay} onClose={onClose} title={t('sanatorium.s2.dietAndAllergies')} scroll>
      {stay && <DietForm key={stay.id} stay={stay} onClose={onClose} />}
    </Sheet>
  );
}

function DietForm({ stay, onClose }: { stay: { id: number; diet_id?: number | null; diet_note?: string | null }; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveStayDiet();
  const { q, options } = useDietOptions(true);
  const [dietId, setDietId] = useState<number | null>(stay.diet_id ?? null);
  const [note, setNote] = useState(stay.diet_note ?? '');
  // Allergies are sensitive and not part of the stay payload: left blank = unchanged.
  const [allergies, setAllergies] = useState('');
  const [clear, setClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    try {
      await save.mutateAsync({
        id: stay.id,
        body: {
          ...(dietId !== (stay.diet_id ?? null) ? { diet_id: dietId } : {}),
          ...(note.trim() !== (stay.diet_note ?? '') ? { diet_note: note.trim() || null } : {}),
          ...(clear ? { allergies: null } : allergies.trim() ? { allergies: allergies.trim() } : {}),
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
      <FormInput label={t('sanatorium.dietNote')} value={note} onChangeText={setNote} multiline testID="sd-note" />
      <FormInput label={t('sanatorium.s2.allergies')} value={allergies} onChangeText={(v) => { setAllergies(v); setClear(false); }} placeholder={t('sanatorium.s2.allergiesPlaceholder')} multiline testID="sd-allergies" />
      <Button label={clear ? t('sanatorium.s2.allergiesWillClear') : t('sanatorium.s2.clearAllergies')} size="sm" variant={clear ? 'danger' : 'dangerGhost'} onPress={() => { setClear((v) => !v); setAllergies(''); }} testID="sd-clear" />
      <ErrorLine message={error} testID="sd-error" />
      <Button testID="sd-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

/** Kitchen: the day's diet list with counts per diet, allergy list and the coming days' counts. */
export function KitchenDietView() {
  const { t } = useTranslation();
  const lang = useContentLang();
  const [day, setDay] = useState(todayIso());
  const q = useQuery(dietDayQuery(day));
  const counts = useQuery(dietCountsQuery(todayIso(), 7));
  const dietName = (d: Diet | null) => (d ? `${d.code} · ${pickText(d as never, 'name', lang)}` : t('sanatorium.s2.noDiet'));
  return (
    <View style={styles.stack} testID="kitchen-diet-view">
      <DayBar value={day} onChange={setDay} />
      <QueryBlock query={q}>
        {(d) => (
          <View style={styles.stack}>
            <Card title={t('sanatorium.s2.dietCounts')} icon="gift" tint="orange">
              <Text variant="caption" tone="muted">{t('sanatorium.total')}: {d.total}</Text>
              {d.by_diet.map((x, i) => <HBar key={i} label={dietName(x.diet)} value={x.count} max={d.total} />)}
            </Card>
            {d.allergy_count > 0 && (
              <Card title={`${t('sanatorium.s2.allergyList')} (${d.allergy_count})`} icon="bell" tint="pink" testID="allergy-list">
                {d.allergic_guests.map((g) => (
                  <ListRow key={g.stay_id} title={g.guest.full_name} subtitle={`${g.room ? `${t('sanatorium.room')} ${g.room} · ` : ''}${g.allergies ?? ''}`} />
                ))}
              </Card>
            )}
            <Card title={t('sanatorium.s2.dietGuests')} icon="users" tint="green">
              {d.guests.length === 0 && <EmptyState title={t('sanatorium.s2.noDietGuests')} />}
              {d.guests.map((g) => (
                <ListRow
                  key={g.stay_id}
                  title={g.guest.full_name}
                  subtitle={[g.room ? `${t('sanatorium.room')} ${g.room}` : null, g.diet_note, g.allergies ? `${t('sanatorium.s2.allergies')}: ${g.allergies}` : null].filter(Boolean).join(' · ')}
                  right={g.diet ? <Badge label={g.diet.code} tone="brand" /> : undefined}
                />
              ))}
            </Card>
          </View>
        )}
      </QueryBlock>
      <QueryBlock query={counts}>
        {(c) => (
          <Card title={t('sanatorium.s2.comingDays')} icon="calendar" tint="cyan" testID="diet-counts">
            {c.days.map((x) => (
              <ListRow
                key={x.date}
                title={fmtDate(x.date)}
                subtitle={Object.entries(x.by_diet).map(([code, n]) => `${code === '-' ? t('sanatorium.s2.noDiet') : code}: ${n}`).join(' · ') || undefined}
                right={<View style={styles.right}><Text variant="heading">{x.total}</Text>{x.with_allergies > 0 && <Badge label={`${t('sanatorium.s2.allergies')}: ${x.with_allergies}`} tone="danger" />}</View>}
              />
            ))}
          </Card>
        )}
      </QueryBlock>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, right: { alignItems: 'flex-end', gap: 2 } });
