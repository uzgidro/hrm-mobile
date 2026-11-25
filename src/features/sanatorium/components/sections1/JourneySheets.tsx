// Journey sheets: move one stay to a stage (registrar / room keeper) and edit a stage of the
// catalog (registrar).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Sheet, Text } from '@/ui';
import { stagesQuery, useDeleteStage, useMoveStay, useSaveStage } from '../../api/sections1';
import { JOURNEY_TRIGGERS, type JourneyStage, type JourneyTrigger } from '../../types1';
import { isStageKey, pickLang, slugKey } from '../../utils/sections1';
import { sanErrorMessage } from '../../utils/sanatorium';
import { ChoiceField, ErrorLine, opt, optNull, SwitchRow } from '../forms';
import { askDelete, LangFields } from './shared';

const RESPONSIBLE = ['registrar', 'doctor', 'nurse', 'room_keeper', 'kitchen', 'housekeeper'] as const;

/** Manual move of a stay to any stage (any direction); a note is optional. */
/** `stages` (the board's active stages) saves a request; without it the catalog is loaded. */
export function MoveStageSheet({ stayId, currentId, stages, onClose }: { stayId: number | null; currentId?: number | null; stages?: JourneyStage[]; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={stayId != null} onClose={onClose} title={t('san1.journey.move')} scroll>
      {stayId != null && <MoveForm stayId={stayId} currentId={currentId ?? null} given={stages} onClose={onClose} />}
    </Sheet>
  );
}

function MoveForm({ stayId, currentId, given, onClose }: { stayId: number; currentId: number | null; given?: JourneyStage[]; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const loaded = useQuery(stagesQuery(!given));
  const stages = given ? { data: given, isPending: false } : loaded;
  const move = useMoveStay();
  const [stageId, setStageId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = (stages.data ?? [])
    .filter((s) => s.is_active)
    .map((s) => ({ value: s.id, label: pickLang(i18n.language, { uz: s.name_uz, ru: s.name_ru, en: s.name_en }) + (s.id === currentId ? ` · ${t('san1.journey.current')}` : '') }));
  const submit = async () => {
    if (stageId == null) return setError(t('san1.journey.pickStage'));
    try {
      await move.mutateAsync({ stayId, stage_id: stageId, note: opt(note) });
      toast.success(t('san1.journey.moved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="journey-move-sheet">
      <ChoiceField label={t('san1.journey.stage')} value={stageId} options={options} loading={stages.isPending} onChange={setStageId} testID="move-stage" />
      <FormInput label={t('san1.journey.note')} value={note} onChangeText={setNote} multiline maxLength={500} testID="move-note" />
      <Text variant="caption" tone="muted">{t('san1.journey.moveHint')}</Text>
      <ErrorLine message={error} testID="move-error" />
      <Button testID="move-save" label={t('san1.journey.move')} full loading={move.isPending} onPress={() => void submit()} />
      <Button
        testID="move-open-stay"
        label={t('san1.journey.openStay')}
        variant="ghost"
        full
        onPress={() => {
          onClose();
          router.push({ pathname: '/sanatorium-stay', params: { id: String(stayId) } });
        }}
      />
    </View>
  );
}

export function StageSheet({ stage, onClose }: { stage: JourneyStage | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!stage} onClose={onClose} title={stage === 'new' ? t('san1.journey.addStage') : t('san1.journey.editStage')} scroll>
      {stage && <StageForm key={stage === 'new' ? 'new' : stage.id} stage={stage === 'new' ? null : stage} onClose={onClose} />}
    </Sheet>
  );
}

function StageForm({ stage, onClose }: { stage: JourneyStage | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveStage();
  const del = useDeleteStage();
  const [key, setKey] = useState(stage?.key ?? '');
  const [keyTouched, setKeyTouched] = useState(false);
  const [name, setName] = useState({ uz: stage?.name_uz ?? '', ru: stage?.name_ru ?? '', en: stage?.name_en ?? '' });
  const [role, setRole] = useState<string | null>(stage?.responsible_role ?? null);
  const [trigger, setTrigger] = useState<JourneyTrigger | null>(stage?.trigger ?? null);
  const [notify, setNotify] = useState(stage?.notify_guest ?? false);
  const [msg, setMsg] = useState({ uz: stage?.message_uz ?? '', ru: stage?.message_ru ?? '', en: stage?.message_en ?? '' });
  const [active, setActive] = useState(stage?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const setNames = (v: typeof name) => {
    setName(v);
    if (!stage && !keyTouched) setKey(slugKey(v.uz));
  };

  const submit = async () => {
    if (name.uz.trim().length < 2) return setError(t('sanatorium.nameShort'));
    if (!stage && !isStageKey(key)) return setError(t('san1.journey.keyInvalid'));
    if (notify && !msg.uz.trim()) return setError(t('san1.errors.stage_message_required'));
    try {
      await save.mutateAsync({
        id: stage?.id,
        body: {
          ...(stage ? {} : { key }),
          name_uz: name.uz.trim(),
          name_ru: optNull(name.ru),
          name_en: optNull(name.en),
          responsible_role: role,
          trigger,
          notify_guest: notify,
          message_uz: optNull(msg.uz),
          message_ru: optNull(msg.ru),
          message_en: optNull(msg.en),
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
    if (!stage || !(await askDelete(t, t('san1.journey.deleteStage')))) return;
    try {
      await del.mutateAsync(stage.id);
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="stage-sheet">
      <LangFields label={t('sanatorium.name')} values={name} onChange={setNames} requiredUz maxLength={150} testID="stage-name" />
      {!stage && <FormInput label={t('san1.journey.key')} value={key} onChangeText={(v) => { setKeyTouched(true); setKey(v.toLowerCase()); }} maxLength={40} testID="stage-key" />}
      {!stage && <Text variant="caption" tone="muted">{t('sanPlaces.journey.keyHint')}</Text>}
      <ChoiceField
        label={t('san1.journey.responsible')}
        value={role}
        noneLabel={t('sanatorium.none')}
        options={RESPONSIBLE.map((r) => ({ value: r as string, label: t(`sanatorium.role.${r}`) }))}
        onChange={setRole}
        testID="stage-role"
      />
      <ChoiceField
        label={t('san1.journey.trigger')}
        value={trigger}
        noneLabel={t('sanPlaces.journey.manualOnly')}
        options={JOURNEY_TRIGGERS.map((x) => ({ value: x as JourneyTrigger, label: t(`san1.journey.triggers.${x}`) }))}
        onChange={(v) => setTrigger(v)}
        testID="stage-trigger"
      />
      <Text variant="caption" tone="muted">{t('sanPlaces.journey.triggerHint')}</Text>
      <SwitchRow label={t('san1.journey.notifyGuest')} value={notify} onChange={setNotify} testID="stage-notify" />
      {notify && <LangFields label={t('san1.journey.message')} values={msg} onChange={setMsg} multiline requiredUz maxLength={1000} testID="stage-msg" />}
      <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} />
      <ErrorLine message={error} testID="stage-error" />
      <Button testID="stage-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
      {stage && <Button testID="stage-delete" label={t('sanatorium.remove')} variant="dangerGhost" full loading={del.isPending} onPress={() => void remove()} />}
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 6, paddingBottom: 8 } });
