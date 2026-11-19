// Guest journey: a kanban-like board (one tab per stage, the cards of the stage below it), manual
// moves with a note (registrar / room keeper), and the stage catalog with order, messages and
// the two timing settings (registrar).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, Card, EmptyState, ListRow, PageHeader, Screen, Segmented, Text } from '@/ui';
import {
  journeyBoardQuery, journeySettingsQuery, stagesQuery, useReorderStages, useSaveJourneySettings,
} from '../../api/sections1';
import { QueryBlock } from '../../components/common';
import { ErrorLine } from '../../components/forms';
import { MoveStageSheet, StageSheet } from '../../components/sections1/JourneySheets';
import { MoveButtons, SectionGate } from '../../components/sections1/shared';
import type { JourneyCardData, JourneySettings, JourneyStage } from '../../types1';
import { moveId, pickLang } from '../../utils/sections1';
import { fmtDate, fmtDateTime, hasSanRole, sanErrorMessage } from '../../utils/sanatorium';

type Seg = 'board' | 'stages';
const UNASSIGNED = 0;

export default function JourneyScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const registrar = hasSanRole(user, 'registrar');
  const [seg, setSeg] = useState<Seg>('board');
  const [stageSheet, setStageSheet] = useState<JourneyStage | 'new' | null>(null);
  return (
    <SectionGate feature="journey" roles={['registrar', 'room_keeper', 'doctor', 'nurse', 'kitchen']}>
      <Screen testID="sanatorium-journey-screen">
        <PageHeader
          title={t('san1.journey.title')}
          right={registrar && seg === 'stages' ? <Button testID="stage-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setStageSheet('new')} /> : undefined}
        />
        {registrar && (
          <Segmented
            testID="journey-seg"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'board', label: t('san1.journey.board') },
              { value: 'stages', label: t('san1.journey.stages') },
            ]}
          />
        )}
        <View style={styles.body}>{seg === 'board' ? <Board /> : <Catalog onEdit={setStageSheet} />}</View>
        <StageSheet stage={stageSheet} onClose={() => setStageSheet(null)} />
      </Screen>
    </SectionGate>
  );
}

function CardRow({ c, onMove }: { c: JourneyCardData; onMove?: () => void }) {
  const { t } = useTranslation();
  return (
    <ListRow
      pressable
      testID={`jcard-${c.stay_id}`}
      title={c.guest?.full_name ?? '—'}
      subtitle={[
        c.room ? `${t('sanatorium.room')} ${c.room.number}` : t('sanatorium.noRoom'),
        `${fmtDate(c.planned_from)} → ${fmtDate(c.planned_to)}`,
        c.entered_at ? fmtDateTime(c.entered_at) : null,
      ].filter(Boolean).join(' · ')}
      right={c.inferred ? <Badge label={t('san1.journey.inferred')} tone="neutral" /> : undefined}
      chevron
      onPress={onMove ?? (() => router.push({ pathname: '/sanatorium-stay', params: { id: String(c.stay_id) } }))}
    />
  );
}

function Board() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canMove = hasSanRole(user, 'registrar', 'room_keeper');
  const q = useQuery(journeyBoardQuery());
  const [tab, setTab] = useState<number | null>(null);
  const [moving, setMoving] = useState<{ stayId: number; stageId: number | null } | null>(null);
  return (
    <QueryBlock query={q} rows={5}>
      {(b) => {
        const tabs = [
          ...b.stages.map((s) => ({ id: s.id, label: pickLang(i18n.language, { uz: s.name_uz, ru: s.name_ru, en: s.name_en }), cards: s.stays })),
          ...(b.unassigned.length ? [{ id: UNASSIGNED, label: t('san1.journey.unassigned'), cards: b.unassigned }] : []),
        ];
        const cur = tabs.find((x) => x.id === tab) ?? tabs.find((x) => x.cards.length > 0) ?? tabs[0];
        if (!cur) return <EmptyState title={t('san1.journey.noStages')} />;
        return (
          <View style={styles.stack}>
            <Segmented
              testID="journey-stage-tabs"
              value={String(cur.id)}
              onChange={(v) => setTab(Number(v))}
              options={tabs.map((x) => ({ value: String(x.id), label: x.label, count: x.cards.length }))}
            />
            <Card>
              {cur.cards.length === 0 && <Text variant="body" tone="muted">{t('san1.journey.emptyStage')}</Text>}
              {cur.cards.map((c) => (
                <CardRow key={c.stay_id} c={c} onMove={canMove ? () => setMoving({ stayId: c.stay_id, stageId: cur.id || null }) : undefined} />
              ))}
            </Card>
            {canMove && <Text variant="caption" tone="muted">{t('san1.journey.tapToMove')}</Text>}
            <MoveStageSheet stayId={moving?.stayId ?? null} currentId={moving?.stageId} onClose={() => setMoving(null)} />
          </View>
        );
      }}
    </QueryBlock>
  );
}

