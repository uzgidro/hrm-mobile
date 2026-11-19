// «Place on the territory plan» select used by the room, staff and specialty forms. Renders
// nothing while the territory section is switched off.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { territoryQuery } from '../../api/sections1';
import { useSanFeatures } from '../../utils/features';
import { pickLang } from '../../utils/sections1';
import { ChoiceField } from '../forms';

/** True when the territory section is on, i.e. `poi_id` may be sent with the form. */
export function usePoiOn(): boolean {
  return useSanFeatures().on('territory_map');
}

export function PoiField({ value, onChange, testID }: { value: number | null; onChange: (v: number | null) => void; testID?: string }) {
  const { t, i18n } = useTranslation();
  const on = usePoiOn();
  const q = useQuery(territoryQuery(on));
  if (!on) return null;
  return (
    <ChoiceField
      label={t('san1.poi.field')}
      value={value}
      noneLabel={t('sanatorium.none')}
      loading={q.isPending}
      options={(q.data?.pois ?? []).map((p) => ({
        value: p.id,
        label: pickLang(i18n.language, { uz: p.name_uz, ru: p.name_ru, en: p.name_en }),
        sub: p.floor != null && p.floor !== '' ? `${t('san1.poi.floor')}: ${p.floor}` : undefined,
      }))}
      onChange={onChange}
      testID={testID}
    />
  );
}
