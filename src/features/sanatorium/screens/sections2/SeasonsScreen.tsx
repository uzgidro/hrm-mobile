// Seasonal price rules (registrar): date range, scope (all / room type / rooms / packages),
// percent or fixed nightly value, priority, active flag.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, Sheet, Text } from '@/ui';
import { packagesQuery, seasonsQuery, useDeleteSeason, useSaveSeason, type SeasonRule } from '../../api/sections2';
import { roomsQuery } from '../../api/queries';
import { QueryBlock } from '../../components/common';
import { ChoiceField, DateField, ErrorLine, SwitchRow } from '../../components/forms';
import { ChipWrap, FieldLabel, RowTools, SectionScreen, useConfirmDelete, useContentLang } from '../../components/sections2/kit';
import { SEASON_SCOPES, emptySeasonDraft, pickText, seasonBody, toggleValue, type SeasonDraft } from '../../utils/sections2';
import { fmtDate, sanErrorMessage, todayIso } from '../../utils/sanatorium';

export default function SeasonsScreen() {
  const { t } = useTranslation();
  const q = useQuery(seasonsQuery());
  const del = useDeleteSeason();
  const confirmDelete = useConfirmDelete();
  const [edit, setEdit] = useState<SeasonRule | 'new' | null>(null);
  return (
    <SectionScreen title={t('sanatorium.s2.seasons')} feature="seasonal_pricing" roles={['registrar']} testID="san-seasons-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()} onAdd={() => setEdit('new')} addLabel={t('sanatorium.s2.addSeason')}>
      <Text variant="caption" tone="muted">{t('sanatorium.s2.seasonsHint')}</Text>
      <QueryBlock query={q}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('sanatorium.s2.noSeasons')} />
          ) : (
            <View style={styles.stack}>
              {list.map((r) => (
                <Card key={r.id} testID={`season-${r.id}`}>
                  <View style={styles.head}>
                    <Text variant="heading" style={styles.flex}>{r.name}</Text>
                    {!r.is_active && <Badge label={t('sanatorium.s2.inactive')} tone="warning" />}
                  </View>
                  <Text variant="caption" tone="muted">{fmtDate(r.date_from)} → {fmtDate(r.date_to)}</Text>
                  <Text variant="body">
                    {r.mode === 'percent' ? `${Number(r.value) > 0 ? '+' : ''}${Number(r.value)}%` : `${Number(r.value).toLocaleString('ru-RU')} ${t('sanatorium.s2.perNight')}`}
                    {' · '}{t(`sanatorium.s2.scope.${r.scope}`)}{' · '}{t('sanatorium.s2.priority')}: {r.priority}
                  </Text>
                  <RowTools testID={`season-tools-${r.id}`} onEdit={() => setEdit(r)} onDelete={() => void confirmDelete(t('sanatorium.s2.deleteSeason'), () => del.mutateAsync(r.id))} />
                </Card>
              ))}
            </View>
          )
        }
      </QueryBlock>
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('sanatorium.s2.addSeason') : t('sanatorium.s2.editSeason')} scroll>
        {edit && <SeasonForm key={edit === 'new' ? 'new' : edit.id} rule={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </SectionScreen>
  );
}

function SeasonForm({ rule, onClose }: { rule: SeasonRule | null; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  const save = useSaveSeason();
  const rooms = useQuery(roomsQuery());
  const packages = useQuery(packagesQuery(true));
  const [d, setD] = useState<SeasonDraft>(() =>
    rule
      ? { name: rule.name, from: rule.date_from, to: rule.date_to, scope: rule.scope, values: rule.scope_values ?? [], mode: rule.mode, value: String(Number(rule.value)), priority: String(rule.priority), active: rule.is_active }
      : emptySeasonDraft(todayIso()),
  );
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<SeasonDraft>) => setD((x) => ({ ...x, ...p }));
  const options = useMemo(() => {
    if (d.scope === 'room_type') return [...new Set((rooms.data ?? []).map((r) => r.room_type).filter((x): x is string => !!x))].map((x) => ({ value: x, label: x }));
    if (d.scope === 'rooms') return (rooms.data ?? []).map((r) => ({ value: String(r.id), label: [r.number, r.building].filter(Boolean).join(' · ') }));
    if (d.scope === 'packages') return (packages.data ?? []).map((p) => ({ value: String(p.id), label: pickText(p as never, 'name', lang) }));
    return [];
  }, [d.scope, rooms.data, packages.data, lang]);

  const submit = async () => {
    const r = seasonBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: rule?.id, body: r.body });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="season-form">
      <FormInput label={t('sanatorium.s2.name')} value={d.name} onChangeText={(v) => set({ name: v })} required testID="ss-name" />
      <DateField label={t('sanatorium.dateFrom')} value={d.from} onChange={(v) => set({ from: v })} testID="ss-from" />
      <DateField label={t('sanatorium.dateTo')} value={d.to} onChange={(v) => set({ to: v })} testID="ss-to" />
      <ChoiceField label={t('sanatorium.s2.scopeLabel')} value={d.scope} options={SEASON_SCOPES.map((s) => ({ value: s, label: t(`sanatorium.s2.scope.${s}`) }))} onChange={(v) => v && set({ scope: v, values: [], mode: v === 'packages' ? 'percent' : d.mode })} testID="ss-scope" />
      {d.scope !== 'all' && (
        <>
          <FieldLabel>{t('sanatorium.s2.scopeValues')}</FieldLabel>
          <ChipWrap options={options} isOn={(v) => d.values.includes(v)} onToggle={(v) => set({ values: toggleValue(d.values, v) })} testID="ss-values" />
        </>
      )}
      <ChoiceField
        label={t('sanatorium.s2.modeLabel')}
        value={d.mode}
        options={(['percent', 'fixed'] as const).filter((m) => !(m === 'fixed' && d.scope === 'packages')).map((m) => ({ value: m, label: t(`sanatorium.s2.seasonMode.${m}`) }))}
        onChange={(v) => v && set({ mode: v })}
        testID="ss-mode"
      />
      <FormInput label={d.mode === 'percent' ? t('sanatorium.s2.valuePercent') : t('sanatorium.s2.valueFixed')} value={d.value} onChangeText={(v) => set({ value: v })} keyboardType="numbers-and-punctuation" required testID="ss-value" />
      <FormInput label={t('sanatorium.s2.priority')} value={d.priority} onChangeText={(v) => set({ priority: v })} keyboardType="number-pad" testID="ss-priority" />
      <SwitchRow label={t('sanatorium.s2.active')} value={d.active} onChange={(v) => set({ active: v })} testID="ss-active" />
      <ErrorLine message={error} testID="ss-error" />
      <Button testID="ss-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 }, flex: { flex: 1 }, head: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