function Catalog({ onEdit }: { onEdit: (s: JourneyStage) => void }) {
  const { t, i18n } = useTranslation();
  const q = useQuery(stagesQuery());
  const reorder = useReorderStages();
  const move = (ids: number[], id: number, d: number) =>
    reorder.mutate(moveId(ids, id, d), { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) });
  return (
    <QueryBlock query={q} rows={5}>
      {(stages) => (
        <View style={styles.stack}>
          <View style={styles.stack}>
            {stages.map((s, i) => (
              <ListRow
                key={s.id}
                pressable
                testID={`stage-${s.id}`}
                title={`${i + 1}. ${pickLang(i18n.language, { uz: s.name_uz, ru: s.name_ru, en: s.name_en })}`}
                subtitle={[s.responsible_role ? t(`sanatorium.role.${s.responsible_role}`) : null, s.trigger ? t(`san1.journey.triggers.${s.trigger}`) : null].filter(Boolean).join(' · ') || undefined}
                right={
                  <View style={styles.badges}>
                    {!s.is_active && <Badge label={t('sanatorium.inactive')} tone="neutral" />}
                    {s.notify_guest && <Badge label={t('san1.journey.notifies')} tone="info" />}
                    <MoveButtons first={i === 0} last={i === stages.length - 1} testID={`stage-${s.id}`} onUp={() => move(stages.map((x) => x.id), s.id, -1)} onDown={() => move(stages.map((x) => x.id), s.id, 1)} />
                  </View>
                }
                onPress={() => onEdit(s)}
              />
            ))}
          </View>
          <JourneySettingsCard />
        </View>
      )}
    </QueryBlock>
  );
}

function JourneySettingsCard() {
  const q = useQuery(journeySettingsQuery());
  return <QueryBlock query={q} rows={1}>{(s) => <SettingsForm key={JSON.stringify(s)} s={s} />}</QueryBlock>;
}

function SettingsForm({ s }: { s: JourneySettings }) {
  const { t } = useTranslation();
  const save = useSaveJourneySettings();
  const [pre, setPre] = useState(String(s.pre_arrival_days));
  const [fin, setFin] = useState(String(s.final_exam_days));
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const a = Number.parseInt(pre, 10);
    const b = Number.parseInt(fin, 10);
    if (!Number.isFinite(a) || a < 1 || a > 30) return setError(t('san1.journey.preRange'));
    if (!Number.isFinite(b) || b < 1 || b > 14) return setError(t('san1.journey.finalRange'));
    try {
      await save.mutateAsync({ pre_arrival_days: a, final_exam_days: b });
      setError(null);
      toast.success(t('sanatorium.saved'));
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Card title={t('san1.journey.settings')} icon="settings" testID="journey-settings">
      <FormInput label={t('san1.journey.preArrivalDays')} value={pre} onChangeText={setPre} keyboardType="number-pad" testID="jset-pre" />
      <FormInput label={t('san1.journey.finalExamDays')} value={fin} onChangeText={setFin} keyboardType="number-pad" testID="jset-final" />
      <ErrorLine message={error} />
      <Button testID="jset-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 12 },
  stack: { gap: 12 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
