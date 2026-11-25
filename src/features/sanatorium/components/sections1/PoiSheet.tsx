// Create / edit one point of interest: names and descriptions in uz / ru / en, kind, floor and
// the position — tap the plan to place the pin (stored as percentages of the image).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSingleFlight } from '../../simple/useSingleFlight';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet, Text } from '@/ui';
import { useDeletePoi, useSavePoi } from '../../api/sections1';
import { POI_KINDS, type Poi, type PoiKind, type TerritoryPlan } from '../../types1';
import { parseFloor } from '../../utils/sections1';
import { sanErrorMessage } from '../../utils/sanatorium';
import { ChoiceField, ErrorLine, optNull, SwitchRow } from '../forms';
import { PlanView } from './PlanView';
import { askDelete, LangFields } from './shared';

export function PoiSheet({ poi, plan, others, onClose }: { poi: Poi | 'new' | null; plan: TerritoryPlan; others: Poi[]; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!poi} onClose={onClose} title={poi === 'new' ? t('san1.territory.addPoi') : t('san1.territory.editPoi')} scroll>
      {poi && <PoiForm key={poi === 'new' ? 'new' : poi.id} poi={poi === 'new' ? null : poi} plan={plan} others={others} onClose={onClose} />}
    </Sheet>
  );
}

function PoiForm({ poi, plan, others, onClose }: { poi: Poi | null; plan: TerritoryPlan; others: Poi[]; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSavePoi();
  const del = useDeletePoi();
  const [name, setName] = useState({ uz: poi?.name_uz ?? '', ru: poi?.name_ru ?? '', en: poi?.name_en ?? '' });
  const [desc, setDesc] = useState({ uz: poi?.description_uz ?? '', ru: poi?.description_ru ?? '', en: poi?.description_en ?? '' });
  const [kind, setKind] = useState<PoiKind>(poi?.kind ?? 'building');
  const [floor, setFloor] = useState(poi?.floor != null ? String(poi.floor) : '');
  const [pos, setPos] = useState<{ x_pct: number; y_pct: number } | null>(poi ? { x_pct: poi.x_pct, y_pct: poi.y_pct } : null);
  const [active, setActive] = useState(poi?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const flight = useSingleFlight();
  const submit = async () => {
    if (!name.uz.trim()) return setError(t('sanatorium.nameShort'));
    if (!pos) return setError(t('san1.territory.placeFirst'));
    // The server stores the floor as an integer (-5..100) or null.
    const fl = parseFloor(floor);
    if (!fl.ok) return setError(t('sanPlaces.territory.floorInvalid'));
    try {
      await save.mutateAsync({
        id: poi?.id,
        body: {
          name_uz: name.uz.trim(),
          name_ru: optNull(name.ru),
          name_en: optNull(name.en),
          kind,
          x_pct: pos.x_pct,
          y_pct: pos.y_pct,
          floor: fl.value,
          description_uz: optNull(desc.uz),
          description_ru: optNull(desc.ru),
          description_en: optNull(desc.en),
          is_active: active,
        },
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const remove = async () => {
    if (!poi || !(await askDelete(t, t('san1.territory.deletePoi')))) return;
    try {
      await del.mutateAsync(poi.id);
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="poi-sheet">
      {plan ? (
        <PlanView plan={plan} pois={others.filter((p) => p.id !== poi?.id)} draft={pos} onTap={setPos} />
      ) : (
        <Text variant="caption" tone="muted">{t('san1.territory.noPlanForPin')}</Text>
      )}
      <LangFields label={t('sanatorium.name')} values={name} onChange={setName} requiredUz maxLength={150} testID="poi-name" />
      <ChoiceField label={t('san1.poi.kindLabel')} value={kind} options={POI_KINDS.map((k) => ({ value: k as PoiKind, label: t(`san1.poi.kind.${k}`) }))} onChange={(v) => v && setKind(v)} testID="poi-kind" />
      <FormInput label={t('san1.poi.floor')} value={floor} onChangeText={setFloor} keyboardType="numbers-and-punctuation" maxLength={4} testID="poi-floor" />
      <LangFields label={t('sanatorium.description')} values={desc} onChange={setDesc} multiline maxLength={1000} testID="poi-desc" />
      <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} />
      <ErrorLine message={error} testID="poi-error" />
      <Button testID="poi-save" label={t('common.save')} full loading={save.isPending} onPress={() => void flight.run(submit)} />
      {poi && <Button testID="poi-delete" label={t('sanatorium.remove')} variant="dangerGhost" full loading={del.isPending} onPress={() => void flight.run(remove)} />}
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 6, paddingBottom: 8 } });
