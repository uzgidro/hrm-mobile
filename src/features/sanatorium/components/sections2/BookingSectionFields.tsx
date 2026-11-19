// Optional package / organization / diet pickers of the booking field group. Each one hides itself
// when its section is switched off (or, for the organization, when the user is not the registrar).
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { orgsQuery, packagesQuery } from '../../api/sections2';
import { useSanFeatures } from '../../utils/features';
import { hasSanRole } from '../../utils/sanatorium';
import { pickText } from '../../utils/sections2';
import { ChoiceField } from '../forms';
import { useDietOptions } from './DietParts';
import { useContentLang } from './kit';

type Draft = { packageId: number | null; organizationId: number | null; dietId: number | null };

export function BookingSectionFields({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const f = useSanFeatures();
  const registrar = hasSanRole(useAuthStore((s) => s.user), 'registrar');
  const showPkg = registrar && f.on('packages');
  const showOrg = registrar && f.on('documents');
  const showDiet = f.on('diet');
  const packages = useQuery(packagesQuery(false, showPkg));
  const orgs = useQuery(orgsQuery('', false, showOrg));
  const diets = useDietOptions(showDiet && registrar);
  return (
    <>
      {showPkg && (
        <ChoiceField
          label={t('sanatorium.s2.package')}
          value={draft.packageId}
          noneLabel={t('sanatorium.none')}
          options={(packages.data ?? []).map((p) => ({ value: p.id, label: pickText(p as never, 'name', lang), sub: `${p.nights} ${t('sanatorium.s2.nightsShort')}` }))}
          onChange={(v) => onChange({ packageId: v })}
          loading={packages.isPending}
          testID="bk-package"
        />
      )}
      {showOrg && (
        <ChoiceField
          label={t('sanatorium.s2.organization')}
          value={draft.organizationId}
          noneLabel={t('sanatorium.none')}
          options={(orgs.data ?? []).map((o) => ({ value: o.id, label: o.name, sub: o.tin ?? undefined }))}
          onChange={(v) => onChange({ organizationId: v })}
          loading={orgs.isPending}
          testID="bk-org"
        />
      )}
      {showDiet && registrar && (
        <ChoiceField label={t('sanatorium.s2.diet')} value={draft.dietId} noneLabel={t('sanatorium.none')} options={diets.options} onChange={(v) => onChange({ dietId: v })} loading={diets.q.isPending} testID="bk-diet-id" />
      )}
    </>
  );
}
