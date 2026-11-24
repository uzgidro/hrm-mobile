// Territory map (registrar): upload the plan image, place points of interest by tapping the
// plan, edit / reorder / delete them. Rooms, staff and specialties link to a point (poi_id).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, Text } from '@/ui';
import { territoryQuery, useDeletePlan, useReorderPois, useUploadPlan } from '../../api/sections1';
import { QueryBlock, useSanReadOnly } from '../../components/common';
import { PlanView } from '../../components/sections1/PlanView';
import { PoiSheet } from '../../components/sections1/PoiSheet';
import { askDelete, MoveButtons, SectionGate } from '../../components/sections1/shared';
import type { Poi, Territory } from '../../types1';
import { moveId, pickLang } from '../../utils/sections1';
import { pickImage } from '../../utils/pickImage';
import { sanErrorMessage } from '../../utils/sanatorium';

export default function TerritoryScreen() {
  const { t } = useTranslation();
  const q = useQuery(territoryQuery());
  const [poi, setPoi] = useState<Poi | 'new' | null>(null);
  const readOnly = useSanReadOnly();
  return (
    <SectionGate feature="territory_map" roles={['registrar']}>
      <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-territory-screen">
        <PageHeader title={t('san1.territory.title')} right={q.data?.plan && !readOnly ? <Button testID="poi-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setPoi('new')} /> : undefined} />
        <QueryBlock query={q}>
          {(d) => (
            <View style={styles.stack}>
              <PlanCard data={d} onPoi={readOnly ? undefined : setPoi} readOnly={readOnly} />
              <PoiList data={d} onEdit={readOnly ? undefined : setPoi} />
              <PoiSheet poi={poi} plan={d.plan} others={d.pois} onClose={() => setPoi(null)} />
            </View>
          )}
        </QueryBlock>
      </Screen>
    </SectionGate>
  );
}

function PlanCard({ data, onPoi, readOnly }: { data: Territory; onPoi?: (p: Poi) => void; readOnly: boolean }) {
  const { t } = useTranslation();
  const upload = useUploadPlan();
  const del = useDeletePlan();
  const [busy, setBusy] = useState(false);
  const onError = (e: unknown) => toast.error(sanErrorMessage(e, t('errors.generic')));
  const pick = async () => {
    setBusy(true);
    try {
      const r = await pickImage();
      if (!r) return;
      if ('denied' in r) return toast.error(t('sanatorium.photoPermission'));
      await upload.mutateAsync(r.file);
      toast.success(t('sanatorium.saved'));
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (await askDelete(t, t('san1.territory.deletePlan'))) del.mutate(undefined, { onError });
  };
  return (
    <Card title={t('san1.territory.plan')} icon="board" tint="green" testID="territory-plan">
      {data.plan ? <PlanView plan={data.plan} pois={data.pois} onPoi={onPoi} /> : <Text variant="body" tone="muted">{t('san1.territory.noPlan')}</Text>}
      {!readOnly && <View style={styles.actions}>
        <Button testID="plan-upload" label={data.plan ? t('san1.territory.replacePlan') : t('san1.territory.uploadPlan')} icon="camera" variant="soft" size="sm" loading={busy} onPress={() => void pick()} />
        {data.plan && <Button testID="plan-delete" label={t('sanatorium.remove')} variant="dangerGhost" size="sm" onPress={() => void remove()} />}
      </View>}
    </Card>
  );
}

function PoiList({ data, onEdit }: { data: Territory; onEdit?: (p: Poi) => void }) {
  const { t, i18n } = useTranslation();
  const reorder = useReorderPois();
  const ids = data.pois.map((p) => p.id);
  const move = (id: number, d: number) =>
    reorder.mutate(moveId(ids, id, d), { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });
  if (data.pois.length === 0) return <EmptyState title={t('san1.territory.noPois')} />;
  return (
    <View style={styles.stack} testID="poi-list">
      {data.pois.map((p, i) => (
        <ListRow
          key={p.id}
          pressable={!!onEdit}
          testID={`poi-${p.id}`}
          title={pickLang(i18n.language, { uz: p.name_uz, ru: p.name_ru, en: p.name_en })}
          subtitle={[t(`san1.poi.kind.${p.kind}`), p.floor != null && p.floor !== '' ? `${t('san1.poi.floor')}: ${p.floor}` : null].filter(Boolean).join(' · ')}
          right={
            <View style={styles.actions}>
              {p.is_active === false && <Badge label={t('sanatorium.inactive')} tone="neutral" />}
              {onEdit && <MoveButtons first={i === 0} last={i === data.pois.length - 1} testID={`poi-${p.id}`} onUp={() => move(p.id, -1)} onDown={() => move(p.id, 1)} />}
            </View>
          }
          onPress={onEdit ? () => onEdit(p) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 },
});
